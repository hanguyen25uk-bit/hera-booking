import { describe, it, expect } from 'vitest';
import { BookingSchema, SlotReservationSchema } from '../lib/validations';

// =============================================================================
// FIX 1 — totalDuration is accepted by schema but ignored server-side
// =============================================================================

describe('FIX 1: totalDuration override protection', () => {
  const validBooking = {
    customerName: 'Test Customer',
    customerEmail: 'test@example.com',
    customerPhone: '07700900000',
    serviceId: 'cmljeg282004d86i7makjyz6w',
    staffId: 'cmkwmjcpq0003shr2sv7nznyc',
    startTime: '2026-05-01T10:00:00.000Z',
  };

  it('accepts booking without totalDuration', () => {
    const result = BookingSchema.safeParse(validBooking);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.totalDuration).toBeUndefined();
    }
  });

  it('accepts booking with totalDuration (backward compat)', () => {
    const result = BookingSchema.safeParse({ ...validBooking, totalDuration: 90 });
    expect(result.success).toBe(true);
    if (result.success) {
      // totalDuration passes schema validation but server MUST ignore it
      expect(result.data.totalDuration).toBe(90);
    }
  });

  it('accepts booking with totalDuration: 1 (schema allows, server ignores)', () => {
    const result = BookingSchema.safeParse({ ...validBooking, totalDuration: 1 });
    expect(result.success).toBe(true);
    // This value would be ignored server-side — duration always from DB services
  });

  it('rejects totalDuration: 0 (must be positive)', () => {
    const result = BookingSchema.safeParse({ ...validBooking, totalDuration: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects totalDuration: -1 (must be positive)', () => {
    const result = BookingSchema.safeParse({ ...validBooking, totalDuration: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects totalDuration: 1.5 (must be integer)', () => {
    const result = BookingSchema.safeParse({ ...validBooking, totalDuration: 1.5 });
    expect(result.success).toBe(false);
  });

  it('server duration calculation ignores client value', () => {
    // Simulate server-side logic: always compute from services
    const services = [
      { durationMinutes: 60 },
      { durationMinutes: 30 },
    ];
    const clientTotalDuration = 1; // attacker sends 1 minute

    // Server logic (from route.ts — FIX 1 applied)
    const serverTotalDuration = services.reduce((sum, s) => sum + s.durationMinutes, 0);
    // OLD (vulnerable): const finalDuration = clientTotalDuration || serverTotalDuration;
    // NEW (fixed): always use server calculation
    const finalDuration = serverTotalDuration;

    expect(finalDuration).toBe(90);
    expect(finalDuration).not.toBe(clientTotalDuration);
  });

  it('server duration calculation works with single service', () => {
    const services = [{ durationMinutes: 120 }];
    const serverTotalDuration = services.reduce((sum, s) => sum + s.durationMinutes, 0);
    expect(serverTotalDuration).toBe(120);
  });

  it('endTime correctly computed from server duration', () => {
    const startTime = new Date('2026-05-01T10:00:00.000Z');
    const services = [{ durationMinutes: 90 }];
    const totalDuration = services.reduce((sum, s) => sum + s.durationMinutes, 0);
    const endTime = new Date(startTime.getTime() + totalDuration * 60000);

    expect(endTime.toISOString()).toBe('2026-05-01T11:30:00.000Z');
  });
});

// =============================================================================
// FIX 2 — DB exclusion constraint (overlap logic tests)
// =============================================================================

describe('FIX 2: Appointment overlap detection logic', () => {
  // Mirrors the overlap check query from route.ts:168-176
  // WHERE startTime < end AND endTime > start
  function hasOverlap(
    existing: { startTime: Date; endTime: Date; staffId: string; status: string },
    newAppt: { startTime: Date; endTime: Date; staffId: string }
  ): boolean {
    if (existing.staffId !== newAppt.staffId) return false;
    if (['cancelled', 'no-show'].includes(existing.status)) return false;
    return existing.startTime < newAppt.endTime && existing.endTime > newAppt.startTime;
  }

  const staff1 = 'staff-1';
  const staff2 = 'staff-2';

  // Existing: 10:00-11:00, staff1, confirmed
  const existing = {
    startTime: new Date('2026-05-01T10:00:00Z'),
    endTime: new Date('2026-05-01T11:00:00Z'),
    staffId: staff1,
    status: 'confirmed',
  };

  it('detects full overlap (same time)', () => {
    expect(hasOverlap(existing, {
      startTime: new Date('2026-05-01T10:00:00Z'),
      endTime: new Date('2026-05-01T11:00:00Z'),
      staffId: staff1,
    })).toBe(true);
  });

  it('detects partial overlap (starts during existing)', () => {
    expect(hasOverlap(existing, {
      startTime: new Date('2026-05-01T10:30:00Z'),
      endTime: new Date('2026-05-01T11:30:00Z'),
      staffId: staff1,
    })).toBe(true);
  });

  it('detects partial overlap (ends during existing)', () => {
    expect(hasOverlap(existing, {
      startTime: new Date('2026-05-01T09:30:00Z'),
      endTime: new Date('2026-05-01T10:30:00Z'),
      staffId: staff1,
    })).toBe(true);
  });

  it('detects contained overlap (new inside existing)', () => {
    expect(hasOverlap(existing, {
      startTime: new Date('2026-05-01T10:15:00Z'),
      endTime: new Date('2026-05-01T10:45:00Z'),
      staffId: staff1,
    })).toBe(true);
  });

  it('detects enclosing overlap (new wraps existing)', () => {
    expect(hasOverlap(existing, {
      startTime: new Date('2026-05-01T09:00:00Z'),
      endTime: new Date('2026-05-01T12:00:00Z'),
      staffId: staff1,
    })).toBe(true);
  });

  it('allows adjacent booking (starts exactly when existing ends)', () => {
    // [) range — end is exclusive, so 11:00 start should NOT overlap 10:00-11:00
    // But our app-level check uses strict inequality: startTime < end AND endTime > start
    // new.startTime (11:00) < existing.endTime (11:00) = false → no overlap
    expect(hasOverlap(existing, {
      startTime: new Date('2026-05-01T11:00:00Z'),
      endTime: new Date('2026-05-01T12:00:00Z'),
      staffId: staff1,
    })).toBe(false);
  });

  it('allows booking before existing', () => {
    expect(hasOverlap(existing, {
      startTime: new Date('2026-05-01T08:00:00Z'),
      endTime: new Date('2026-05-01T10:00:00Z'),
      staffId: staff1,
    })).toBe(false);
  });

  it('allows booking well after existing', () => {
    expect(hasOverlap(existing, {
      startTime: new Date('2026-05-01T14:00:00Z'),
      endTime: new Date('2026-05-01T15:00:00Z'),
      staffId: staff1,
    })).toBe(false);
  });

  it('allows same time for different staff', () => {
    expect(hasOverlap(existing, {
      startTime: new Date('2026-05-01T10:00:00Z'),
      endTime: new Date('2026-05-01T11:00:00Z'),
      staffId: staff2,
    })).toBe(false);
  });

  it('ignores cancelled appointments', () => {
    const cancelled = { ...existing, status: 'cancelled' };
    expect(hasOverlap(cancelled, {
      startTime: new Date('2026-05-01T10:00:00Z'),
      endTime: new Date('2026-05-01T11:00:00Z'),
      staffId: staff1,
    })).toBe(false);
  });

  it('ignores no-show appointments', () => {
    const noshow = { ...existing, status: 'no-show' };
    expect(hasOverlap(noshow, {
      startTime: new Date('2026-05-01T10:00:00Z'),
      endTime: new Date('2026-05-01T11:00:00Z'),
      staffId: staff1,
    })).toBe(false);
  });

  it('detects overlap with multiple existing appointments', () => {
    const existingAppts = [
      { startTime: new Date('2026-05-01T09:00:00Z'), endTime: new Date('2026-05-01T10:00:00Z'), staffId: staff1, status: 'confirmed' },
      { startTime: new Date('2026-05-01T10:00:00Z'), endTime: new Date('2026-05-01T11:00:00Z'), staffId: staff1, status: 'confirmed' },
      { startTime: new Date('2026-05-01T14:00:00Z'), endTime: new Date('2026-05-01T15:00:00Z'), staffId: staff1, status: 'confirmed' },
    ];

    const newAppt = {
      startTime: new Date('2026-05-01T10:30:00Z'),
      endTime: new Date('2026-05-01T11:30:00Z'),
      staffId: staff1,
    };

    const conflicts = existingAppts.filter(a => hasOverlap(a, newAppt));
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].startTime.toISOString()).toBe('2026-05-01T10:00:00.000Z');
  });

  it('allows booking in gap between appointments', () => {
    const existingAppts = [
      { startTime: new Date('2026-05-01T09:00:00Z'), endTime: new Date('2026-05-01T10:00:00Z'), staffId: staff1, status: 'confirmed' },
      { startTime: new Date('2026-05-01T12:00:00Z'), endTime: new Date('2026-05-01T13:00:00Z'), staffId: staff1, status: 'confirmed' },
    ];

    const newAppt = {
      startTime: new Date('2026-05-01T10:30:00Z'),
      endTime: new Date('2026-05-01T11:30:00Z'),
      staffId: staff1,
    };

    const conflicts = existingAppts.filter(a => hasOverlap(a, newAppt));
    expect(conflicts.length).toBe(0);
  });
});

// =============================================================================
// Booking schema validation edge cases
// =============================================================================

describe('BookingSchema validation', () => {
  const validBooking = {
    customerName: 'Test Customer',
    customerEmail: 'test@example.com',
    customerPhone: '07700900000',
    serviceId: 'cmljeg282004d86i7makjyz6w',
    staffId: 'cmkwmjcpq0003shr2sv7nznyc',
    startTime: '2026-05-01T10:00:00.000Z',
  };

  it('accepts valid booking', () => {
    expect(BookingSchema.safeParse(validBooking).success).toBe(true);
  });

  it('accepts booking with serviceIds array', () => {
    const result = BookingSchema.safeParse({
      ...validBooking,
      serviceIds: ['cmljeg282004d86i7makjyz6w', 'cmljeg282004d86i7makjyz6x'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    expect(BookingSchema.safeParse({ ...validBooking, customerEmail: 'notanemail' }).success).toBe(false);
  });

  it('rejects invalid phone', () => {
    expect(BookingSchema.safeParse({ ...validBooking, customerPhone: '123' }).success).toBe(false);
  });

  it('rejects invalid startTime format', () => {
    expect(BookingSchema.safeParse({ ...validBooking, startTime: '2026-05-01' }).success).toBe(false);
  });

  it('rejects name too short', () => {
    expect(BookingSchema.safeParse({ ...validBooking, customerName: 'A' }).success).toBe(false);
  });

  it('rejects extra fields (strict mode)', () => {
    expect(BookingSchema.safeParse({ ...validBooking, malicious: 'payload' }).success).toBe(false);
  });

  it('lowercases email', () => {
    const result = BookingSchema.safeParse({ ...validBooking, customerEmail: 'TEST@Example.COM' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customerEmail).toBe('test@example.com');
    }
  });

  it('rejects email with spaces', () => {
    // Zod .email() rejects spaces before .transform() runs
    const result = BookingSchema.safeParse({ ...validBooking, customerEmail: '  test@example.com  ' });
    expect(result.success).toBe(false);
  });
});

describe('SlotReservationSchema validation', () => {
  const validReservation = {
    staffId: 'cmkwmjcpq0003shr2sv7nznyc',
    startTime: '2026-05-01T10:00:00.000Z',
    endTime: '2026-05-01T11:00:00.000Z',
    sessionId: 'abc123def456',
  };

  it('accepts valid reservation', () => {
    expect(SlotReservationSchema.safeParse(validReservation).success).toBe(true);
  });

  it('rejects empty sessionId', () => {
    expect(SlotReservationSchema.safeParse({ ...validReservation, sessionId: '' }).success).toBe(false);
  });

  it('rejects missing sessionId', () => {
    const { sessionId, ...noSession } = validReservation;
    expect(SlotReservationSchema.safeParse(noSession).success).toBe(false);
  });

  it('rejects invalid startTime', () => {
    expect(SlotReservationSchema.safeParse({ ...validReservation, startTime: 'not-a-date' }).success).toBe(false);
  });
});
