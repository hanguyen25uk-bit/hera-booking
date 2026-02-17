// Input validation and sanitization utilities

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitized?: string;
}

export function validateEmail(email: string): ValidationResult {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' };
  }
  const sanitized = email.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(sanitized)) {
    return { isValid: false, error: 'Invalid email format' };
  }
  if (sanitized.length > 254) {
    return { isValid: false, error: 'Email is too long' };
  }
  return { isValid: true, sanitized };
}

export function validatePhone(phone: string): ValidationResult {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, error: 'Phone number is required' };
  }
  const sanitized = phone.replace(/[\s\-\(\)]/g, '');
  const ukMobileRegex = /^(\+44|44|0)?7\d{9}$/;
  const ukLandlineRegex = /^(\+44|44|0)?[1-9]\d{8,9}$/;
  const vnRegex = /^(\+84|84|0)?(3|5|7|8|9)\d{8}$/;
  const internationalRegex = /^\+\d{10,15}$/;
  if (ukMobileRegex.test(sanitized) || ukLandlineRegex.test(sanitized) || vnRegex.test(sanitized) || internationalRegex.test(sanitized)) {
    return { isValid: true, sanitized };
  }
  return { isValid: false, error: 'Invalid phone number format' };
}

export function validateName(name: string): ValidationResult {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Name is required' };
  }
  const sanitized = name.trim();
  if (sanitized.length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters' };
  }
  if (sanitized.length > 100) {
    return { isValid: false, error: 'Name is too long' };
  }
  // Allow letters, spaces, hyphens, apostrophes, and Vietnamese characters
  const nameRegex = /^[a-zA-ZÀ-ỹ\s\-'0-9]+$/;
  if (!nameRegex.test(sanitized)) {
    return { isValid: false, error: 'Name contains invalid characters' };
  }
  return { isValid: true, sanitized };
}

export function validateId(id: string): ValidationResult {
  if (!id || typeof id !== 'string') {
    return { isValid: false, error: 'ID is required' };
  }
  // Accept both UUID and CUID formats
  const trimmed = id.trim();
  if (trimmed.length < 10 || trimmed.length > 50) {
    return { isValid: false, error: 'Invalid ID format' };
  }
  // Basic alphanumeric check (cuid uses alphanumeric)
  const idRegex = /^[a-zA-Z0-9_-]+$/;
  if (!idRegex.test(trimmed)) {
    return { isValid: false, error: 'Invalid ID format' };
  }
  return { isValid: true, sanitized: trimmed };
}

export function validateDateTime(dateTime: string): ValidationResult {
  if (!dateTime || typeof dateTime !== 'string') {
    return { isValid: false, error: 'Date/time is required' };
  }
  const date = new Date(dateTime);
  if (isNaN(date.getTime())) {
    return { isValid: false, error: 'Invalid date/time format' };
  }
  const now = new Date();
  now.setMinutes(now.getMinutes() - 5);
  if (date < now) {
    return { isValid: false, error: 'Cannot book appointments in the past' };
  }
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 6);
  if (date > maxDate) {
    return { isValid: false, error: 'Cannot book appointments more than 6 months in advance' };
  }
  return { isValid: true, sanitized: date.toISOString() };
}

export interface BookingInput {
  serviceId: string;
  serviceIds?: string[];
  staffId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  startTime: string;
  totalDuration?: number;
}

export interface BookingValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  sanitized?: BookingInput;
}

export function validateBookingInput(input: Partial<BookingInput>): BookingValidationResult {
  const errors: Record<string, string> = {};

  // Support both single serviceId and multiple serviceIds
  const serviceIds = input.serviceIds || (input.serviceId ? [input.serviceId] : []);
  if (serviceIds.length === 0) {
    errors.serviceId = 'At least one service is required';
  } else {
    for (const id of serviceIds) {
      const validation = validateId(id);
      if (!validation.isValid) {
        errors.serviceId = validation.error!;
        break;
      }
    }
  }

  const staffValidation = validateId(input.staffId || '');
  if (!staffValidation.isValid) errors.staffId = staffValidation.error!;

  const nameValidation = validateName(input.customerName || '');
  if (!nameValidation.isValid) errors.customerName = nameValidation.error!;

  const phoneValidation = validatePhone(input.customerPhone || '');
  if (!phoneValidation.isValid) errors.customerPhone = phoneValidation.error!;

  const emailValidation = validateEmail(input.customerEmail || '');
  if (!emailValidation.isValid) errors.customerEmail = emailValidation.error!;

  const dateTimeValidation = validateDateTime(input.startTime || '');
  if (!dateTimeValidation.isValid) errors.startTime = dateTimeValidation.error!;

  if (Object.keys(errors).length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: {},
    sanitized: {
      serviceId: serviceIds[0], // Primary service (first selected)
      serviceIds: serviceIds,
      staffId: staffValidation.sanitized!,
      customerName: nameValidation.sanitized!,
      customerPhone: phoneValidation.sanitized!,
      customerEmail: emailValidation.sanitized!,
      startTime: dateTimeValidation.sanitized!,
      totalDuration: input.totalDuration,
    },
  };
}
