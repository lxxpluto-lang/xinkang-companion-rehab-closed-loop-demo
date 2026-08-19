DROP INDEX IF EXISTS "DeviceSession_loginCode_key";
CREATE INDEX "DeviceSession_loginCode_status_idx" ON "DeviceSession"("loginCode", "status");
CREATE UNIQUE INDEX "DeviceSession_one_active_login_code" ON "DeviceSession"("loginCode") WHERE "status" = 'active';
