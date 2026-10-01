import { describe, expect, it } from 'vitest';
import { inputToNumber, isValidInputValue, numberToInputValue, stripLeadingZeros } from './numbers';

describe('stripLeadingZeros', () => {
  it('strips leading zeros ("060" → "60")', () => {
    expect(stripLeadingZeros('060')).toBe('60');
  });

  it('keeps a single "0"', () => {
    expect(stripLeadingZeros('0')).toBe('0');
  });

  it('keeps decimals ("0.5" → "0.5")', () => {
    expect(stripLeadingZeros('0.5')).toBe('0.5');
  });

  it('collapses multiple zeros ("00" → "0")', () => {
    expect(stripLeadingZeros('00')).toBe('0');
  });

  it('keeps empty strings empty', () => {
    expect(stripLeadingZeros('')).toBe('');
  });

  it('keeps normal numbers untouched', () => {
    expect(stripLeadingZeros('60')).toBe('60');
    expect(stripLeadingZeros('12,5')).toBe('12,5');
  });
});

describe('numberToInputValue', () => {
  it('maps 0 to "" so the placeholder shows', () => {
    expect(numberToInputValue(0)).toBe('');
  });

  it('keeps real values', () => {
    expect(numberToInputValue(60)).toBe('60');
    expect(numberToInputValue(2.5)).toBe('2.5');
  });

  it('maps undefined/null to ""', () => {
    expect(numberToInputValue(undefined)).toBe('');
    expect(numberToInputValue(null)).toBe('');
  });
});

describe('inputToNumber', () => {
  it('parses empty input as 0', () => {
    expect(inputToNumber('')).toBe(0);
  });

  it('parses integers', () => {
    expect(inputToNumber('60')).toBe(60);
  });

  it('accepts comma and dot as decimal separator', () => {
    expect(inputToNumber('60,5')).toBe(60.5);
    expect(inputToNumber('60.5')).toBe(60.5);
  });

  it('falls back to 0 for garbage', () => {
    expect(inputToNumber('abc')).toBe(0);
  });
});

describe('isValidInputValue', () => {
  it('accepts empty and intermediate typing states', () => {
    expect(isValidInputValue('')).toBe(true);
    expect(isValidInputValue('0')).toBe(true);
    expect(isValidInputValue('12')).toBe(true);
    expect(isValidInputValue('12.')).toBe(true);
    expect(isValidInputValue('12,5')).toBe(true);
    expect(isValidInputValue('0.')).toBe(true);
  });

  it('rejects non-numeric text', () => {
    expect(isValidInputValue('6a')).toBe(false);
    expect(isValidInputValue('1.2.3')).toBe(false);
    expect(isValidInputValue('--5')).toBe(false);
  });
});
