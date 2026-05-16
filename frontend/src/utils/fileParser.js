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

export function parseDocument(text, type, eng3) {
  const result = {};
  if (type === 1) {
    const task1Match = text.match(/Task 1[\s:-]+([\s\S]*?)(?:Task 2|$)/i);
    if (task1Match) result.task1 = task1Match[1].trim();

    const task2WordsMatch = text.match(/Task 2\s*Words[\s:-]+([\s\S]*?)(?:Task 2\s*Sentences|$)/i);
    if (task2WordsMatch) {
      result.task2Words = task2WordsMatch[1].trim();
    } else {
      const t2Match = text.match(/Task 2[\s:-]+([\s\S]*?)(?:Task 2\s*Sentences|$)/i);
      if (t2Match) result.task2Words = t2Match[1].trim();
    }

    const task2SentencesMatch = text.match(/Task 2\s*Sentences[\s:-]+([\s\S]*?)$/i);
    if (task2SentencesMatch) result.task2Sentences = task2SentencesMatch[1].trim();

    // Fallback
    if (!task1Match && !task2WordsMatch && !task2SentencesMatch) {
      result.task1 = text.trim();
    }
  } else {
    const titleMatch = text.match(/Title[\s:-]+(.*?)(\n|$)/i);
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
