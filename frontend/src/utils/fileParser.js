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

export function parseDocument(rawText, type, eng3) {
  const text = (rawText || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const result = {};

  // Extract Language & Grade Level metadata
  const langMatch = text.match(/Language[\s:-]+(filipino|english)/i);
  if (langMatch) {
    result.language = langMatch[1].toLowerCase();
  }

  const gradeMatch =
    text.match(/Grade\s*Level[\s:-]+(?:grade[\s:-]*)?([123])/i) ||
    text.match(/Grade[\s:-]+(?:grade[\s:-]*)?([123])/i);
  if (gradeMatch) {
    result.grade_level = `grade_${gradeMatch[1]}`;
  }

  if (type === 1) {
    const task1Match = text.match(/Task 1[\s:-]+([\s\S]*?)(?:Task 2|$)/i);
    if (task1Match) result.task1 = task1Match[1].trim();

    // Extract raw Task 2 block (everything after "Task 2:")
    const task2Block = text.match(/Task 2[\s:-]+([\s\S]*?)(?:Task 2\s*Sentences[\s:-]|$)/i);
    const task2Raw = task2Block ? task2Block[1].trim() : "";

    // Detect W:/R: rhyme pair format
    if (task2Raw && /^W:/im.test(task2Raw)) {
      const pairs = [];
      const lines = task2Raw.split("\n").map((l) => l.trim()).filter(Boolean);
      let current = null;
      for (const line of lines) {
        const wm = line.match(/^W:\s*(.+)/i);
        const rm = line.match(/^R:\s*(Yes|No|Oo|Hindi)/i);
        if (wm) {
          current = { pair: wm[1].trim(), answer: "Oo" };
          pairs.push(current);
        } else if (rm && current) {
          const ans = rm[1].toLowerCase();
          current.answer = ans === "yes" || ans === "oo" ? "Oo" : "Hindi";
        }
      }
      result.task2Rhymes = pairs;
    } else {
      const task2WordsMatch = text.match(/Task 2\s*Words[\s:-]+([\s\S]*?)(?:Task 2\s*Sentences|$)/i);
      if (task2WordsMatch) {
        result.task2Words = task2WordsMatch[1].trim();
      } else if (task2Raw) {
        result.task2Words = task2Raw;
      }
    }

    const task2SentencesMatch = text.match(/Task 2\s*Sentences[\s:-]+([\s\S]*?)$/i);
    if (task2SentencesMatch) result.task2Sentences = task2SentencesMatch[1].trim();

    // Fallback
    if (!task1Match && !result.task2Words && !result.task2Rhymes && !result.task2Sentences) {
      result.task1 = text.trim();
    }
  } else {
    const titleMatch = text.match(/Title[\s:-]+([^\n]+)/i);
    if (titleMatch) result.title = titleMatch[1].trim();

    const contentMatch = text.match(/Content[\s:-]+([\s\S]*?)(?:Questions[\s:-]|$)/i);
    if (contentMatch) {
      result.content = contentMatch[1].trim();
    } else {
      result.content = text.replace(/Title[\s:-]+.*?(\n|$)/i, '').trim();
    }

    const questionsMatch = text.match(/Questions[\s:-]+([\s\S]*)$/i);
    if (questionsMatch) {
      const qText = questionsMatch[1].trim();
      const qBlocks = qText.split(/Q\s*[\.:-]/i).filter(Boolean);
      result.questions = [];
      qBlocks.forEach(block => {
        const parts = block.split(/A\s*[\.:-]/i);
        if (parts.length > 0) {
          result.questions.push({
            id: crypto.randomUUID(),
            question: parts[0].trim().replace(/^\d+[\.\)]\s*/, ''),
            answer: parts[1] ? parts[1].trim() : ""
          });
        }
      });
    }
  }
  return result;
}
