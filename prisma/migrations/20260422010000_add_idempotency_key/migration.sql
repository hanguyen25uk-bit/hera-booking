-- Add idempotency key to prevent duplicate appointment creation
ALTER TABLE "Appointment" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "Appointment_idempotencyKey_key" ON "Appointment"("idempotencyKey");
