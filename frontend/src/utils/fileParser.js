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
  let fullText = (rawText || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Strip sample header section if combined template marker is present
  const fillableMarker = /FILL OUT YOUR CONTENT BELOW|ISULAT ANG NILALAMAN DITO/i;
  let text = fullText;
  if (fillableMarker.test(fullText)) {
    const parts = fullText.split(fillableMarker);
    text = parts[parts.length - 1];
  }

  // Extract Language & Grade Level metadata
  let language = "filipino";
  const langMatch = text.match(/Language[\s:-]+(filipino|english)/i) || fullText.match(/Language[\s:-]+(filipino|english)/i);
  if (langMatch) {
    language = langMatch[1].toLowerCase();
  }

  let grade_level = "grade_1";
  const gradeMatch =
    text.match(/Grade\s*Level[\s:-]+(?:grade[\s:-]*)?([123])/i) ||
    text.match(/Grade[\s:-]+(?:grade[\s:-]*)?([123])/i) ||
    fullText.match(/Grade[\s:-]+(?:grade[\s:-]*)?([123])/i);
  if (gradeMatch) {
    grade_level = `grade_${gradeMatch[1]}`;
  }

  const results = [];

  // Helper to check if string contains meaningful non-sample user text
  const isUserText = (str) => {
    if (!str || typeof str !== "string") return false;
    // Strip common template headers, divider lines, and placeholders
    const clean = str
      .replace(/---[^-]*---/g, "")
      .replace(/===[^=]*===/g, "")
      .replace(/^[-\s=_*#:]+/gm, "")
      .replace(/(?:Task\s*[12]|Task\s*2\s*Words|Task\s*2\s*Sentences|Words|Sentences|W:|R:|Q:|A:|Story\s*Number|Title|Content|Questions)[\s:-]*/gi, "")
      .trim();
    if (!clean) return false;
    const lower = clean.toLowerCase();
    if (
      lower.includes("isulat dito") ||
      lower.includes("sample title") ||
      lower.includes("write the full story") ||
      lower.includes("fillable assessment") ||
      lower.includes("halimbawa") ||
      lower.includes("sample assessment")
    ) {
      return false;
    }
    return true;
  };

  // ── Parse Assessment 1 (if not forced to A2 only) ───────────────────
  if (forceType !== 2) {
    const a1Obj = { assessment_type: 1, language, grade_level };
    let hasA1Content = false;

    const task1Match = text.match(/Task 1[\s:-]+([\s\S]*?)(?:Task 2|FILLABLE ASSESSMENT 2|--- ASSESSMENT 2|$)/i);
    if (task1Match && isUserText(task1Match[1])) {
      a1Obj.task1 = task1Match[1].trim();
      hasA1Content = true;
    }

    const task2Block = text.match(/Task 2[\s:-]+([\s\S]*?)(?:Task 2\s*Sentences|FILLABLE ASSESSMENT 2|--- ASSESSMENT 2|$)/i);
    const task2Raw = task2Block ? task2Block[1].trim() : "";

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
        hasA1Content = true;
      }
    } else {
      const task2WordsMatch = text.match(/Task 2\s*Words[\s:-]+([\s\S]*?)(?:Task 2\s*Sentences|FILLABLE ASSESSMENT 2|--- ASSESSMENT 2|$)/i);
      if (task2WordsMatch && isUserText(task2WordsMatch[1])) {
        a1Obj.task2Words = task2WordsMatch[1].trim();
        hasA1Content = true;
      } else if (task2Raw && isUserText(task2Raw) && !/^(?:Words|Sentences)[\s:-]*$/i.test(task2Raw)) {
        a1Obj.task2Words = task2Raw;
        hasA1Content = true;
      }
    }

    const task2SentencesMatch = text.match(/Task 2\s*Sentences[\s:-]+([\s\S]*?)(?:FILLABLE ASSESSMENT 2|--- ASSESSMENT 2|$)/i);
    if (task2SentencesMatch && isUserText(task2SentencesMatch[1])) {
      a1Obj.task2Sentences = task2SentencesMatch[1].trim();
      hasA1Content = true;
    }

    if (hasA1Content) {
      results.push(a1Obj);
    }
  }

  // ── Parse Assessment 2 (if not forced to A1 only) ───────────────────
  if (forceType !== 1) {
    const a2Obj = { assessment_type: 2, language, grade_level };
    let hasA2Content = false;

    // Extract story_number strictly from fillable section (text)
    let detectedStoryNum = null;
    const sNumMatch =
      text.match(/Story\s*(?:Number|No\.?|#)?[\s:-]*\n*\s*(\d+)/i) ||
      text.match(/Kuwento\s*(?:Number|No\.?|#)?[\s:-]*\n*\s*(\d+)/i);

    if (sNumMatch && sNumMatch[1]) {
      detectedStoryNum = sNumMatch[1];
    }

    const titleMatch = text.match(/Title[\s:-]+([^\n]+)/i);
    if (titleMatch && isUserText(titleMatch[1])) {
      a2Obj.title = titleMatch[1].trim();
      hasA2Content = true;
      if (!detectedStoryNum) {
        const titleNumMatch = titleMatch[1].match(/^Story\s*(\d+)/i);
        if (titleNumMatch) detectedStoryNum = titleNumMatch[1];
      }
    }

    a2Obj.story_number = detectedStoryNum || "1";

    const contentMatch = text.match(/Content[\s:-]+([\s\S]*?)(?:Questions[\s:-]|$)/i);
    if (contentMatch && isUserText(contentMatch[1])) {
      a2Obj.content = contentMatch[1].trim();
      hasA2Content = true;
    }

    const questionsMatch = text.match(/Questions[\s:-]+([\s\S]*)$/i);
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

  // Fallback: if nothing parsed but forceType was specified or raw text exists with meaningful content
  if (results.length === 0 && isUserText(text)) {
    const defaultType = forceType || 1;
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