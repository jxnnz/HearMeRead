import json
import logging
from typing import Dict, Any, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"


async def grade_comprehension_answer(
    question_text: str,
    reference_answer: str,
    student_transcript: str,
) -> Dict[str, Any]:
    """
    Grades a student's transcribed oral answer against a reference answer
    using Groq Chat Completion API (Llama 3 8B).

    Returns:
        {
            "classification": "right" | "wrong" | "no_answer",
            "explanation": str
        }
    """
    api_key = settings.GROQ_API_KEY
    if not api_key:
        logger.error("GROQ_API_KEY is not configured.")
        return {
            "classification": "wrong",
            "explanation": "System grading failed due to missing Groq API Key configuration."
        }

    import re
    # 1. Deterministic word/phrase overlap pre-check
    clean_transcript = re.sub(r"[^\w\s]", "", student_transcript.lower()).strip()
    clean_reference = re.sub(r"[^\w\s]", "", reference_answer.lower()).strip()

    if clean_transcript and clean_reference:
        # Split reference answer into candidate words/options
        raw_candidates = re.split(r"[,/\|\n\–\-]|\bor\b|\bo\b|any of these|kahit alin", reference_answer, flags=re.IGNORECASE)
        candidate_words = set()
        stop_words = {"any", "of", "these", "kahit", "alin", "dito", "sa", "ang", "si", "ng", "mga", "or", "o", "the", "a", "an", "is", "in", "on", "at", "to"}
        
        for cand in raw_candidates:
            cand_clean = re.sub(r"[^\w\s]", "", cand.lower()).strip()
            if cand_clean:
                for w in cand_clean.split():
                    if w not in stop_words and len(w) > 1:
                        candidate_words.add(w)

        transcript_words = {w for w in clean_transcript.split() if w not in stop_words and len(w) > 1}

        # If any transcript word matches any candidate word in the reference answer or exact substring match
        if transcript_words and (transcript_words.intersection(candidate_words) or clean_transcript in clean_reference):
            return {
                "classification": "right",
                "explanation": "Matched key word or phrase from reference answer."
            }

    system_prompt = (
        "You are an expert reading comprehension grader. You grade a student's spoken answer against a reference answer (answer key).\n"
        "The question, reference answer, and student answer can be in English, Filipino (Tagalog), or a mix of both (Taglish).\n\n"
        "CRITICAL MATCHING RULES (DO NOT BE STRICT):\n"
        "- Do NOT require an exact full-sentence match. Be VERY LENIENT and focus on word matching and meaning.\n"
        "- Reference answers often list choices or phrases (e.g. \"Any of these - paligsahan, pagtakbo\", \"pusa\", \"kuneho\").\n"
        "- If the student's spoken answer contains ANY of the key words, options, synonyms, or partial phrases listed in the reference answer (e.g., spoken \"paligsahan\" matching \"paligsahan sa pagtakbo\"), you MUST classify it as \"right\".\n"
        "- As long as the student spoken answer contains a correct word or concept from the reference answer, mark it \"right\".\n\n"
        "Categorize as:\n"
        "1. \"right\": Student's answer contains a matching key word, option, synonym, or valid concept from the reference answer.\n"
        "2. \"wrong\": Student's answer is incorrect, or unrelated.\n"
        "3. \"no_answer\": Student did not speak, or output contains only silence artifacts (\"thank you\", \"bye\", \"subscribe\").\n\n"
        "Respond ONLY in JSON format:\n"
        "{\n"
        "  \"classification\": \"right\" | \"wrong\" | \"no_answer\",\n"
        "  \"explanation\": \"A brief explanation justifying the grade.\"\n"
        "}"
    )

    user_content = (
        f"Question: {question_text}\n"
        f"Reference Answer: {reference_answer}\n"
        f"Student Transcript: {student_transcript}\n"
    )

    payload = {
        "model": "llama3-8b-8192",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.0
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                GROQ_CHAT_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json=payload
            )

        if response.status_code != 200:
            logger.error(f"Groq Chat API error (HTTP {response.status_code}): {response.text}")
            return {
                "classification": "wrong",
                "explanation": f"Failed to connect to AI grading service: HTTP {response.status_code}"
            }

        result = response.json()
        content = result.get("choices", [{}])[0].get("message", {}).get("content", "{}")
        parsed = json.loads(content)

        classification = parsed.get("classification", "wrong")
        if classification not in ("right", "wrong", "no_answer"):
            classification = "wrong"

        return {
            "classification": classification,
            "explanation": parsed.get("explanation", "")
        }

    except Exception as e:
        logger.error(f"Failed to grade comprehension answer: {e}", exc_info=True)
        return {
            "classification": "wrong",
            "explanation": f"AI grading error: {str(e)}"
        }
