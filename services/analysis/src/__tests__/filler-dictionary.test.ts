import { describe, expect, it } from 'vitest';
import { getFillers } from '../filler-dictionary.js';

describe('filler-dictionary', () => {
  it('returns RU fillers by default', () => {
    const fillers = getFillers('ru');
    expect(fillers).toContain('ну');
    expect(fillers).toContain('как бы');
    expect(fillers).toContain('короче');
  });

  it('returns EN fillers', () => {
    const fillers = getFillers('en');
    expect(fillers).toContain('like');
    expect(fillers).toContain('you know');
    expect(fillers).toContain('um');
    expect(fillers).toContain('actually');
  });

  it('multi-token fillers appear before single-token', () => {
    const ru = getFillers('ru');
    const ruMultiIdx = ru.indexOf('как бы');
    const ruSingleIdx = ru.indexOf('ну');
    expect(ruMultiIdx).toBeLessThan(ruSingleIdx);

    const en = getFillers('en');
    const enMultiIdx = en.indexOf('you know');
    const enSingleIdx = en.indexOf('like');
    expect(enMultiIdx).toBeLessThan(enSingleIdx);
  });

  it('has no duplicate fillers', () => {
    const ru = getFillers('ru');
    const en = getFillers('en');
    expect(new Set(ru).size).toBe(ru.length);
    expect(new Set(en).size).toBe(en.length);
  });

  it('all RU fillers are lowercase', () => {
    for (const f of getFillers('ru')) {
      expect(f).toBe(f.toLowerCase());
    }
  });

  it('all EN fillers are lowercase', () => {
    for (const f of getFillers('en')) {
      expect(f).toBe(f.toLowerCase());
    }
  });
});
