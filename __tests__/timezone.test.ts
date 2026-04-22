import { describe, it, expect } from 'vitest';
import {
  getLocalTime,
  getLocalDayOfWeek,
  getLocalTimeString,
  getLocalDateString,
  getLocalDayRange,
} from '../lib/timezone';

// =============================================================================
// BST (British Summer Time) = UTC+1, active late March to late October
// GMT (Greenwich Mean Time) = UTC+0, active late October to late March
//
// Key dates:
//   BST 2026 starts: Sunday 29 March 2026, 01:00 GMT → 02:00 BST
//   BST 2026 ends:   Sunday 25 October 2026, 02:00 BST → 01:00 GMT
// =============================================================================

const LONDON = "Europe/London";

// Helper: create UTC date
function utc(isoString: string): Date {
  return new Date(isoString);
}

// =============================================================================
// getLocalTime
// =============================================================================

describe('getLocalTime', () => {
  describe('during BST (UTC+1)', () => {
    it('converts 09:00 UTC → 10:00 BST', () => {
      const result = getLocalTime(utc('2026-06-15T09:00:00Z'), LONDON);
      expect(result).toEqual({ hours: 10, minutes: 0 });
    });

    it('converts 12:30 UTC → 13:30 BST', () => {
      const result = getLocalTime(utc('2026-07-01T12:30:00Z'), LONDON);
      expect(result).toEqual({ hours: 13, minutes: 30 });
    });

    it('converts 23:00 UTC → 00:00 BST (next day)', () => {
      const result = getLocalTime(utc('2026-08-10T23:00:00Z'), LONDON);
      expect(result).toEqual({ hours: 0, minutes: 0 });
    });

    it('converts 23:59 UTC → 00:59 BST (next day)', () => {
      const result = getLocalTime(utc('2026-05-01T23:59:00Z'), LONDON);
      expect(result).toEqual({ hours: 0, minutes: 59 });
    });

    it('converts 00:00 UTC → 01:00 BST', () => {
      const result = getLocalTime(utc('2026-06-01T00:00:00Z'), LONDON);
      expect(result).toEqual({ hours: 1, minutes: 0 });
    });
  });

  describe('during GMT (UTC+0)', () => {
    it('converts 09:00 UTC → 09:00 GMT (no offset)', () => {
      const result = getLocalTime(utc('2026-01-15T09:00:00Z'), LONDON);
      expect(result).toEqual({ hours: 9, minutes: 0 });
    });

    it('converts 17:00 UTC → 17:00 GMT', () => {
      const result = getLocalTime(utc('2026-12-01T17:00:00Z'), LONDON);
      expect(result).toEqual({ hours: 17, minutes: 0 });
    });

    it('converts 23:30 UTC → 23:30 GMT', () => {
      const result = getLocalTime(utc('2026-02-10T23:30:00Z'), LONDON);
      expect(result).toEqual({ hours: 23, minutes: 30 });
    });
  });

  describe('DST transition boundary', () => {
    // BST starts: 29 March 2026 01:00 GMT → 02:00 BST
    it('00:30 UTC on 29 March → 00:30 GMT (before clocks change)', () => {
      const result = getLocalTime(utc('2026-03-29T00:30:00Z'), LONDON);
      expect(result).toEqual({ hours: 0, minutes: 30 });
    });

    it('01:30 UTC on 29 March → 02:30 BST (after clocks change)', () => {
      const result = getLocalTime(utc('2026-03-29T01:30:00Z'), LONDON);
      expect(result).toEqual({ hours: 2, minutes: 30 });
    });

    // BST ends: 25 October 2026 01:00 GMT ← 02:00 BST
    it('00:30 UTC on 25 October → 01:30 BST (before clocks change)', () => {
      const result = getLocalTime(utc('2026-10-25T00:30:00Z'), LONDON);
      expect(result).toEqual({ hours: 1, minutes: 30 });
    });

    it('02:00 UTC on 25 October → 02:00 GMT (after clocks change)', () => {
      const result = getLocalTime(utc('2026-10-25T02:00:00Z'), LONDON);
      expect(result).toEqual({ hours: 2, minutes: 0 });
    });
  });

  describe('other timezones', () => {
    it('converts to US Eastern (UTC-5 winter)', () => {
      const result = getLocalTime(utc('2026-01-15T15:00:00Z'), 'America/New_York');
      expect(result).toEqual({ hours: 10, minutes: 0 });
    });

    it('converts to Tokyo (UTC+9, no DST)', () => {
      const result = getLocalTime(utc('2026-06-15T03:00:00Z'), 'Asia/Tokyo');
      expect(result).toEqual({ hours: 12, minutes: 0 });
    });
  });
});

// =============================================================================
// getLocalDayOfWeek
// =============================================================================

describe('getLocalDayOfWeek', () => {
  it('returns correct day during BST', () => {
    // 2026-06-15 is a Monday
    expect(getLocalDayOfWeek(utc('2026-06-15T10:00:00Z'), LONDON)).toBe(1); // Monday
  });

  it('returns correct day during GMT', () => {
    // 2026-01-15 is a Thursday
    expect(getLocalDayOfWeek(utc('2026-01-15T10:00:00Z'), LONDON)).toBe(4); // Thursday
  });

  it('handles day boundary — 23:30 UTC in BST is next day local', () => {
    // 2026-06-15 (Monday) 23:30 UTC = 2026-06-16 (Tuesday) 00:30 BST
    expect(getLocalDayOfWeek(utc('2026-06-15T23:30:00Z'), LONDON)).toBe(2); // Tuesday
  });

  it('handles day boundary — 23:30 UTC in GMT stays same day', () => {
    // 2026-01-15 (Thursday) 23:30 UTC = 23:30 GMT (same day)
    expect(getLocalDayOfWeek(utc('2026-01-15T23:30:00Z'), LONDON)).toBe(4); // Thursday
  });

  it('Sunday = 0', () => {
    // 2026-06-14 is a Sunday
    expect(getLocalDayOfWeek(utc('2026-06-14T10:00:00Z'), LONDON)).toBe(0);
  });

  it('Saturday = 6', () => {
    // 2026-06-13 is a Saturday
    expect(getLocalDayOfWeek(utc('2026-06-13T10:00:00Z'), LONDON)).toBe(6);
  });

  it('DST transition day — correct day of week', () => {
    // 29 March 2026 (Sunday) — clocks change
    expect(getLocalDayOfWeek(utc('2026-03-29T12:00:00Z'), LONDON)).toBe(0); // Sunday
  });
});

// =============================================================================
// getLocalTimeString
// =============================================================================

describe('getLocalTimeString', () => {
  it('returns HH:MM in BST', () => {
    expect(getLocalTimeString(utc('2026-06-15T09:00:00Z'), LONDON)).toBe('10:00');
  });

  it('returns HH:MM in GMT', () => {
    expect(getLocalTimeString(utc('2026-01-15T09:00:00Z'), LONDON)).toBe('09:00');
  });

  it('zero-pads hours', () => {
    expect(getLocalTimeString(utc('2026-01-15T08:05:00Z'), LONDON)).toBe('08:05');
  });

  it('zero-pads minutes', () => {
    expect(getLocalTimeString(utc('2026-06-15T09:03:00Z'), LONDON)).toBe('10:03');
  });

  it('handles midnight crossing in BST', () => {
    // 23:30 UTC in BST = 00:30 next day
    expect(getLocalTimeString(utc('2026-06-15T23:30:00Z'), LONDON)).toBe('00:30');
  });
});

// =============================================================================
// getLocalDateString
// =============================================================================

describe('getLocalDateString', () => {
  it('returns YYYY-MM-DD in GMT (same day)', () => {
    expect(getLocalDateString(utc('2026-01-15T10:00:00Z'), LONDON)).toBe('2026-01-15');
  });

  it('returns YYYY-MM-DD in BST (same day for daytime)', () => {
    expect(getLocalDateString(utc('2026-06-15T10:00:00Z'), LONDON)).toBe('2026-06-15');
  });

  it('date rolls forward in BST — 23:30 UTC is next day local', () => {
    expect(getLocalDateString(utc('2026-06-15T23:30:00Z'), LONDON)).toBe('2026-06-16');
  });

  it('date stays same in GMT — 23:30 UTC is same day', () => {
    expect(getLocalDateString(utc('2026-01-15T23:30:00Z'), LONDON)).toBe('2026-01-15');
  });

  it('handles month boundary', () => {
    // 31 May 23:30 UTC in BST = 1 June 00:30
    expect(getLocalDateString(utc('2026-05-31T23:30:00Z'), LONDON)).toBe('2026-06-01');
  });

  it('handles year boundary in GMT', () => {
    // 31 Dec 23:30 UTC in GMT = 31 Dec 23:30 (same day)
    expect(getLocalDateString(utc('2026-12-31T23:30:00Z'), LONDON)).toBe('2026-12-31');
  });
});

// =============================================================================
// getLocalDayRange
// =============================================================================

describe('getLocalDayRange', () => {
  describe('during BST (UTC+1)', () => {
    it('day starts at 23:00 UTC previous day (midnight BST)', () => {
      const { start } = getLocalDayRange('2026-06-15', LONDON);
      // Midnight BST = 23:00 UTC on June 14
      expect(start.toISOString()).toBe('2026-06-14T23:00:00.000Z');
    });

    it('day ends at 22:59:59 UTC (23:59:59 BST)', () => {
      const { end } = getLocalDayRange('2026-06-15', LONDON);
      // 23:59:59 BST = 22:59:59 UTC
      expect(end.toISOString()).toBe('2026-06-15T22:59:59.999Z');
    });

    it('range spans exactly 24 hours (minus 1ms)', () => {
      const { start, end } = getLocalDayRange('2026-06-15', LONDON);
      const durationMs = end.getTime() - start.getTime();
      const almostADay = 24 * 60 * 60 * 1000 - 1;
      expect(durationMs).toBe(almostADay);
    });
  });

  describe('during GMT (UTC+0)', () => {
    it('day starts at 00:00 UTC (midnight GMT)', () => {
      const { start } = getLocalDayRange('2026-01-15', LONDON);
      expect(start.toISOString()).toBe('2026-01-15T00:00:00.000Z');
    });

    it('day ends at 23:59:59 UTC', () => {
      const { end } = getLocalDayRange('2026-01-15', LONDON);
      expect(end.toISOString()).toBe('2026-01-15T23:59:59.999Z');
    });
  });

  it('appointment at 09:00 UTC falls within BST day range', () => {
    const { start, end } = getLocalDayRange('2026-06-15', LONDON);
    const appointmentTime = utc('2026-06-15T09:00:00Z'); // 10:00 BST
    expect(appointmentTime >= start).toBe(true);
    expect(appointmentTime <= end).toBe(true);
  });

  it('appointment at 23:00 UTC on prev day falls within BST day range', () => {
    // 23:00 UTC June 14 = 00:00 BST June 15 — should be IN range for June 15
    const { start, end } = getLocalDayRange('2026-06-15', LONDON);
    const appointmentTime = utc('2026-06-14T23:00:00Z');
    expect(appointmentTime >= start).toBe(true);
    expect(appointmentTime <= end).toBe(true);
  });

  it('appointment at 22:59 UTC on prev day falls OUTSIDE BST day range', () => {
    // 22:59 UTC June 14 = 23:59 BST June 14 — should NOT be in June 15 range
    const { start } = getLocalDayRange('2026-06-15', LONDON);
    const appointmentTime = utc('2026-06-14T22:59:00Z');
    expect(appointmentTime < start).toBe(true);
  });

  it('appointment at 23:00 UTC falls OUTSIDE BST day range (next day BST)', () => {
    // 23:00 UTC June 15 = 00:00 BST June 16 — should NOT be in June 15 range
    const { end } = getLocalDayRange('2026-06-15', LONDON);
    const appointmentTime = utc('2026-06-15T23:00:00Z');
    expect(appointmentTime > end).toBe(true);
  });
});

// =============================================================================
// Integration: opening hours comparison (simulates server logic)
// =============================================================================

describe('Opening hours comparison (integration)', () => {
  // Salon opens 10:00, closes 19:00 (local time)
  const openMinutes = 10 * 60;
  const closeMinutes = 19 * 60;

  function isWithinOpeningHours(startUtc: Date, endUtc: Date, tz: string): boolean {
    const localStart = getLocalTime(startUtc, tz);
    const localEnd = getLocalTime(endUtc, tz);
    const startMin = localStart.hours * 60 + localStart.minutes;
    const endMin = localEnd.hours * 60 + localEnd.minutes;
    return startMin >= openMinutes && endMin <= closeMinutes;
  }

  describe('during BST', () => {
    it('09:00 UTC (10:00 BST) — within hours', () => {
      expect(isWithinOpeningHours(
        utc('2026-06-15T09:00:00Z'), utc('2026-06-15T10:30:00Z'), LONDON
      )).toBe(true);
    });

    it('08:00 UTC (09:00 BST) — before opening', () => {
      expect(isWithinOpeningHours(
        utc('2026-06-15T08:00:00Z'), utc('2026-06-15T09:30:00Z'), LONDON
      )).toBe(false);
    });

    it('17:30 UTC (18:30 BST) + 90min ends at 20:00 BST — after closing', () => {
      expect(isWithinOpeningHours(
        utc('2026-06-15T17:30:00Z'), utc('2026-06-15T19:00:00Z'), LONDON
      )).toBe(false);
    });

    it('17:00 UTC (18:00 BST) + 60min ends at 19:00 BST — exactly at closing', () => {
      expect(isWithinOpeningHours(
        utc('2026-06-15T17:00:00Z'), utc('2026-06-15T18:00:00Z'), LONDON
      )).toBe(true);
    });
  });

  describe('during GMT', () => {
    it('10:00 UTC (10:00 GMT) — within hours', () => {
      expect(isWithinOpeningHours(
        utc('2026-01-15T10:00:00Z'), utc('2026-01-15T11:30:00Z'), LONDON
      )).toBe(true);
    });

    it('09:00 UTC (09:00 GMT) — before opening', () => {
      expect(isWithinOpeningHours(
        utc('2026-01-15T09:00:00Z'), utc('2026-01-15T10:30:00Z'), LONDON
      )).toBe(false);
    });

    it('18:00 UTC (18:00 GMT) + 90min ends 19:30 — after closing', () => {
      expect(isWithinOpeningHours(
        utc('2026-01-15T18:00:00Z'), utc('2026-01-15T19:30:00Z'), LONDON
      )).toBe(false);
    });
  });

  describe('the bug that was fixed', () => {
    it('09:00 UTC during BST should be WITHIN hours (was incorrectly rejected)', () => {
      // This was the original bug: server compared UTC 09:00 < opening 10:00 → rejected
      // Fix: convert to BST first → 10:00 >= 10:00 → accepted
      const startUtc = utc('2026-06-15T09:00:00Z'); // 10:00 BST
      const endUtc = utc('2026-06-15T10:30:00Z');   // 11:30 BST
      expect(isWithinOpeningHours(startUtc, endUtc, LONDON)).toBe(true);

      // Verify the raw UTC comparison would have been wrong
      const utcHour = startUtc.getUTCHours(); // 9
      expect(utcHour).toBe(9);
      expect(utcHour < 10).toBe(true); // This is why the old code rejected it
    });
  });
});

// =============================================================================
// Discount day-of-week comparison (simulates server logic)
// =============================================================================

describe('Discount dayOfWeek comparison (integration)', () => {
  // Discount active Monday-Wednesday (1,2,3)
  const discountDays = [1, 2, 3];

  it('Monday 10:00 UTC during BST → local Monday → discount applies', () => {
    // 2026-06-15 is Monday
    const dow = getLocalDayOfWeek(utc('2026-06-15T10:00:00Z'), LONDON);
    expect(dow).toBe(1);
    expect(discountDays.includes(dow)).toBe(true);
  });

  it('Sunday 23:30 UTC during BST → local Monday → discount applies', () => {
    // 2026-06-14 Sunday 23:30 UTC = Monday 00:30 BST
    const dow = getLocalDayOfWeek(utc('2026-06-14T23:30:00Z'), LONDON);
    expect(dow).toBe(1); // Monday in BST
    expect(discountDays.includes(dow)).toBe(true);
  });

  it('Sunday 23:30 UTC during GMT → still Sunday → discount does NOT apply', () => {
    // 2026-01-11 Sunday 23:30 UTC = Sunday 23:30 GMT
    const dow = getLocalDayOfWeek(utc('2026-01-11T23:30:00Z'), LONDON);
    expect(dow).toBe(0); // Sunday
    expect(discountDays.includes(dow)).toBe(false);
  });

  it('the bug: getUTCDay would return wrong day near midnight in BST', () => {
    // Sunday 23:30 UTC = Monday 00:30 BST
    const date = utc('2026-06-14T23:30:00Z');
    const utcDay = date.getUTCDay(); // 0 = Sunday (WRONG for BST)
    const localDay = getLocalDayOfWeek(date, LONDON); // 1 = Monday (CORRECT)
    expect(utcDay).toBe(0);
    expect(localDay).toBe(1);
    expect(utcDay).not.toBe(localDay);
  });
});
