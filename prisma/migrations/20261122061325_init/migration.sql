-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('OWNER', 'STAFF');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('WEBSITE', 'ADMIN');

-- CreateEnum
CREATE TYPE "ReservationKind" AS ENUM ('BOOKING', 'BLOCK');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('HELD', 'CONFIRMED', 'BLOCKED', 'RELEASED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "PlaceKind" AS ENUM ('NEARBY', 'ATTRACTION');

-- CreateEnum
CREATE TYPE "ActivityCategory" AS ENUM ('ADVENTURE', 'RELAXATION', 'FAMILY', 'NATURE');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'REPLIED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "admins" (
    "id" UUID NOT NULL,
    "authUserId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'STAFF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "resortName" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "locationName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mapsUrl" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "advancePercent" INTEGER NOT NULL DEFAULT 30,
    "holdMinutes" INTEGER NOT NULL DEFAULT 15,
    "taxPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "pricesIncludeTax" BOOLEAN NOT NULL DEFAULT true,
    "minNights" INTEGER NOT NULL DEFAULT 1,
    "maxNights" INTEGER NOT NULL DEFAULT 14,
    "bookingWindowDays" INTEGER NOT NULL DEFAULT 365,
    "checkInTime" TEXT NOT NULL DEFAULT '13:00',
    "checkOutTime" TEXT NOT NULL DEFAULT '11:00',
    "bookingPolicy" TEXT NOT NULL,
    "cancellationPolicy" TEXT NOT NULL,
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_types" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT[],
    "basePrice" DECIMAL(10,2) NOT NULL,
    "maxAdults" INTEGER NOT NULL,
    "maxChildren" INTEGER NOT NULL,
    "maxOccupancy" INTEGER NOT NULL,
    "bedConfiguration" TEXT NOT NULL,
    "sizeSqFt" INTEGER,
    "images" JSONB NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" UUID NOT NULL,
    "roomTypeId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amenities" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_type_amenities" (
    "roomTypeId" UUID NOT NULL,
    "amenityId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "room_type_amenities_pkey" PRIMARY KEY ("roomTypeId","amenityId")
);

-- CreateTable
CREATE TABLE "pricing_rules" (
    "id" UUID NOT NULL,
    "roomTypeId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "daysOfWeek" INTEGER[],
    "pricePerNight" DECIMAL(10,2) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "accessTokenHash" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "source" "BookingSource" NOT NULL DEFAULT 'WEBSITE',
    "roomTypeId" UUID NOT NULL,
    "checkIn" DATE NOT NULL,
    "checkOut" DATE NOT NULL,
    "nights" INTEGER NOT NULL,
    "adults" INTEGER NOT NULL,
    "children" INTEGER NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT NOT NULL,
    "guestPhone" TEXT NOT NULL,
    "specialRequests" TEXT,
    "priceBreakdown" JSONB NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "taxPercent" DECIMAL(5,2) NOT NULL,
    "taxAmount" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "advancePercent" INTEGER NOT NULL,
    "advanceAmount" DECIMAL(10,2) NOT NULL,
    "balanceAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "holdExpiresAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "id" UUID NOT NULL,
    "roomId" UUID NOT NULL,
    "bookingId" UUID,
    "kind" "ReservationKind" NOT NULL,
    "status" "ReservationStatus" NOT NULL,
    "checkIn" DATE NOT NULL,
    "checkOut" DATE NOT NULL,
    "holdExpiresAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'razorpay',
    "razorpayOrderId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT,
    "amountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "method" TEXT,
    "errorCode" TEXT,
    "errorDescription" TEXT,
    "refundedPaise" INTEGER NOT NULL DEFAULT 0,
    "capturedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facilities" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "image" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "priceFrom" DECIMAL(10,2),
    "priceIncluded" BOOLEAN NOT NULL DEFAULT false,
    "priceNote" TEXT,
    "category" "ActivityCategory" NOT NULL,
    "images" JSONB NOT NULL DEFAULT '[]',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "places" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" "PlaceKind" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "distance" TEXT NOT NULL,
    "travelTime" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "image" JSONB NOT NULL,
    "directionsUrl" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gallery_images" (
    "id" UUID NOT NULL,
    "src" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "caption" TEXT,
    "credit" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gallery_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimonials" (
    "id" UUID NOT NULL,
    "quote" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "context" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_inquiries" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_authUserId_key" ON "admins"("authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "room_types_slug_key" ON "room_types"("slug");

-- CreateIndex
CREATE INDEX "room_types_isActive_sortOrder_idx" ON "room_types"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "rooms_roomTypeId_isActive_idx" ON "rooms"("roomTypeId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_roomTypeId_name_key" ON "rooms"("roomTypeId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "amenities_name_key" ON "amenities"("name");

-- CreateIndex
CREATE INDEX "room_type_amenities_amenityId_idx" ON "room_type_amenities"("amenityId");

-- CreateIndex
CREATE INDEX "pricing_rules_roomTypeId_isActive_startDate_endDate_idx" ON "pricing_rules"("roomTypeId", "isActive", "startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_code_key" ON "bookings"("code");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_accessTokenHash_key" ON "bookings"("accessTokenHash");

-- CreateIndex
CREATE INDEX "bookings_status_checkIn_idx" ON "bookings"("status", "checkIn");

-- CreateIndex
CREATE INDEX "bookings_checkIn_idx" ON "bookings"("checkIn");

-- CreateIndex
CREATE INDEX "bookings_checkOut_idx" ON "bookings"("checkOut");

-- CreateIndex
CREATE INDEX "bookings_guestEmail_idx" ON "bookings"("guestEmail");

-- CreateIndex
CREATE INDEX "bookings_createdAt_idx" ON "bookings"("createdAt");

-- CreateIndex
CREATE INDEX "reservations_roomId_checkIn_checkOut_idx" ON "reservations"("roomId", "checkIn", "checkOut");

-- CreateIndex
CREATE INDEX "reservations_status_holdExpiresAt_idx" ON "reservations"("status", "holdExpiresAt");

-- CreateIndex
CREATE INDEX "reservations_bookingId_idx" ON "reservations"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_razorpayOrderId_key" ON "payments"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_razorpayPaymentId_key" ON "payments"("razorpayPaymentId");

-- CreateIndex
CREATE INDEX "payments_bookingId_idx" ON "payments"("bookingId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "facilities_slug_key" ON "facilities"("slug");

-- CreateIndex
CREATE INDEX "facilities_isActive_sortOrder_idx" ON "facilities"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "activities_slug_key" ON "activities"("slug");

-- CreateIndex
CREATE INDEX "activities_isActive_sortOrder_idx" ON "activities"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "places_slug_key" ON "places"("slug");

-- CreateIndex
CREATE INDEX "places_kind_isActive_sortOrder_idx" ON "places"("kind", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "gallery_images_isActive_sortOrder_idx" ON "gallery_images"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "testimonials_isActive_sortOrder_idx" ON "testimonials"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "contact_inquiries_status_createdAt_idx" ON "contact_inquiries"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_type_amenities" ADD CONSTRAINT "room_type_amenities_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_type_amenities" ADD CONSTRAINT "room_type_amenities_amenityId_fkey" FOREIGN KEY ("amenityId") REFERENCES "amenities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ===========================================================================
-- Hand-written additions (Prisma cannot express these in schema.prisma)
-- ===========================================================================

-- 1. Double-booking protection -------------------------------------------------
-- btree_gist lets a GiST index combine "=" on roomId with "&&" (overlap) on dates.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- No two ACTIVE reservations for the same physical room may overlap.
-- Ranges are half-open [checkIn, checkOut): a guest checking out on the 12th
-- does not clash with a guest checking in on the 12th.
ALTER TABLE "reservations"
  ADD CONSTRAINT "reservations_no_overlap"
  EXCLUDE USING gist (
    "roomId" WITH =,
    daterange("checkIn", "checkOut", '[)') WITH &&
  ) WHERE ("status" IN ('HELD', 'CONFIRMED', 'BLOCKED'));

-- 2. Integrity checks -------------------------------------------------------------
ALTER TABLE "reservations"
  ADD CONSTRAINT "reservations_dates_check" CHECK ("checkOut" > "checkIn"),
  ADD CONSTRAINT "reservations_hold_check" CHECK ("status" <> 'HELD' OR "holdExpiresAt" IS NOT NULL),
  ADD CONSTRAINT "reservations_booking_link_check" CHECK (
    ("kind" = 'BOOKING' AND "bookingId" IS NOT NULL) OR ("kind" = 'BLOCK' AND "bookingId" IS NULL)
  );

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_dates_check" CHECK ("checkOut" > "checkIn"),
  ADD CONSTRAINT "bookings_nights_check" CHECK ("nights" = ("checkOut" - "checkIn")),
  ADD CONSTRAINT "bookings_guests_check" CHECK ("adults" >= 1 AND "children" >= 0),
  ADD CONSTRAINT "bookings_amounts_check" CHECK (
    "subtotal" >= 0 AND "taxAmount" >= 0 AND "totalAmount" >= 0
    AND "advanceAmount" >= 0 AND "balanceAmount" >= 0
    AND "advanceAmount" + "balanceAmount" = "totalAmount"
  ),
  ADD CONSTRAINT "bookings_advance_percent_check" CHECK ("advancePercent" BETWEEN 1 AND 100);

ALTER TABLE "room_types"
  ADD CONSTRAINT "room_types_price_check" CHECK ("basePrice" >= 0),
  ADD CONSTRAINT "room_types_occupancy_check" CHECK (
    "maxAdults" >= 1 AND "maxChildren" >= 0 AND "maxOccupancy" >= 1
    AND "maxOccupancy" <= "maxAdults" + "maxChildren"
  );

ALTER TABLE "pricing_rules"
  ADD CONSTRAINT "pricing_rules_dates_check" CHECK ("endDate" >= "startDate"),
  ADD CONSTRAINT "pricing_rules_price_check" CHECK ("pricePerNight" >= 0),
  ADD CONSTRAINT "pricing_rules_days_check" CHECK ("daysOfWeek" <@ ARRAY[0,1,2,3,4,5,6]);

ALTER TABLE "payments"
  ADD CONSTRAINT "payments_amount_check" CHECK ("amountPaise" > 0 AND "refundedPaise" >= 0 AND "refundedPaise" <= "amountPaise");

ALTER TABLE "site_settings"
  ADD CONSTRAINT "site_settings_singleton" CHECK ("id" = 1),
  ADD CONSTRAINT "site_settings_advance_check" CHECK ("advancePercent" BETWEEN 1 AND 100),
  ADD CONSTRAINT "site_settings_hold_check" CHECK ("holdMinutes" BETWEEN 5 AND 60),
  ADD CONSTRAINT "site_settings_tax_check" CHECK ("taxPercent" >= 0 AND "taxPercent" < 100),
  ADD CONSTRAINT "site_settings_nights_check" CHECK ("minNights" >= 1 AND "maxNights" >= "minNights"),
  ADD CONSTRAINT "site_settings_window_check" CHECK ("bookingWindowDays" >= 1);

-- 3. Row Level Security --------------------------------------------------------
-- Supabase exposes the public schema through its REST API using the public
-- "anon" key. Enabling RLS with NO policies means that API can read/write
-- nothing. The application connects as the table owner through Prisma, which
-- bypasses RLS, so it is unaffected.
ALTER TABLE "admins"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "site_settings"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "room_types"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rooms"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE "amenities"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "room_type_amenities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pricing_rules"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bookings"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reservations"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "webhook_events"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "facilities"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activities"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "places"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "gallery_images"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "testimonials"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contact_inquiries"   ENABLE ROW LEVEL SECURITY;
