-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "razorpayRefundId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "refunds_razorpayRefundId_key" ON "refunds"("razorpayRefundId");

-- CreateIndex
CREATE INDEX "refunds_paymentId_idx" ON "refunds"("paymentId");

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written additions
ALTER TABLE "refunds"
  ADD CONSTRAINT "refunds_amount_check" CHECK ("amountPaise" > 0),
  ADD CONSTRAINT "refunds_status_check" CHECK ("status" IN ('pending', 'processed', 'failed'));

-- Keep the Supabase public REST API locked out (see the init migration).
ALTER TABLE "refunds" ENABLE ROW LEVEL SECURITY;
