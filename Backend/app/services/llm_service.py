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

    system_prompt = (
        "You are an expert reading comprehension grader. You grade a student's spoken answer against a reference answer (answer key).\n"
        "The question, reference answer, and student answer can be in English, Filipino (Tagalog), or a mix of both (Taglish).\n\n"
        "You must categorize the student's answer as:\n"
        "1. \"right\": The student's answer is correct, has the same semantic meaning as the reference answer, or is a valid alternative answer to the question.\n"
        "2. \"wrong\": The student's answer is incorrect, or is unrelated to the question/reference answer.\n"
        "3. \"no_answer\": The student did not answer, the transcription contains only silence hallucinations (like \"thank you\", \"bye\", \"subscribe\", \"watching\", etc.), or contains only unintelligible speech/filler words (like \"um\", \"ah\", \"yung\").\n\n"
        "Guidelines:\n"
        "- Speech-to-text transcripts might contain slight spelling errors, phonetic variations, or transcription inaccuracies. Be lenient and focus on the meaning.\n"
        "- Oral responses are often conversational and informal.\n"
        "- If the student's answer is a synonym, paraphrase, or partial but correct part of the reference answer, mark it as \"right\".\n"
        "- If the transcription is empty, whitespace, or just standard Whisper silence artifacts (\"Thank you\", \"Bye\", \"Thank you for watching\", \"Please subscribe\"), classify it as \"no_answer\".\n\n"
        "Respond ONLY in JSON format:\n"
        "{\n"
        "  \"classification\": \"right\" | \"wrong\" | \"no_answer\",\n"
        "  \"explanation\": \"A very brief explanation in English or Filipino justifying the grade.\"\n"
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
