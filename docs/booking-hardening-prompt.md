# Hera Booking — Security & Correctness Hardening

## Context

SaaS booking zero-commission cho nail salon Hera (Next.js App Router + Prisma + PostgreSQL + Vercel), public booking flow không cần auth, route `/[salonSlug]/booking/`. Không có payment integration — "Payment is due at the salon".

Phase 1 audit đã hoàn thành. Tất cả findings dưới đây đã được verify từ source code với evidence file:line cụ thể. Không phải giả định.

## Confirmed Issues từ Phase 1 Audit

| # | Issue | Severity | Evidence |
|---|---|---|---|
| 1 | Client `totalDuration` override server calculation | **CRITICAL** | `route.ts:118` — `clientTotalDuration \|\| serverTotalDuration` |
| 2 | Không có DB-level overlap constraint | HIGH | `schema.prisma:201-245` — no exclusion constraint |
| 3 | Không có transaction wrap — TOCTOU race window | HIGH | `route.ts:168-229` — conflict check và insert không atomic |
| 4 | Weak sessionId dùng `Math.random()` | HIGH | `booking-client.tsx:23-25` |
| 5 | Không có idempotency key | MEDIUM | Không có field trong schema, không có header check |
| 6 | Rate limiter in-memory, không share giữa serverless instances | MEDIUM | `lib/rate-limit.ts` — Map-based |
| 7 | Không validate opening hours server-side | MEDIUM | `route.ts` — không check endTime vs hours |
| 8 | `serviceIds` Zod không có max length | LOW | `validations.ts:68` — unbounded array |
| 9 | `sessionId` chỉ validate `min(1)`, không check format | LOW | `validations.ts:83` |
| 10 | Legacy dual field `serviceId` + `serviceIds` | LOW | Client gửi cả 2, server chỉ đọc `serviceIds` |

## Bug logic quan trọng nhất: totalDuration override

Attacker gửi `totalDuration: 1` cho service 120 phút → server dùng giá trị client → appointment chỉ block 1 phút trong lịch. Slot sau vẫn available → có thể book overlap → phá hủy hệ thống lịch hoặc book miễn phí service đắt tiền.

**Đây là bug nguy hiểm nhất, fix ngay trước mọi thứ khác.**

## Confirmed OK (không cần fix)

- Zod input validation (schemas đầy đủ ở `lib/validations.ts`)
- Honeypot `website` field + timing check `_formLoadedAt` < 3s — có ở `bot-protection.ts`
- SSR pre-fetch data — `page.tsx` là server component, pass `initialData` xuống
- Không expose PII — `/staff` không có email/phone fields, `/bulk-availability` chỉ trả time ranges

## Ràng buộc chung

1. **Không breaking change**. Mọi fix phải backward compatible với client đang chạy.
2. **Mỗi fix một commit**. Format: `fix(booking): <scope> — <what>` hoặc `feat(booking): ...`.
3. **Không touch file không liên quan**. Scope chỉ trong booking flow.
4. **Hỏi nếu không chắc**. Đặc biệt nếu fix ảnh hưởng logic business hoặc cần adjust do schema khác expectation.
5. **Test sau mỗi fix**. Ít nhất `npx tsc --noEmit && npm run lint`. Manual test flow booking end-to-end sau cụm 3-4 fix.
6. **Báo cáo sau mỗi fix**, không gộp commits.

---

## FIX 1 (CRITICAL) — totalDuration override

**File:** `app/api/public/[slug]/appointments/route.ts:118`

**Hiện tại:**
```typescript
const finalDuration = clientTotalDuration || serverTotalDuration;
```

**Fix:**
1. Line 118: đổi thành `const finalDuration = serverTotalDuration;`
2. Grep toàn bộ `route.ts` xem `clientTotalDuration` còn dùng ở đâu khác — xóa nếu không cần.
3. `lib/validations.ts` `BookingSchema`: `totalDuration` field — giữ optional cho backward compat nhưng server ignore. Thêm comment `// Ignored server-side, calculated from serviceIds. Kept for backward compat.`
4. Client `booking-client.tsx`: vẫn gửi totalDuration cho UX display summary, không đổi client.
5. Test: curl với `totalDuration: 1` cho service 120 phút → verify appointment tạo với `endTime = startTime + 120 phút`.

**Commit:** `fix(booking): ignore client-provided totalDuration, always compute server-side`

---

## FIX 2 (HIGH) — DB exclusion constraint

**Pre-check trước migration:**
```sql
-- Chạy ở Prisma Studio hoặc psql production (read-only)
SELECT a1.id as id1, a2.id as id2, a1."staffId",
       a1."startTime" as start1, a1."endTime" as end1,
       a2."startTime" as start2, a2."endTime" as end2
FROM "Appointment" a1
JOIN "Appointment" a2 ON a1."staffId" = a2."staffId"
  AND a1.id < a2.id
  AND tstzrange(a1."startTime", a1."endTime", '[)') && tstzrange(a2."startTime", a2."endTime", '[)')
WHERE a1.status NOT IN ('cancelled','no-show')
  AND a2.status NOT IN ('cancelled','no-show');
```

Nếu query trả về rows → **DỪNG LẠI**, báo tôi biết. Cần resolve overlap data trước khi add constraint, không migrate sẽ fail.

**Nếu query trả về empty:**

Tạo migration:
```bash
npx prisma migrate dev --create-only --name add_appointment_overlap_constraint
```

Edit file SQL vừa tạo:
```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Appointment"
ADD CONSTRAINT appointment_no_overlap_per_staff
EXCLUDE USING gist (
  "staffId" WITH =,
  tstzrange("startTime", "endTime", '[)') WITH &&
) WHERE ("status" NOT IN ('cancelled', 'no-show'));
```

**Lưu ý status values:** check `schema.prisma` xem status field dùng Prisma enum hay string. Nếu enum `AppointmentStatus { CANCELLED NO_SHOW ... }`, giá trị trong DB sẽ là uppercase — adjust SQL cho khớp. Dùng psql check thực tế:
```sql
SELECT DISTINCT status FROM "Appointment";
```

**Apply local trước:**
```bash
npx prisma migrate dev
```

**Verify:**
```sql
-- Insert 2 appointment overlap thủ công, expect error
INSERT INTO "Appointment" (...) VALUES (...); -- 10:00-11:00
INSERT INTO "Appointment" (...) VALUES (...); -- 10:30-11:30 cùng staff
-- Expect: ERROR: conflicting key value violates exclusion constraint
```

**Error handling trong route.ts** (kết hợp với FIX 3):
```typescript
try {
  const appointment = await tx.appointment.create({...});
} catch (e: any) {
  // Prisma wraps raw Postgres errors; check nested error
  if (e.code === 'P2010' && e.meta?.code === '23P01') {
    throw new SlotTakenError();
  }
  if (e.code === 'P2002') { // unique violation (idempotency key)
    throw new DuplicateAppointmentError();
  }
  throw e;
}
```

**Commit:** `fix(booking): add DB-level exclusion constraint for appointment overlap`

---

## FIX 3 (HIGH) — Transaction wrap

**File:** `app/api/public/[slug]/appointments/route.ts:168-234`

Wrap toàn bộ flow từ conflict check đến delete reservation vào `prisma.$transaction` với Serializable isolation.

**Custom errors (tạo ở đầu file hoặc `lib/booking-errors.ts`):**
```typescript
export class ReservationExpiredError extends Error { code = 'RESERVATION_EXPIRED'; }
export class ReservationMismatchError extends Error { code = 'RESERVATION_MISMATCH'; }
export class SlotTakenError extends Error { code = 'SLOT_TAKEN'; }
export class DuplicateAppointmentError extends Error { code = 'DUPLICATE'; }
```

**Transaction:**
```typescript
const result = await prisma.$transaction(async (tx) => {
  // 1. Re-validate reservation nếu có sessionId
  if (sessionId) {
    const reservation = await tx.slotReservation.findFirst({
      where: { sessionId, salonId }
    });
    if (!reservation || reservation.expiresAt < new Date()) {
      throw new ReservationExpiredError();
    }
    if (reservation.staffId !== staffId ||
        reservation.startTime.getTime() !== start.getTime()) {
      throw new ReservationMismatchError();
    }
  }

  // 2. Conflict check (vẫn giữ để error message friendly hơn exclusion constraint)
  const conflict = await tx.appointment.findFirst({
    where: {
      salonId, staffId,
      status: { notIn: ['cancelled','no-show'] },
      startTime: { lt: end },
      endTime: { gt: start }
    }
  });
  if (conflict) throw new SlotTakenError();

  // 3. Upsert customer
  const customer = await tx.customer.upsert({...});

  // 4. Create appointment (exclusion constraint sẽ catch race nếu có)
  const appointment = await tx.appointment.create({
    data: { ..., idempotencyKey: body.idempotencyKey }
  });

  // 5. Delete reservation
  if (sessionId) {
    await tx.slotReservation.deleteMany({
      where: { sessionId, salonId }
    });
  }

  return appointment;
}, {
  isolationLevel: 'Serializable',
  maxWait: 5000,
  timeout: 10000,
});
```

**Error handling ngoài transaction:**
```typescript
try {
  const result = await prisma.$transaction(...);
  return Response.json(result);
} catch (e: any) {
  if (e instanceof ReservationExpiredError) {
    return Response.json({ error: 'Reservation expired', code: e.code }, { status: 409 });
  }
  if (e instanceof ReservationMismatchError) {
    return Response.json({ error: 'Reservation mismatch', code: e.code }, { status: 409 });
  }
  if (e instanceof SlotTakenError) {
    return Response.json({ error: 'Slot no longer available', code: e.code }, { status: 409 });
  }
  if (e instanceof DuplicateAppointmentError) {
    // Fetch existing by idempotencyKey và return
    const existing = await prisma.appointment.findUnique({
      where: { idempotencyKey: body.idempotencyKey }
    });
    if (existing) return Response.json(existing);
  }
  if (e.code === 'P2010' && e.meta?.code === '23P01') {
    return Response.json({ error: 'Slot no longer available', code: 'SLOT_TAKEN' }, { status: 409 });
  }
  if (e.code === 'P2034') { // serialization failure — retry once
    // ... retry logic, nếu vẫn fail trả 503
  }
  console.error('Booking creation failed:', e);
  return Response.json({ error: 'Failed to create booking' }, { status: 500 });
}
```

**Commit:** `fix(booking): wrap appointment creation in serializable transaction`

---

## FIX 4 (HIGH) — Strong sessionId

**Client file:** `app/[slug]/booking/booking-client.tsx:23-25`

**Hiện tại:**
```typescript
function generateSessionId(): string {
  return "session_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
}
```

**Fix:**
```typescript
function generateSessionId(): string {
  // Modern browsers (iOS 15.4+, all evergreen desktop)
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Fallback: crypto.getRandomValues (IE11+, all browsers with crypto API)
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
}
```

**Server Zod schema** (`validations.ts:83`) — grace period 7 ngày accept cả 2 format:
```typescript
sessionId: z.string().regex(
  /^(session_[a-z0-9]+|[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i,
  'Invalid session ID format'
).max(100)
```

**Sau 7 ngày deploy, tighten:**
```typescript
sessionId: z.string().uuid()
```

**Commits:**
- `fix(booking): use crypto.randomUUID for sessionId generation`
- (Sau 7 ngày) `fix(booking): enforce UUID v4 format for sessionId`

---

## FIX 5 (MEDIUM) — Idempotency key

**Prisma schema** (`schema.prisma`, model `Appointment`):
```prisma
model Appointment {
  // ... existing fields
  idempotencyKey String?  @unique
  // ...
}
```

**Migration:**
```bash
npx prisma migrate dev --name add_appointment_idempotency_key
```

**Client** (`booking-client.tsx`) — generate khi form mount (step 4 hoặc khi component init):
```typescript
const [idempotencyKey] = useState(() => crypto.randomUUID());

// Trong fetch body:
body: JSON.stringify({
  ...existingFields,
  idempotencyKey,
})
```

**Server** (`appointments/route.ts`) — check trước khi tạo, trong transaction ở FIX 3:
```typescript
// Đầu transaction, trước conflict check
if (body.idempotencyKey) {
  const existing = await tx.appointment.findUnique({
    where: { idempotencyKey: body.idempotencyKey }
  });
  if (existing) {
    return existing; // Return cached, skip rest of transaction
  }
}
```

**Zod:** `idempotencyKey: z.string().uuid().optional()` — optional cho backward compat.

**Commit:** `feat(booking): add idempotency key to prevent duplicate appointments`

---

## FIX 6 (MEDIUM) — Upstash Redis rate limiter

**Vấn đề:** in-memory Map không work correctly với Vercel serverless (10-50 instances auto-scale) → effective rate limit cao hơn config × N instances.

**Steps:**

1. Install:
```bash
npm install @upstash/ratelimit @upstash/redis
```

2. Tạo Upstash Redis DB free tier: https://upstash.com → lấy `UPSTASH_REDIS_REST_URL` và `UPSTASH_REDIS_REST_TOKEN` → add vào Vercel env vars (cả Production, Preview, Development).

3. Refactor `lib/rate-limit.ts`:
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export const ratelimiters = {
  booking: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    prefix: 'rl:booking',
    analytics: true,
  }),
  bookingEmail: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1 h'),
    prefix: 'rl:booking-email',
    analytics: true,
  }),
  publicRead: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    prefix: 'rl:public-read',
  }),
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    prefix: 'rl:auth',
  }),
  admin: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    prefix: 'rl:admin',
  }),
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    prefix: 'rl:api',
  }),
};

export async function checkRateLimit(
  kind: keyof typeof ratelimiters,
  identifier: string
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  try {
    const result = await ratelimiters[kind].limit(identifier);
    return result;
  } catch (error) {
    // Fail-open: nếu Redis down, allow request thay vì block. Log để monitor.
    console.error('Rate limit check failed, failing open:', error);
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }
}
```

4. **Migration note:** call sites của rate limiter có thể cần adjust vì giờ async. Grep toàn repo tìm `checkRateLimit` và update.

5. **Deploy strategy:** deploy staging trước, verify rate limit work đúng qua Upstash dashboard (thấy keys `rl:booking:*` appear). Nếu OK, deploy prod.

**Commit:** `feat(booking): migrate rate limiter to Upstash Redis for serverless consistency`

---

## FIX 7 (MEDIUM) — Opening hours validation

**File:** `app/api/public/[slug]/appointments/route.ts`

**Check schema trước:** tìm model opening hours trong `schema.prisma`. Có thể là:
- `OpeningHours` hoặc `BusinessHours` với fields `dayOfWeek`, `openTime`, `closeTime`, `isOpen`
- Hoặc JSON config trên `Salon` model
- Hoặc `SalonSchedule`

Adjust code dưới đây theo tên model thực tế.

**Thêm sau khi tính serverTotalDuration, trước conflict check:**
```typescript
const dayOfWeek = start.getDay(); // 0=Sun, 6=Sat
const hours = await prisma.openingHours.findFirst({
  where: { salonId, dayOfWeek }
});

if (!hours || !hours.isOpen) {
  return Response.json({
    error: 'Salon closed on this day',
    code: 'SALON_CLOSED'
  }, { status: 400 });
}

// Parse "HH:MM" format
const [openH, openM] = hours.openTime.split(':').map(Number);
const [closeH, closeM] = hours.closeTime.split(':').map(Number);

const dayStart = new Date(start);
dayStart.setHours(openH, openM, 0, 0);
const dayEnd = new Date(start);
dayEnd.setHours(closeH, closeM, 0, 0);

if (start < dayStart || end > dayEnd) {
  return Response.json({
    error: 'Appointment outside opening hours',
    code: 'OUTSIDE_HOURS',
    details: {
      openTime: hours.openTime,
      closeTime: hours.closeTime
    }
  }, { status: 400 });
}
```

**Timezone warning:** nếu salon operating timezone khác UTC, parse phải theo Europe/London timezone (có DST). Dùng `date-fns-tz` hoặc luxon để handle đúng:
```typescript
import { zonedTimeToUtc } from 'date-fns-tz';
const dayStart = zonedTimeToUtc(`${dateStr}T${hours.openTime}`, 'Europe/London');
```

**Commit:** `fix(booking): validate appointment fits within salon opening hours`

---

## FIX 8 (MEDIUM) — Server-authoritative timer

**Vấn đề:** client `setInterval` countdown bị throttle khi tab background → lệch pha với server → user submit lúc đã expire server-side, báo lỗi confusing.

**Route mới:** `app/api/public/[slug]/slot-reservation/status/route.ts`

```typescript
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSalonBySlug } from '@/lib/salon';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const sessionId = req.nextUrl.searchParams.get('sessionId');

  if (!sessionId) {
    return Response.json({ valid: false, error: 'Missing sessionId' }, { status: 400 });
  }

  const salon = await getSalonBySlug(slug);
  if (!salon) {
    return Response.json({ valid: false }, { status: 404 });
  }

  const reservation = await prisma.slotReservation.findFirst({
    where: { sessionId, salonId: salon.id }
  });

  if (!reservation) {
    return Response.json({ valid: false, secondsRemaining: 0 });
  }

  const secondsRemaining = Math.max(0,
    Math.floor((reservation.expiresAt.getTime() - Date.now()) / 1000)
  );

  return Response.json({
    valid: secondsRemaining > 0,
    secondsRemaining,
    expiresAt: reservation.expiresAt.toISOString()
  });
}
```

**Client** (`booking-client.tsx`) — sync khi countdown sắp hết:
```typescript
useEffect(() => {
  if (!reservationExpiresAt || secondsRemaining > 10) return;
  if (secondsRemaining === 0) return; // already expired locally

  let cancelled = false;
  const resync = async () => {
    try {
      const res = await fetch(
        `${apiBase}/slot-reservation/status?sessionId=${sessionId}`
      );
      if (!res.ok) return;
      const data = await res.json();
      if (cancelled) return;

      if (!data.valid) {
        setReservationExpiresAt(null);
        setSelectedSlot('');
        setErrorMsg('Reservation expired. Please select a time again.');
      } else {
        // Sync với server's expiresAt
        setReservationExpiresAt(new Date(data.expiresAt));
      }
    } catch (e) {
      // Network error, silent fail (client timer vẫn chạy)
    }
  };
  resync();

  return () => { cancelled = true; };
}, [secondsRemaining <= 10 && secondsRemaining > 0]);
```

**Rate limit** cho route này: 30/min/IP (publicRead group).

**Commit:** `feat(booking): add server-authoritative reservation status endpoint`

---

## FIX 9 (LOW) — Zod hardening

**File:** `lib/validations.ts`

```typescript
// BookingSchema (line 55-73)
export const BookingSchema = z.object({
  serviceIds: z.array(idSchema).min(1).max(2), // ← THÊM .min(1).max(2)
  staffId: idSchema.optional(),
  customerName: z.string().trim().min(2).max(100),
  customerEmail: z.string().email().max(254),
  customerPhone: z.string().regex(/^[\d\s+()-]{7,20}$/),
  startTime: z.string().datetime(),
  totalDuration: z.number().int().positive().optional(), // kept for backward compat, ignored server-side
  idempotencyKey: z.string().uuid().optional(), // from FIX 5
  website: z.literal(''),
  _formLoadedAt: z.number().int(),
}).strict();

// SlotReservationSchema (line 79-84)
export const SlotReservationSchema = z.object({
  staffId: idSchema,
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  sessionId: z.string()
    .regex(/^[a-zA-Z0-9_-]{8,100}$/, 'Invalid session ID format')
    .max(100),
}).strict();
```

**Commit:** `fix(booking): tighten Zod validation for serviceIds length and sessionId format`

---

## FIX 10 (LOW) — Remove legacy serviceId field

**Client** (`booking-client.tsx`) — trong POST `/appointments`, body hiện có cả:
```typescript
body: JSON.stringify({
  serviceId: A[0],     // ← legacy
  serviceIds: A,       // ← current
  ...
})
```

**Steps:**
1. Grep server-side (toàn bộ `app/api/`) xem còn code nào đọc `body.serviceId` không. Nếu có, refactor dùng `body.serviceIds[0]` hoặc `body.serviceIds`.
2. Xóa field `serviceId` khỏi request body ở client.
3. Xóa khỏi Zod schema nếu có.

**Commit:** `refactor(booking): remove legacy serviceId field, use serviceIds array only`

---

## FIX 11 (OPTIONAL) — Prevent double-submit

**File:** `app/[slug]/booking/booking-client.tsx` — function xử lý final submit.

Verify (có thể đã đúng):
1. State `isSubmitting` set `true` ngay đầu handler
2. Reset `false` trong `finally` block
3. Submit button: `disabled={isSubmitting || !!appointmentId}`
4. Button text: `{isSubmitting ? 'Confirming...' : 'Confirm Booking'}`

Nếu đã đủ, skip fix này. Document trong audit doc.

**Commit (nếu có thay đổi):** `fix(booking): prevent double-submit on confirmation step`

---

## Deploy Strategy (recommended schedule)

| Tuần | Fixes | Risk | Lý do |
|---|---|---|---|
| 1 | FIX 1 (totalDuration) | Zero | One-line server change, zero client impact |
| 1 | FIX 4 (sessionId) | Low | Additive, grace period 7 ngày ở server |
| 2 | FIX 5 (idempotency) | Low | Additive field, backward compat |
| 2 | FIX 7 (opening hours) | Low | Check data đúng timezone trước |
| 2 | FIX 9 + 10 (Zod + legacy) | Low | Cleanup |
| 3 | FIX 2 + FIX 3 (exclusion + transaction) | **High** | DB migration + logic change. Deploy cùng nhau. Cần pre-check data overlap. |
| 3 | FIX 6 (Upstash) | Medium | Cần setup Upstash trước, test staging |
| 4 | FIX 8 (server timer) | Low | New endpoint, client additive change |
| 4 (sau 7 ngày từ FIX 4) | Tighten sessionId Zod | Low | |

## Post-implementation tasks

Sau khi xong tất cả:

1. **Manual test flow toàn bộ:**
   - Book 1 service với specific staff
   - Book 2 services với any staff
   - Book với discount active
   - Book với reservation expired (đợi 5 phút)
   - Thử double-submit (disable devtools network throttling)
   - Thử curl với `totalDuration: 1` — verify server ignore
   - Thử book outside opening hours — verify 400

2. **Build check:**
```bash
npx tsc --noEmit
npm run lint
npm run build
```

3. **Tạo audit doc:** `docs/booking-security-audit-2026-04.md`
```markdown
# Booking Security Audit — April 2026

## Summary
[Brief: what was audited, what was fixed]

## Issues Found (Phase 1)
[Copy table từ đầu file này]

## Fixes Applied
- FIX 1: [commit hash] — totalDuration override
- FIX 2: [commit hash] — Exclusion constraint
- ... etc

## Already Secure (không cần fix)
- Zod input validation
- Honeypot + timing anti-bot
- SSR with pre-fetched data
- No PII in public endpoints

## Deferred / Future Work
- Turnstile/captcha (monitor bot traffic trước)
- Sentry error observability
- PostHog funnel tracking cho drop-off analysis
- SessionId IP binding (consider nếu có abuse pattern)

## Testing
[Danh sách manual tests chạy]
```

4. **Git tag:**
```bash
git tag -a booking-hardening-v1 -m "Security audit fixes April 2026"
git push origin booking-hardening-v1
```

---

## Bắt đầu

Bắt đầu từ **FIX 1** — đây là bug logic nghiêm trọng nhất, 1 line change, zero risk. Deploy ngay sau khi test.

Sau FIX 1, báo cáo và đợi tôi duyệt trước khi làm FIX 2.

Nếu bất kỳ fix nào có blocker (VD: FIX 2 pre-check tìm thấy overlap data, FIX 7 schema khác expectation, FIX 6 không có quyền tạo Upstash account), **DỪNG LẠI** và hỏi tôi. Đừng cố workaround.
