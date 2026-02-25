import { z } from "zod";
import { NextResponse } from "next/server";

// ============================================================================
// Common validators
// ============================================================================

// UK phone regex - supports mobile and landline
const ukPhoneRegex = /^(\+44|0)?\s?7\d{3}\s?\d{6}$|^(\+44|0)?\s?[1-9]\d{2,4}\s?\d{5,6}$/;

// CUID/UUID ID format
const idSchema = z.string().min(10).max(50).regex(/^[a-zA-Z0-9_-]+$/);

// Time format HH:MM
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (use HH:MM)");

// Date format YYYY-MM-DD (accepts empty string as null)
const dateOnlySchema = z.string()
  .transform(v => v === "" ? null : v)
  .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (use YYYY-MM-DD)").nullable());

// ============================================================================
// Auth Schemas
// ============================================================================

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address").max(254).transform(v => v.toLowerCase().trim()),
  password: z.string().min(1, "Password is required"),
}).strict();

export const SignupSchema = z.object({
  email: z.string().email("Invalid email address").max(254).transform(v => v.toLowerCase().trim()),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name is too long").trim(),
  salonName: z.string().min(2, "Salon name must be at least 2 characters").max(100, "Salon name is too long").trim(),
}).strict();

export const ForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address").max(254).transform(v => v.toLowerCase().trim()),
}).strict();

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
}).strict();

export const LegacyAuthSchema = z.object({
  password: z.string().min(1, "Password is required"),
}).strict();

// ============================================================================
// Booking Schema (Public)
// ============================================================================

export const BookingSchema = z.object({
  customerName: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long")
    .trim(),
  customerEmail: z.string()
    .email("Invalid email address")
    .max(254)
    .transform(v => v.toLowerCase().trim()),
  customerPhone: z.string()
    .regex(ukPhoneRegex, "Invalid UK phone number format")
    .transform(v => v.replace(/\s/g, "")),
  serviceId: idSchema,
  serviceIds: z.array(idSchema).optional(),
  staffId: idSchema,
  startTime: z.string().datetime({ message: "Invalid date/time format" }),
  totalDuration: z.number().int().positive().optional(),
  notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
}).strict();

// ============================================================================
// Slot Reservation Schema
// ============================================================================

export const SlotReservationSchema = z.object({
  staffId: idSchema,
  startTime: z.string().datetime({ message: "Invalid start time format" }),
  endTime: z.string().datetime({ message: "Invalid end time format" }),
  sessionId: z.string().min(1, "Session ID is required"),
}).strict();

// ============================================================================
// Admin Staff Schemas
// ============================================================================

export const CreateStaffSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name is too long").trim(),
  role: z.string().max(100).optional().nullable(),
  active: z.boolean().optional(),
}).strict();

export const UpdateStaffSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name is too long").trim().optional(),
  role: z.string().max(100).optional().nullable(),
  active: z.boolean().optional(),
}).strict();

// ============================================================================
// Admin Service Schemas
// ============================================================================

export const CreateServiceSchema = z.object({
  name: z.string().min(1, "Service name is required").max(100, "Name is too long").trim(),
  description: z.string().max(500).optional().nullable(),
  durationMinutes: z.union([z.number(), z.string()]).transform(v => parseInt(String(v))).pipe(z.number().int().min(5, "Duration must be at least 5 minutes").max(480, "Duration cannot exceed 8 hours")),
  price: z.union([z.number(), z.string()]).transform(v => parseFloat(String(v))).pipe(z.number().min(0, "Price cannot be negative")),
  categoryId: z.string().optional().nullable(),
}).strict();

export const UpdateServiceSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).optional().nullable(),
  durationMinutes: z.union([z.number(), z.string()]).transform(v => parseInt(String(v))).pipe(z.number().int().min(5).max(480)).optional(),
  price: z.union([z.number(), z.string()]).transform(v => parseFloat(String(v))).pipe(z.number().min(0)).optional(),
  categoryId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
}).strict();

export const ReorderServicesSchema = z.object({
  serviceIds: z.array(idSchema).min(1, "At least one service ID is required"),
}).strict();

export const ApplyTemplateSchema = z.object({
  templateId: z.string().min(1, "Template ID is required"),
}).strict();

// ============================================================================
// Admin Category Schemas
// ============================================================================

export const CreateCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(100, "Name is too long").trim(),
  description: z.string().max(500).optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
}).strict();

export const UpdateCategorySchema = z.object({
  id: idSchema.optional(), // Some routes pass id in body
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
}).strict();

// ============================================================================
// Admin Discount Schemas
// ============================================================================

export const CreateDiscountSchema = z.object({
  name: z.string().min(1, "Discount name is required").max(100, "Name is too long").trim(),
  discountPercent: z.union([z.number(), z.string()]).transform(v => parseInt(String(v))).pipe(z.number().int().min(1, "Discount must be at least 1%").max(100, "Discount cannot exceed 100%")),
  startTime: timeSchema,
  endTime: timeSchema,
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1, "At least one day must be selected"),
  serviceIds: z.array(idSchema).min(1, "At least one service must be selected"),
  staffIds: z.array(idSchema).optional(),
  isActive: z.boolean().optional(),
  validFrom: dateOnlySchema.optional(),
  validUntil: dateOnlySchema.optional(),
}).strict();

export const UpdateDiscountSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  discountPercent: z.union([z.number(), z.string()]).transform(v => parseInt(String(v))).pipe(z.number().int().min(1).max(100)).optional(),
  startTime: timeSchema.optional(),
  endTime: timeSchema.optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  serviceIds: z.array(idSchema).optional(),
  staffIds: z.array(idSchema).optional(),
  isActive: z.boolean().optional(),
  validFrom: dateOnlySchema.optional(),
  validUntil: dateOnlySchema.optional(),
}).strict();

// ============================================================================
// Admin Extras Schemas
// ============================================================================

export const CreateExtraSchema = z.object({
  name: z.string().min(1, "Extra name is required").max(100, "Name is too long").trim(),
  price: z.union([z.number(), z.string()]).transform(v => parseFloat(String(v))).pipe(z.number().min(0, "Price cannot be negative")),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
}).strict();

export const UpdateExtraSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  price: z.union([z.number(), z.string()]).transform(v => parseFloat(String(v))).pipe(z.number().min(0)).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
}).strict();

// ============================================================================
// Admin Working Hours Schemas
// ============================================================================

export const WorkingHoursSchema = z.object({
  staffId: idSchema,
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: timeSchema.optional(),
  endTime: timeSchema.optional(),
  isWorking: z.boolean().optional(),
}).strict();

export const BulkWorkingHoursSchema = z.object({
  staffId: idSchema.optional(),
  applyToAll: z.boolean().optional(),
  hours: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: timeSchema,
    endTime: timeSchema,
    isWorking: z.boolean(),
  })),
}).strict();

// ============================================================================
// Admin Schedule Override Schemas
// ============================================================================

export const CreateScheduleOverrideSchema = z.object({
  staffId: idSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (use YYYY-MM-DD)"),
  isDayOff: z.boolean().optional(),
  startTime: timeSchema.optional().nullable(),
  endTime: timeSchema.optional().nullable(),
  note: z.string().max(500).optional().nullable(),
}).strict();

export const UpdateScheduleOverrideSchema = z.object({
  id: idSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  isDayOff: z.boolean().optional(),
  startTime: timeSchema.optional().nullable(),
  endTime: timeSchema.optional().nullable(),
  note: z.string().max(500).optional().nullable(),
}).strict();

// ============================================================================
// Admin Salon Hours Schemas
// ============================================================================

export const SalonHoursSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: timeSchema.optional(),
  endTime: timeSchema.optional(),
  isOpen: z.boolean().optional(),
}).strict();

export const BulkSalonHoursSchema = z.object({
  hours: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: timeSchema,
    endTime: timeSchema,
    isOpen: z.boolean(),
  })),
}).strict();

// ============================================================================
// Admin Staff Services Schema
// ============================================================================

export const StaffServicesSchema = z.object({
  staffId: idSchema,
  serviceId: idSchema.optional(),
  serviceIds: z.array(idSchema).optional(),
}).strict();

// ============================================================================
// Booking Policy Schema
// ============================================================================

export const BookingPolicySchema = z.object({
  title: z.string().max(200).optional(),
  policies: z.array(z.object({
    icon: z.string().max(10).optional(),
    title: z.string().max(100),
    description: z.string().max(500),
  })).optional(),
}).strict();

// ============================================================================
// Settings Schema
// ============================================================================

export const SettingsSchema = z.object({
  salonName: z.string().min(2, "Salon name must be at least 2 characters").max(100, "Salon name is too long").trim().optional(),
  salonSlug: z.string()
    .transform(v => v === "" ? undefined : v)
    .pipe(z.string().min(3, "Booking URL must be at least 3 characters").max(50).regex(/^[a-z0-9-]+$/, "Booking URL can only contain lowercase letters, numbers, and hyphens").optional()),
  salonPhone: z.string().max(20).optional().nullable(),
  salonAddress: z.string().max(200).optional().nullable(),
  cancelMinutesAdvance: z.number().int().min(0).optional(),
}).strict();

// ============================================================================
// Appointment Management Schemas
// ============================================================================

export const UpdateAppointmentSchema = z.object({
  serviceId: idSchema.optional(),
  staffId: idSchema.optional(),
  startTime: z.string().datetime().optional(),
  status: z.enum(["confirmed", "cancelled", "no-show", "completed"]).optional(),
}).strict();

export const ManageAppointmentSchema = z.object({
  id: idSchema.optional(),
  token: z.string().optional(),
  status: z.enum(["confirmed", "cancelled", "noshow", "completed"]).optional(),
  startTime: z.string().datetime().optional(),
}).strict();

// ============================================================================
// Receipt Schema
// ============================================================================

export const SendReceiptSchema = z.object({
  customerEmail: z.string().email("Invalid email address"),
  customerName: z.string().max(100).optional(),
  pdfBase64: z.string().min(1, "PDF data is required"),
  receiptNumber: z.string().min(1, "Receipt number is required"),
}).strict();

// ============================================================================
// Helper function to validate request body
// ============================================================================

type ZodSchema = z.ZodTypeAny;

export function validateBody<T extends ZodSchema>(
  schema: T,
  body: unknown
): { success: true; data: z.infer<T> } | { success: false; response: NextResponse } {
  const result = schema.safeParse(body);

  if (!result.success) {
    const firstError = result.error.issues[0];
    const field = firstError.path.join(".");
    const message = field ? `${field}: ${firstError.message}` : firstError.message;

    return {
      success: false,
      response: NextResponse.json(
        { error: message },
        { status: 400 }
      ),
    };
  }

  return { success: true, data: result.data };
}

// Export types for use in routes
export type LoginInput = z.infer<typeof LoginSchema>;
export type SignupInput = z.infer<typeof SignupSchema>;
export type BookingInput = z.infer<typeof BookingSchema>;
export type CreateStaffInput = z.infer<typeof CreateStaffSchema>;
export type CreateServiceInput = z.infer<typeof CreateServiceSchema>;
export type CreateDiscountInput = z.infer<typeof CreateDiscountSchema>;
export type CreateExtraInput = z.infer<typeof CreateExtraSchema>;
export type SettingsInput = z.infer<typeof SettingsSchema>;
