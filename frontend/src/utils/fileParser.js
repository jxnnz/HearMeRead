import * as mammoth from "mammoth";

export async function parseFile(file) {
  if (!file) return "";
  
  const name = file.name.toLowerCase();
  
  if (name.endsWith(".docx")) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value || "";
  } else {
    // Fallback to text
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }
}

export function parseDocument(rawText, forceType = null, eng3 = false) {
  let fullText = (rawText || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // strip zero-width characters
    .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, " ") // normalize all non-breaking & wide Unicode spaces
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  // 1. Strip sample header section if combined template marker is present
  const fillableMarkerRegex = /(?:={3,}\s*)?(?:FILL OUT YOUR CONTENT BELOW|ISULAT ANG NILALAMAN DITO|---\s*FILLABLE ASSESSMENT\s*1[^-]*---)(?:\s*={3,})?/i;
  let text = fullText;
  if (fillableMarkerRegex.test(fullText)) {
    const match = fullText.match(fillableMarkerRegex);
    if (match && match.index !== undefined) {
      text = fullText.slice(match.index);
    }
  } else if (/SAMPLE FORMAT|MGA HALIMBAWA|--- SAMPLE ASSESSMENT/i.test(fullText)) {
    // If there is a sample section banner, strip everything up to the end of the sample section
    const sampleSplit = fullText.split(/--------------------------------------------------------------------------------|================================================================================|---\s*SAMPLE ASSESSMENT\s*2[^-]*---[\s\S]*?(?=\n\s*(?:Language:|Grade:|Task 1:|Title:|$))/i);
    text = sampleSplit[sampleSplit.length - 1];
  }

  // Extract Language & Grade Level metadata (check fullText first for global header, fallback to fillable section)
  let language = "filipino";
  const langMatch = text.match(/Language[\s:-]+(filipino|english)/i) || fullText.match(/Language[\s:-]+(filipino|english)/i);
  if (langMatch) {
    language = langMatch[1].toLowerCase();
  }

  let grade_level = "grade_1";
  const gradeRegex = /Grade(?:\s*Level)?[\s:-]+(?:grade[\s:-]*)?([123])/i;
  const gradeMatch = text.match(gradeRegex) || fullText.match(gradeRegex);
  if (gradeMatch) {
    grade_level = `grade_${gradeMatch[1]}`;
  }

  // Helper to check if string contains meaningful non-sample user text
  const isUserText = (str) => {
    if (!str || typeof str !== "string") return false;
    // Strip common template headers, divider lines, parenthetical guides, bullets, and placeholders
    const clean = str
      .replace(/---[^-]*---/g, "")
      .replace(/===[^=]*===/g, "")
      .replace(/^[-\s=_*#:•·]+/gm, "")
      .replace(/(?:Task\s*[12]|Task\s*2\s*Words|Task\s*2\s*Sentences|Words|Sentences|W:|R:|Q:|A:|Story\s*(?:Number|No\.?|#)?|Title|Content|Questions|PIST|Rhyme\s*Pairs|Pair)[\s.:\-_]*/gi, "")
      .replace(/\((?:grade[^\)]*|optional|none|pist|letters|words|sentences|rhyme[^\)]*)\)/gi, "")
      .replace(/\[(?:grade[^\]]*|optional|none|pist|letters|words|sentences|rhyme[^\]]*|isulat[^\]]*|write[^\]]*)\]/gi, "")
      .trim();
    if (!clean) return false;

    // Reject standalone empty / placeholder phrases (even with surrounding punctuation like [None], None., - None -)
    const strippedPlaceholder = clean
      .toLowerCase()
      .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "")
      .trim();
    const placeholderRegex = /^(?:none|n\/?a|na|optional|wala|walang\s*nilalaman|walang\s*laman|empty|nil|null|blank|leave\s*blank|no\s*content|nothing|not\s*applicable|n\.a\.)$/i;
    if (placeholderRegex.test(strippedPlaceholder) || placeholderRegex.test(clean.toLowerCase())) {
      return false;
    }

    // Must contain at least one letter character
    if (!/[a-zA-Z\u00C0-\u024F]/.test(clean)) return false;

    const samplePhrases = [
      "isulat dito", "sample title", "write the full story", "fillable assessment",
      "halimbawa", "sample assessment", "important notice", "paunawa",
      "ang pagong at ang matsing", "the clever turtle", "b, ng, t, e, p, s, h, g, u, l",
      "sanay, tunay | r: oo", "ulam, anim | r: hindi", "ang bata ay masaya",
      "aso, bata, kuya, isda", "aklat, lapis, mesa, silya",
      "magulang, kaibigan, kalikasan", "beautiful, environment, community",
      "do not edit sample"
    ];
    const lower = clean.toLowerCase();
    for (const phrase of samplePhrases) {
      if (lower.includes(phrase)) return false;
    }
    return true;
  };

  // Segment A1 and A2 explicitly so neither leaks into the other
  let a1Text = "";
  let a2Text = "";

  const a1MarkerMatch = text.match(/(?:(?:---|===|\[)\s*(?:FILLABLE\s*)?ASSESSMENT\s*1[^\n]*|\bAssessment\s*1\b|\bTask\s*1[\s.:\-_])/i);
  const a2MarkerMatch = text.match(/(?:(?:---|===|\[)\s*(?:FILLABLE\s*)?ASSESSMENT\s*2[^\n]*|\bAssessment\s*2\b|\bStory\s*(?:Number|No\.?|#)?[\s.:\-_]*\d+|\bTitle[\s.:\-_])/i);

  if (a1MarkerMatch && a2MarkerMatch) {
    if (a1MarkerMatch.index < a2MarkerMatch.index) {
      a1Text = text.slice(a1MarkerMatch.index, a2MarkerMatch.index);
      a2Text = text.slice(a2MarkerMatch.index);
    } else {
      a2Text = text.slice(a2MarkerMatch.index, a1MarkerMatch.index);
      a1Text = text.slice(a1MarkerMatch.index);
    }
  } else if (a2MarkerMatch) {
    a1Text = "";
    a2Text = text.slice(a2MarkerMatch.index);
  } else if (a1MarkerMatch) {
    a1Text = text.slice(a1MarkerMatch.index);
    a2Text = "";
  } else {
    // Neither marker found: check if story or task text
    const hasStory = /Title[\s:-]/i.test(text) && /Content[\s:-]/i.test(text);
    const hasTask = /Task\s*[12][\s:-]/i.test(text);
    if (hasStory && !hasTask) {
      a1Text = "";
      a2Text = text;
    } else if (hasTask && !hasStory) {
      a1Text = text;
      a2Text = "";
    }
  }

  const results = [];

  // ── Parse Assessment 1 (if not forced to A2 only) ───────────────────
  if (forceType !== 2 && a1Text) {
    const a1Obj = { assessment_type: 1, language, grade_level };

    const a2StopPattern = "(?:Task\\s*2|Story\\s*(?:Number|No\\.?|#)?|Title|Content|---|===|$)";
    const task1Match = a1Text.match(new RegExp(`Task\\s*1(?:\\s*\\([^\\)]*\\))?[\\s.:\\-_]+([\\s\\S]*?)${a2StopPattern}`, "i"));
    if (task1Match && isUserText(task1Match[1])) {
      a1Obj.task1 = task1Match[1].trim();
    }

    const task2Block = a1Text.match(new RegExp(`Task\\s*2(?:\\s*\\([^\\)]*\\))?[\\s.:\\-_]+([\\s\\S]*?)(?:Task\\s*2\\s*Sentences|Story\\s*(?:Number|No\\.?|#)?|Title|Content|---|===|$)`, "i"));
    const task2Raw = task2Block ? task2Block[1].trim() : "";

    let task2WordsMatch = null;
    if (task2Raw && /^W:\s*\S+/im.test(task2Raw)) {
      const pairs = [];
      const lines = task2Raw.split("\n").map((l) => l.trim()).filter(Boolean);
      let current = null;
      for (const line of lines) {
        const wm = line.match(/^W:\s*(.+)/i);
        const rm = line.match(/^R:\s*(Yes|No|Oo|Hindi)/i);
        if (wm && isUserText(wm[1])) {
          current = { pair: wm[1].trim(), answer: "Oo" };
          pairs.push(current);
        } else if (rm && current) {
          const ans = rm[1].toLowerCase();
          current.answer = ans === "yes" || ans === "oo" ? "Oo" : "Hindi";
        }
      }
      if (pairs.length > 0) {
        a1Obj.task2Rhymes = pairs;
      }
    } else {
      task2WordsMatch = a1Text.match(new RegExp(`Task\\s*2\\s*Words(?:\\s*\\([^\\)]*\\))?[\\s.:\\-_]+([\\s\\S]*?)(?:Task\\s*2\\s*Sentences|Story\\s*(?:Number|No\\.?|#)?|Title|Content|---|===|$)`, "i"));
      if (task2WordsMatch && isUserText(task2WordsMatch[1])) {
        a1Obj.task2Words = task2WordsMatch[1].trim();
      } else if (task2Raw && isUserText(task2Raw) && !/^(?:Words|Sentences|\([^\)]*\)|\[[^\]]*\])[\s:-]*$/i.test(task2Raw)) {
        a1Obj.task2Words = task2Raw.trim();
      }
    }

    const task2SentencesMatch = a1Text.match(new RegExp(`Task\\s*2\\s*Sentences(?:\\s*\\([^\\)]*\\))?[\\s.:\\-_]+([\\s\\S]*?)(?:Story\\s*(?:Number|No\\.?|#)?|Title|Content|---|===|$)`, "i"));
    if (task2SentencesMatch && isUserText(task2SentencesMatch[1])) {
      a1Obj.task2Sentences = task2SentencesMatch[1].trim();
    }

    // Strict validation: A1 MUST have actual content in at least one task
    const validTask1 = a1Obj.task1 && isUserText(a1Obj.task1);
    const validTask2Words = a1Obj.task2Words && isUserText(a1Obj.task2Words);
    const validTask2Sentences = a1Obj.task2Sentences && isUserText(a1Obj.task2Sentences);
    const validRhymes = Array.isArray(a1Obj.task2Rhymes) && a1Obj.task2Rhymes.some((p) => p.pair && isUserText(p.pair));

    if (validTask1 || validTask2Words || validTask2Sentences || validRhymes) {
      if (!validTask1) delete a1Obj.task1;
      if (!validTask2Words) delete a1Obj.task2Words;
      if (!validTask2Sentences) delete a1Obj.task2Sentences;
      if (!validRhymes) delete a1Obj.task2Rhymes;
      results.push(a1Obj);
    }
  }

  // ── Parse Assessment 2 (if not forced to A1 only) ───────────────────
  if (forceType !== 1 && a2Text) {
    const a2Obj = { assessment_type: 2, language, grade_level };
    let hasA2Content = false;

    // Extract story_number strictly from fillable section
    let detectedStoryNum = null;
    const sNumMatch =
      a2Text.match(/Story\s*(?:Number|No\.?|#)?[\s:-]*\n*\s*(\d+)/i) ||
      a2Text.match(/Kuwento\s*(?:Number|No\.?|#)?[\s:-]*\n*\s*(\d+)/i);

    if (sNumMatch && sNumMatch[1]) {
      detectedStoryNum = parseInt(sNumMatch[1], 10);
    }

    const titleMatch = a2Text.match(/Title[\s:-]+([^\n]+)/i);
    if (titleMatch && isUserText(titleMatch[1])) {
      a2Obj.title = titleMatch[1].trim();
      hasA2Content = true;
      if (!detectedStoryNum) {
        const titleNumMatch = titleMatch[1].match(/^Story\s*(\d+)/i);
        if (titleNumMatch) detectedStoryNum = parseInt(titleNumMatch[1], 10);
      }
    }

    a2Obj.story_number = detectedStoryNum ? detectedStoryNum : 1;

    const contentMatch = a2Text.match(/Content[\s:-]+([\s\S]*?)(?:Questions[\s:-]|$)/i);
    if (contentMatch && isUserText(contentMatch[1])) {
      a2Obj.content = contentMatch[1].trim();
      hasA2Content = true;
    }

    const questionsMatch = a2Text.match(/Questions[\s:-]+([\s\S]*)$/i);
    if (questionsMatch) {
      const qText = questionsMatch[1].trim();
      const qBlocks = qText.split(/Q\s*[\.:-]/i).filter(Boolean);
      a2Obj.questions = [];
      qBlocks.forEach((block) => {
        const parts = block.split(/A\s*[\.:-]/i);
        if (parts.length > 0 && isUserText(parts[0])) {
          a2Obj.questions.push({
            id: crypto.randomUUID(),
            question: parts[0].trim().replace(/^\d+[\.\)]\s*/, ""),
            answer: parts[1] ? parts[1].trim() : "",
          });
        }
      });
      if (a2Obj.questions.length > 0) {
        hasA2Content = true;
      }
    }

    if (hasA2Content) {
      results.push(a2Obj);
    }
  }

  // Fallback: only if nothing parsed, and text is NOT a template with instructions
  const isTemplateDoc = /IMPORTANT NOTICE|PAUNAWA|SAMPLE FORMAT|FILL OUT YOUR CONTENT|FILLABLE ASSESSMENT/i.test(fullText);
  if (results.length === 0 && isUserText(text) && !isTemplateDoc) {
    const isLikelyStory = /Story|Title|Content|Kuwento|Kabanata|Questions|Tanong/i.test(text);
    const defaultType = forceType || (isLikelyStory ? 2 : 1);
    if (defaultType === 1) {
      results.push({
        assessment_type: 1,
        language,
        grade_level,
        task1: text.trim(),
      });
    } else {
      results.push({
        assessment_type: 2,
        language,
        grade_level,
        title: "Untitled Story",
        content: text.trim(),
      });
    }
  }

  return results;
}