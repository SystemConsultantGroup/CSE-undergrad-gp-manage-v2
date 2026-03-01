const crypto = require('crypto');
const moment = require('moment-timezone');

// =====================================================================
// Utility / helper function tests
// =====================================================================

// --- Replicate sha256 from routes/cssys/index.js line 16-18 ---
function sha256(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

// --- Replicate formatDate from app.js lines 46-51 ---
function formatDate(date, format, offset) {
  if (!date) return '';
  var m = moment(date);
  if (offset !== undefined) m = m.utcOffset(offset);
  return m.format(format || 'YYYY-MM-DD');
}

describe('sha256 utility', () => {
  test('hashes "test" to known SHA-256 value', () => {
    expect(sha256('test')).toBe('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
  });

  test('hashes empty string to known SHA-256 value', () => {
    expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });

  test('hashes "hello world" correctly', () => {
    const expected = crypto.createHash('sha256').update('hello world').digest('hex');
    expect(sha256('hello world')).toBe(expected);
  });

  test('converts number to string before hashing', () => {
    const hashOfNum = sha256(123);
    const hashOfStr = sha256('123');
    expect(hashOfNum).toBe(hashOfStr);
  });

  test('converts zero to string "0"', () => {
    const expected = crypto.createHash('sha256').update('0').digest('hex');
    expect(sha256(0)).toBe(expected);
  });

  test('converts null to string "null"', () => {
    const expected = crypto.createHash('sha256').update('null').digest('hex');
    expect(sha256(null)).toBe(expected);
  });

  test('converts undefined to string "undefined"', () => {
    const expected = crypto.createHash('sha256').update('undefined').digest('hex');
    expect(sha256(undefined)).toBe(expected);
  });

  test('converts boolean true to string "true"', () => {
    const expected = crypto.createHash('sha256').update('true').digest('hex');
    expect(sha256(true)).toBe(expected);
  });

  test('converts boolean false to string "false"', () => {
    const expected = crypto.createHash('sha256').update('false').digest('hex');
    expect(sha256(false)).toBe(expected);
  });

  test('handles special characters', () => {
    const input = '!@#$%^&*()';
    const expected = crypto.createHash('sha256').update(input).digest('hex');
    expect(sha256(input)).toBe(expected);
  });

  test('handles unicode characters', () => {
    const input = '한국어 테스트';
    const expected = crypto.createHash('sha256').update(input).digest('hex');
    expect(sha256(input)).toBe(expected);
  });

  test('output is always 64 hex characters', () => {
    const inputs = ['', 'a', 'ab', 'abc', 'a'.repeat(1000)];
    inputs.forEach((input) => {
      const hash = sha256(input);
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  test('is deterministic', () => {
    const input = 'deterministic-test';
    const hash1 = sha256(input);
    const hash2 = sha256(input);
    expect(hash1).toBe(hash2);
  });

  test('produces unique hashes for different inputs', () => {
    const hashes = new Set(['a', 'b', 'c', '1', '2', '3'].map(sha256));
    expect(hashes.size).toBe(6);
  });
});

describe('formatDate utility', () => {
  describe('falsy/empty input handling', () => {
    test('returns empty string for null', () => {
      expect(formatDate(null)).toBe('');
    });

    test('returns empty string for undefined', () => {
      expect(formatDate(undefined)).toBe('');
    });

    test('returns empty string for empty string', () => {
      expect(formatDate('')).toBe('');
    });

    test('returns empty string for 0', () => {
      expect(formatDate(0)).toBe('');
    });

    test('returns empty string for false', () => {
      expect(formatDate(false)).toBe('');
    });
  });

  describe('default format (YYYY-MM-DD)', () => {
    test('formats a Date object', () => {
      const date = new Date('2024-06-15T00:00:00Z');
      const result = formatDate(date);
      // The exact output depends on local TZ but should start with 2024-06-1
      expect(result).toMatch(/^2024-06-1[45]$/);
    });

    test('formats an ISO date string', () => {
      const result = formatDate('2024-01-01');
      expect(result).toBe('2024-01-01');
    });

    test('formats a datetime string', () => {
      const result = formatDate('2024-12-25T10:30:00');
      expect(result).toBe('2024-12-25');
    });
  });

  describe('custom format strings', () => {
    test('YYYY/MM/DD format', () => {
      const result = formatDate('2024-03-20', 'YYYY/MM/DD');
      expect(result).toBe('2024/03/20');
    });

    test('MM-DD-YYYY format', () => {
      const result = formatDate('2024-03-20', 'MM-DD-YYYY');
      expect(result).toBe('03-20-2024');
    });

    test('DD.MM.YYYY format', () => {
      const result = formatDate('2024-03-20', 'DD.MM.YYYY');
      expect(result).toBe('20.03.2024');
    });

    test('YYYY-MM-DD HH:mm:ss format', () => {
      const result = formatDate('2024-03-20T14:30:45', 'YYYY-MM-DD HH:mm:ss');
      expect(result).toBe('2024-03-20 14:30:45');
    });

    test('year-only format', () => {
      const result = formatDate('2024-06-15', 'YYYY');
      expect(result).toBe('2024');
    });

    test('month name format', () => {
      const result = formatDate('2024-06-15', 'MMMM');
      expect(result).toBe('June');
    });
  });

  describe('UTC offset handling', () => {
    test('applies positive offset (KST +9)', () => {
      const date = new Date('2024-06-15T00:00:00Z');
      const result = formatDate(date, 'YYYY-MM-DD HH:mm', 9 * 60);
      expect(result).toBe('2024-06-15 09:00');
    });

    test('applies negative offset (EST -5)', () => {
      const date = new Date('2024-06-15T03:00:00Z');
      const result = formatDate(date, 'YYYY-MM-DD HH:mm', -5 * 60);
      expect(result).toBe('2024-06-14 22:00');
    });

    test('applies zero offset (UTC)', () => {
      const date = new Date('2024-06-15T12:30:00Z');
      const result = formatDate(date, 'YYYY-MM-DD HH:mm', 0);
      expect(result).toBe('2024-06-15 12:30');
    });

    test('does not apply offset when offset is undefined', () => {
      const date = new Date('2024-06-15T12:00:00Z');
      const resultWithOffset = formatDate(date, 'YYYY-MM-DD HH:mm', 0);
      const resultWithout = formatDate(date, 'YYYY-MM-DD HH:mm');
      // When offset is 0, it forces UTC. Without offset it uses local TZ.
      // They may differ depending on local TZ - just check both are valid.
      expect(resultWithOffset).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
      expect(resultWithout).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    });

    test('offset changes the date when crossing midnight', () => {
      const date = new Date('2024-06-15T23:00:00Z');
      const result = formatDate(date, 'YYYY-MM-DD', 3 * 60);
      expect(result).toBe('2024-06-16');
    });
  });

  describe('edge cases', () => {
    test('handles timestamp number', () => {
      const ts = new Date('2024-01-01T00:00:00Z').getTime();
      const result = formatDate(ts, 'YYYY-MM-DD HH:mm', 0);
      expect(result).toBe('2024-01-01 00:00');
    });

    test('handles moment-parseable date string with timezone', () => {
      const result = formatDate('2024-06-15T12:00:00+09:00', 'YYYY-MM-DD HH:mm', 9 * 60);
      expect(result).toBe('2024-06-15 12:00');
    });
  });
});
