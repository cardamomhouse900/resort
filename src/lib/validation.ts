import { z } from "zod";
import { isISODate } from "@/utils/dates";

/** Request schemas shared by API routes. All input is untrusted. */

const isoDate = z.string().refine(isISODate, "Use a valid date (YYYY-MM-DD).");
const slug = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9-]+$/, "Invalid room type.");

const stay = {
  checkIn: isoDate,
  checkOut: isoDate,
  adults: z.coerce.number().int().min(1, "At least one adult is required.").max(20),
  children: z.coerce.number().int().min(0).max(20).default(0),
};

export const availabilitySchema = z
  .object({ ...stay, roomType: slug.optional() })
  .refine((v) => v.checkOut > v.checkIn, {
    message: "Check-out must be after check-in.",
    path: ["checkOut"],
  });

export const bookingSchema = z
  .object({
    ...stay,
    roomType: slug,
    guest: z.object({
      name: z.string().trim().min(2, "Please enter your full name.").max(100),
      email: z
        .email("Please enter a valid email address.")
        .max(200)
        .transform((e) => e.toLowerCase()),
      phone: z
        .string()
        .trim()
        .regex(/^\+?[0-9][0-9\s-]{6,18}[0-9]$/, "Please enter a valid phone number."),
    }),
    specialRequests: z.string().trim().max(1000).optional(),
    /** Honeypot — real visitors never fill it. */
    website: z.string().max(0).optional(),
  })
  .refine((v) => v.checkOut > v.checkIn, {
    message: "Check-out must be after check-in.",
    path: ["checkOut"],
  });

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(100),
  email: z
    .email("Please enter a valid email address.")
    .max(200)
    .transform((e) => e.toLowerCase()),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^$|^\+?[0-9][0-9\s()-]{6,18}[0-9]$/, "Please enter a valid phone number.")
    .optional(),
  message: z.string().trim().min(10, "Please write a little more (at least 10 characters).").max(2000),
  /** Honeypot — if filled, the route pretends success without storing anything. */
  company: z.string().max(200).optional(),
});

export type AvailabilityRequest = z.infer<typeof availabilitySchema>;
export type BookingRequest = z.infer<typeof bookingSchema>;
export type ContactRequest = z.infer<typeof contactSchema>;
