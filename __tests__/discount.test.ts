import { describe, it, expect } from 'vitest';
import {
  Discount,
  isTimeInRange,
  getApplicableDiscount,
  calculateDiscountedPrice,
  getBestDiscount,
  isDiscountApplicableToSlot,
} from '../lib/discount';

// Test data
const mockDiscount: Discount = {
  id: 'discount-1',
  name: 'Off-Peak Special',
  discountPercent: 20,
  startTime: '10:00',
  endTime: '16:00',
  daysOfWeek: [1, 2, 3], // Mon, Tue, Wed
  serviceIds: ['service-1', 'service-2'],
  staffIds: [], // All staff
};

const mockDiscountWithStaff: Discount = {
  id: 'discount-2',
  name: 'Staff Special',
  discountPercent: 15,
  startTime: '09:00',
  endTime: '12:00',
  daysOfWeek: [4, 5], // Thu, Fri
  serviceIds: ['service-1'],
  staffIds: ['staff-1', 'staff-2'],
};

const mockDiscounts: Discount[] = [mockDiscount, mockDiscountWithStaff];

describe('isTimeInRange', () => {
  it('should return true when time is within range', () => {
    expect(isTimeInRange('12:00', '10:00', '16:00')).toBe(true);
    expect(isTimeInRange('10:00', '10:00', '16:00')).toBe(true);
    expect(isTimeInRange('15:59', '10:00', '16:00')).toBe(true);
  });

  it('should return false when time is outside range', () => {
    expect(isTimeInRange('09:59', '10:00', '16:00')).toBe(false);
    expect(isTimeInRange('16:00', '10:00', '16:00')).toBe(false); // End time is exclusive
    expect(isTimeInRange('18:00', '10:00', '16:00')).toBe(false);
  });

  it('should handle edge cases', () => {
    expect(isTimeInRange('00:00', '00:00', '23:59')).toBe(true);
    expect(isTimeInRange('23:58', '00:00', '23:59')).toBe(true);
    expect(isTimeInRange('23:59', '00:00', '23:59')).toBe(false); // End time is exclusive
  });
});

describe('calculateDiscountedPrice', () => {
  it('should calculate correct discounted price', () => {
    expect(calculateDiscountedPrice(100, mockDiscount)).toBe(80); // 20% off
    expect(calculateDiscountedPrice(50, mockDiscount)).toBe(40);
    expect(calculateDiscountedPrice(75.50, mockDiscount)).toBeCloseTo(60.40, 2);
  });

  it('should return original price when no discount', () => {
    expect(calculateDiscountedPrice(100, null)).toBe(100);
    expect(calculateDiscountedPrice(0, null)).toBe(0);
  });

  it('should handle 0% discount', () => {
    const zeroDiscount: Discount = { ...mockDiscount, discountPercent: 0 };
    expect(calculateDiscountedPrice(100, zeroDiscount)).toBe(100);
  });

  it('should handle 100% discount', () => {
    const fullDiscount: Discount = { ...mockDiscount, discountPercent: 100 };
    expect(calculateDiscountedPrice(100, fullDiscount)).toBe(0);
  });

  it('should handle invalid discount percent (negative)', () => {
    const invalidDiscount: Discount = { ...mockDiscount, discountPercent: -10 };
    expect(calculateDiscountedPrice(100, invalidDiscount)).toBe(100); // Should return original
  });

  it('should handle invalid discount percent (over 100)', () => {
    const invalidDiscount: Discount = { ...mockDiscount, discountPercent: 150 };
    expect(calculateDiscountedPrice(100, invalidDiscount)).toBe(100); // Should return original
  });

  it('should handle decimal prices correctly', () => {
    expect(calculateDiscountedPrice(29.99, mockDiscount)).toBeCloseTo(23.992, 2);
    expect(calculateDiscountedPrice(0.99, mockDiscount)).toBeCloseTo(0.792, 2);
  });
});

describe('getApplicableDiscount', () => {
  it('should return discount when all conditions match', () => {
    // Monday at 12:00
    const monday = new Date('2025-02-03'); // This is a Monday
    const result = getApplicableDiscount(mockDiscounts, 'service-1', monday, '12:00');
    expect(result).toEqual(mockDiscount);
  });

  it('should return null when service not included', () => {
    const monday = new Date('2025-02-03');
    const result = getApplicableDiscount(mockDiscounts, 'service-999', monday, '12:00');
    expect(result).toBeNull();
  });

  it('should return null when day not included', () => {
    const sunday = new Date('2025-02-02'); // Sunday
    const result = getApplicableDiscount(mockDiscounts, 'service-1', sunday, '12:00');
    expect(result).toBeNull();
  });

  it('should return null when time is outside range', () => {
    const monday = new Date('2025-02-03');
    const result = getApplicableDiscount(mockDiscounts, 'service-1', monday, '17:00');
    expect(result).toBeNull();
  });

  it('should filter by staff when staffIds is not empty', () => {
    const friday = new Date('2025-02-07'); // Friday

    // Should match with correct staff
    const resultWithStaff = getApplicableDiscount(mockDiscounts, 'service-1', friday, '10:00', 'staff-1');
    expect(resultWithStaff).toEqual(mockDiscountWithStaff);

    // Should not match with wrong staff
    const resultWrongStaff = getApplicableDiscount(mockDiscounts, 'service-1', friday, '10:00', 'staff-999');
    expect(resultWrongStaff).toBeNull();
  });

  it('should apply discount to all staff when staffIds is empty', () => {
    const monday = new Date('2025-02-03');

    // Should match any staff
    const result1 = getApplicableDiscount(mockDiscounts, 'service-1', monday, '12:00', 'staff-any');
    expect(result1).toEqual(mockDiscount);

    const result2 = getApplicableDiscount(mockDiscounts, 'service-1', monday, '12:00', 'staff-different');
    expect(result2).toEqual(mockDiscount);
  });

  it('should return null when no discounts exist', () => {
    const monday = new Date('2025-02-03');
    const result = getApplicableDiscount([], 'service-1', monday, '12:00');
    expect(result).toBeNull();
  });
});

describe('getBestDiscount', () => {
  it('should return the discount with highest percentage', () => {
    const discounts: Discount[] = [
      { ...mockDiscount, discountPercent: 10 },
      { ...mockDiscount, id: 'd2', discountPercent: 25 },
      { ...mockDiscount, id: 'd3', discountPercent: 15 },
    ];

    const result = getBestDiscount(discounts, 'service-1');
    expect(result?.discountPercent).toBe(25);
  });

  it('should return null when no discounts apply to service', () => {
    const result = getBestDiscount(mockDiscounts, 'service-999');
    expect(result).toBeNull();
  });

  it('should return null for empty discount array', () => {
    const result = getBestDiscount([], 'service-1');
    expect(result).toBeNull();
  });

  it('should only consider discounts for the specific service', () => {
    const discounts: Discount[] = [
      { ...mockDiscount, discountPercent: 50, serviceIds: ['other-service'] },
      { ...mockDiscount, id: 'd2', discountPercent: 20, serviceIds: ['service-1'] },
    ];

    const result = getBestDiscount(discounts, 'service-1');
    expect(result?.discountPercent).toBe(20);
  });
});

describe('isDiscountApplicableToSlot', () => {
  it('should return true when all conditions match', () => {
    const monday = new Date('2025-02-03');
    const result = isDiscountApplicableToSlot(mockDiscount, 'service-1', monday, '12:00');
    expect(result).toBe(true);
  });

  it('should return false when service does not match', () => {
    const monday = new Date('2025-02-03');
    const result = isDiscountApplicableToSlot(mockDiscount, 'service-999', monday, '12:00');
    expect(result).toBe(false);
  });

  it('should return false when day does not match', () => {
    const saturday = new Date('2025-02-08');
    const result = isDiscountApplicableToSlot(mockDiscount, 'service-1', saturday, '12:00');
    expect(result).toBe(false);
  });

  it('should return false when time is outside range', () => {
    const monday = new Date('2025-02-03');
    const result = isDiscountApplicableToSlot(mockDiscount, 'service-1', monday, '08:00');
    expect(result).toBe(false);
  });

  it('should check staff restriction correctly', () => {
    const friday = new Date('2025-02-07');

    // With matching staff
    expect(isDiscountApplicableToSlot(mockDiscountWithStaff, 'service-1', friday, '10:00', 'staff-1')).toBe(true);

    // With non-matching staff
    expect(isDiscountApplicableToSlot(mockDiscountWithStaff, 'service-1', friday, '10:00', 'staff-999')).toBe(false);

    // Without staff specified (should still work if staffIds is not empty - bug check)
    expect(isDiscountApplicableToSlot(mockDiscountWithStaff, 'service-1', friday, '10:00')).toBe(true);
  });
});

describe('Edge cases and potential bugs', () => {
  it('should handle midnight correctly', () => {
    const midnightDiscount: Discount = {
      ...mockDiscount,
      startTime: '00:00',
      endTime: '06:00',
    };

    expect(isTimeInRange('00:00', '00:00', '06:00')).toBe(true);
    expect(isTimeInRange('05:59', '00:00', '06:00')).toBe(true);
    expect(isTimeInRange('06:00', '00:00', '06:00')).toBe(false);
  });

  it('should handle very small prices', () => {
    expect(calculateDiscountedPrice(0.01, mockDiscount)).toBeCloseTo(0.008, 3);
  });

  it('should handle very large prices', () => {
    expect(calculateDiscountedPrice(10000, mockDiscount)).toBe(8000);
  });

  it('should handle Sunday (day 0) correctly', () => {
    const sundayDiscount: Discount = {
      ...mockDiscount,
      daysOfWeek: [0], // Sunday only
    };

    const sunday = new Date('2025-02-02'); // Sunday
    expect(sunday.getDay()).toBe(0);

    const result = getApplicableDiscount([sundayDiscount], 'service-1', sunday, '12:00');
    expect(result).toEqual(sundayDiscount);
  });

  it('should handle Saturday (day 6) correctly', () => {
    const saturdayDiscount: Discount = {
      ...mockDiscount,
      daysOfWeek: [6], // Saturday only
    };

    const saturday = new Date('2025-02-08'); // Saturday
    expect(saturday.getDay()).toBe(6);

    const result = getApplicableDiscount([saturdayDiscount], 'service-1', saturday, '12:00');
    expect(result).toEqual(saturdayDiscount);
  });

  it('should return first matching discount when multiple apply', () => {
    const discount1: Discount = { ...mockDiscount, id: 'd1', discountPercent: 10 };
    const discount2: Discount = { ...mockDiscount, id: 'd2', discountPercent: 20 };

    const monday = new Date('2025-02-03');
    const result = getApplicableDiscount([discount1, discount2], 'service-1', monday, '12:00');

    // Should return first matching (not necessarily highest)
    expect(result?.id).toBe('d1');
  });
});
