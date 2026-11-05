import { describe, it, expect, vi } from 'vitest';
import { extractSessionAudioKey } from '../utils/audioCache';

describe('Audio Recording & Audio Caching Utilities', () => {
  it('extracts normalized audio keys from session audio URLs', () => {
    const url1 = 'https://api.domain.com/routes/sessions/155/audio?part=2&token=xyz';
    expect(extractSessionAudioKey(url1)).toBe('session_155_2');

    const url2 = 'http://localhost:8000/routes/sessions/42/audio?part=1';
    expect(extractSessionAudioKey(url2)).toBe('session_42_1');

    const url3 = '/routes/sessions/999/audio?part=task2';
    expect(extractSessionAudioKey(url3)).toBe('session_999_task2');
  });

  it('handles invalid or empty audio URLs gracefully', () => {
    expect(extractSessionAudioKey('')).toBeNull();
    expect(extractSessionAudioKey(null)).toBeNull();
    expect(extractSessionAudioKey('https://example.com/other-route')).toBeNull();
  });

  it('initializes MediaRecorder mock properly for assessment recording', () => {
    const stream = {};
    const recorder = new window.MediaRecorder(stream);
    expect(recorder).toBeDefined();
    expect(recorder.state).toBe('inactive');
    expect(typeof recorder.start).toBe('function');
    expect(typeof recorder.stop).toBe('function');
  });
});
