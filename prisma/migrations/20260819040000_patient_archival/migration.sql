ALTER TABLE "Patient"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "archivedBy" TEXT,
  ADD COLUMN "archiveReason" TEXT;

ALTER TABLE "Appointment"
  ADD COLUMN "cancelledReason" TEXT;

ALTER TABLE "DeviceSession"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN "revokedAt" TIMESTAMP(3),
  ADD COLUMN "revokedBy" TEXT,
  ADD COLUMN "revokeReason" TEXT;

CREATE TABLE "DemoSeed" (
  "id" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "seededAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DemoSeed_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Patient_status_updatedAt_idx" ON "Patient"("status", "updatedAt");
CREATE INDEX "DeviceSession_status_lastSeenAt_idx" ON "DeviceSession"("status", "lastSeenAt");
