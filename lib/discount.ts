/**
 * Discount calculation utilities
 */

export type Discount = {
  id: string;
  name: string;
  discountPercent: number;
  startTime: string;  // "HH:MM" format
  endTime: string;    // "HH:MM" format
  daysOfWeek: number[];  // 0=Sunday, 1=Monday, ..., 6=Saturday
  serviceIds: string[];
  staffIds: string[];  // Empty array means all staff
};

/**
 * Check if a time is within a range (HH:MM format)
 */
export function isTimeInRange(time: string, startTime: string, endTime: string): boolean {
  // Convert to minutes for comparison
  const toMinutes = (t: string) => {
    const [hours, mins] = t.split(':').map(Number);
    return hours * 60 + mins;
  };

  const timeMinutes = toMinutes(time);
  const startMinutes = toMinutes(startTime);
  const endMinutes = toMinutes(endTime);

  return timeMinutes >= startMinutes && timeMinutes < endMinutes;
}

/**
 * Get the applicable discount for a service at a specific date/time
 */
export function getApplicableDiscount(
  discounts: Discount[],
  serviceId: string,
  date: Date,
  time: string,
  staffId?: string
): Discount | null {
  if (!discounts.length) return null;

  const dayOfWeek = date.getDay();

  for (const discount of discounts) {
    // Check if service is included
    if (!discount.serviceIds.includes(serviceId)) continue;

    // Check if day is included
    if (!discount.daysOfWeek.includes(dayOfWeek)) continue;

    // Check if time is within range
    if (!isTimeInRange(time, discount.startTime, discount.endTime)) continue;

    // Check if staff matches (empty staffIds means all staff)
    if (staffId && discount.staffIds.length > 0 && !discount.staffIds.includes(staffId)) continue;

    return discount;
  }

  return null;
}

/**
 * Calculate the discounted price
 */
export function calculateDiscountedPrice(originalPrice: number, discount: Discount | null): number {
  if (!discount) return originalPrice;
  if (discount.discountPercent < 0 || discount.discountPercent > 100) {
    // Invalid discount percent, return original price
    return originalPrice;
  }
  return originalPrice * (1 - discount.discountPercent / 100);
}

/**
 * Get the best (highest) discount for a service from multiple discounts
 */
export function getBestDiscount(discounts: Discount[], serviceId: string): Discount | null {
  const applicableDiscounts = discounts.filter(d => d.serviceIds.includes(serviceId));
  if (applicableDiscounts.length === 0) return null;

  return applicableDiscounts.reduce((max, d) =>
    d.discountPercent > max.discountPercent ? d : max
  );
}

/**
 * Format discount percentage for display
 */
export function formatDiscountLabel(discount: Discount): string {
  return `${discount.discountPercent}% OFF`;
}

/**
 * Check if a discount applies to a specific slot
 */
export function isDiscountApplicableToSlot(
  discount: Discount,
  serviceId: string,
  date: Date,
  time: string,
  staffId?: string
): boolean {
  // Check service
  if (!discount.serviceIds.includes(serviceId)) return false;

  // Check day
  if (!discount.daysOfWeek.includes(date.getDay())) return false;

  // Check time
  if (!isTimeInRange(time, discount.startTime, discount.endTime)) return false;

  // Check staff (empty means all staff)
  if (staffId && discount.staffIds.length > 0 && !discount.staffIds.includes(staffId)) return false;

  return true;
}
