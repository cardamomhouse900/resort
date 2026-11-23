-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "confirmationEmailSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "bookings_status_confirmationEmailSentAt_idx" ON "bookings"("status", "confirmationEmailSentAt");
