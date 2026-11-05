import { describe, it, expect } from 'vitest';
import { parseDocument } from '../utils/fileParser';

describe('Document & Passage Parser Utility', () => {
  it('parses assessment 2 story passage and questions', () => {
    const rawSample = `
Language: Filipino
Grade: Grade 2
Title: Ang Masipag na Langgam

Content:
Isang araw may isang langgam na nag-iipon ng pagkain para sa darating na tag-ulan.

Questions:
1. Sino ang nag-iipon ng pagkain? : Ang Langgam
2. Para saan ang iniipon niyang pagkain? : Para sa tag-ulan
`;

    const results = parseDocument(rawSample, 2);
    expect(results.length).toBeGreaterThan(0);
    const parsed = results[0];
    expect(parsed.language).toBe('filipino');
    expect(parsed.grade_level).toBe('grade_2');
    expect(parsed.title).toContain('Ang Masipag na Langgam');
    expect(parsed.content).toContain('Isang araw may isang langgam');
    expect(parsed.questions.length).toBeGreaterThanOrEqual(1);
    expect(parsed.questions[0].question).toContain('Sino ang nag-iipon ng pagkain?');
  });

  it('parses assessment 1 letters, words, and sentences tasks', () => {
    const rawSampleA1 = `
Language: Filipino
Grade: Grade 1

Task 1:
m, s, a, i, o, b, t, k, l, y

Task 2:
aso, pusa, bola, mesa

Sentences:
Ang bata ay nagbabasa.
`;

    const results = parseDocument(rawSampleA1, 1);
    expect(results.length).toBeGreaterThan(0);
    const parsed = results[0];
    expect(parsed.assessment_type).toBe(1);
    expect(parsed.task1).toContain('m');
  });
});
