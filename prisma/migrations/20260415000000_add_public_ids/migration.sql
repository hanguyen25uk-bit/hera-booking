-- AlterTable: Add publicId columns for external-facing IDs
ALTER TABLE "Salon" ADD COLUMN "publicId" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "publicId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Salon_publicId_key" ON "Salon"("publicId");
CREATE UNIQUE INDEX "Appointment_publicId_key" ON "Appointment"("publicId");
