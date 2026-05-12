/**
 * Weekly Vehicle Leasing Platform - Validation Tests
 * Salvage-to-Lux Fleet Management
 *
 * Unit tests for form validation utilities.
 */

import {
  required,
  minLength,
  maxLength,
  email,
  phone,
  zipCode,
  state,
  url,
  numeric,
  currency,
  dateFormat,
  futureDate,
  pastDate,
  minValue,
  maxValue,
  pattern,
  licenseNumber,
  match,
  validateField,
  validateForm,
} from '@/lib/validation';

describe('Validation Rules', () => {
  describe('required', () => {
    const rule = required();

    it('should fail for empty string', () => {
      expect(rule.validate('')).toBe(false);
    });

    it('should fail for whitespace only', () => {
      expect(rule.validate('   ')).toBe(false);
    });

    it('should fail for undefined', () => {
      expect(rule.validate(undefined as any)).toBe(false);
    });

    it('should fail for null', () => {
      expect(rule.validate(null as any)).toBe(false);
    });

    it('should pass for non-empty string', () => {
      expect(rule.validate('hello')).toBe(true);
    });

    it('should use custom message', () => {
      const customRule = required('Name is required');
      expect(customRule.message).toBe('Name is required');
    });
  });

  describe('minLength', () => {
    const rule = minLength(3);

    it('should pass for empty string (optional field)', () => {
      expect(rule.validate('')).toBe(true);
    });

    it('should fail for string shorter than min', () => {
      expect(rule.validate('ab')).toBe(false);
    });

    it('should pass for string equal to min', () => {
      expect(rule.validate('abc')).toBe(true);
    });

    it('should pass for string longer than min', () => {
      expect(rule.validate('abcd')).toBe(true);
    });
  });

  describe('maxLength', () => {
    const rule = maxLength(5);

    it('should pass for empty string', () => {
      expect(rule.validate('')).toBe(true);
    });

    it('should pass for string shorter than max', () => {
      expect(rule.validate('abc')).toBe(true);
    });

    it('should pass for string equal to max', () => {
      expect(rule.validate('abcde')).toBe(true);
    });

    it('should fail for string longer than max', () => {
      expect(rule.validate('abcdef')).toBe(false);
    });
  });

  describe('email', () => {
    const rule = email();

    it('should pass for empty string (optional field)', () => {
      expect(rule.validate('')).toBe(true);
    });

    it('should pass for valid email', () => {
      expect(rule.validate('test@example.com')).toBe(true);
      expect(rule.validate('user.name@domain.org')).toBe(true);
      expect(rule.validate('user+tag@example.co.uk')).toBe(true);
    });

    it('should fail for invalid email', () => {
      expect(rule.validate('invalid')).toBe(false);
      expect(rule.validate('invalid@')).toBe(false);
      expect(rule.validate('@example.com')).toBe(false);
      expect(rule.validate('user@.com')).toBe(false);
    });
  });

  describe('phone', () => {
    const rule = phone();

    it('should pass for empty string (optional field)', () => {
      expect(rule.validate('')).toBe(true);
    });

    it('should pass for valid phone formats', () => {
      expect(rule.validate('1234567890')).toBe(true);
      expect(rule.validate('123-456-7890')).toBe(true);
      expect(rule.validate('(123) 456-7890')).toBe(true);
      expect(rule.validate('123.456.7890')).toBe(true);
    });

    it('should fail for invalid phone', () => {
      expect(rule.validate('123')).toBe(false);
      expect(rule.validate('abc-def-ghij')).toBe(false);
    });
  });

  describe('zipCode', () => {
    const rule = zipCode();

    it('should pass for valid 5-digit zip', () => {
      expect(rule.validate('12345')).toBe(true);
    });

    it('should pass for valid ZIP+4', () => {
      expect(rule.validate('12345-6789')).toBe(true);
    });

    it('should fail for invalid zip', () => {
      expect(rule.validate('1234')).toBe(false);
      expect(rule.validate('123456')).toBe(false);
      expect(rule.validate('abcde')).toBe(false);
    });
  });

  describe('state', () => {
    const rule = state();

    it('should pass for valid state codes', () => {
      expect(rule.validate('CA')).toBe(true);
      expect(rule.validate('NY')).toBe(true);
      expect(rule.validate('tx')).toBe(true); // Case insensitive
    });

    it('should fail for invalid state codes', () => {
      expect(rule.validate('California')).toBe(false);
      expect(rule.validate('C')).toBe(false);
      expect(rule.validate('CAL')).toBe(false);
    });
  });

  describe('url', () => {
    const rule = url();

    it('should pass for valid URLs', () => {
      expect(rule.validate('https://example.com')).toBe(true);
      expect(rule.validate('http://example.com/path')).toBe(true);
      expect(rule.validate('https://sub.example.com:8080/path?query=1')).toBe(true);
    });

    it('should fail for invalid URLs', () => {
      expect(rule.validate('example.com')).toBe(false);
      expect(rule.validate('ftp://example.com')).toBe(false);
      expect(rule.validate('not a url')).toBe(false);
    });
  });

  describe('numeric', () => {
    const rule = numeric();

    it('should pass for numeric strings', () => {
      expect(rule.validate('123')).toBe(true);
      expect(rule.validate('0')).toBe(true);
      expect(rule.validate('9999999')).toBe(true);
    });

    it('should fail for non-numeric strings', () => {
      expect(rule.validate('12.34')).toBe(false);
      expect(rule.validate('-123')).toBe(false);
      expect(rule.validate('abc')).toBe(false);
    });
  });

  describe('currency', () => {
    const rule = currency();

    it('should pass for valid currency amounts', () => {
      expect(rule.validate('100')).toBe(true);
      expect(rule.validate('100.00')).toBe(true);
      expect(rule.validate('100.5')).toBe(true);
      expect(rule.validate('0.99')).toBe(true);
    });

    it('should fail for invalid currency amounts', () => {
      expect(rule.validate('100.999')).toBe(false);
      expect(rule.validate('-100')).toBe(false);
      expect(rule.validate('$100')).toBe(false);
    });
  });

  describe('dateFormat', () => {
    const rule = dateFormat();

    it('should pass for valid date format', () => {
      expect(rule.validate('2024-01-15')).toBe(true);
      expect(rule.validate('2023-12-31')).toBe(true);
    });

    it('should fail for invalid date format', () => {
      expect(rule.validate('01-15-2024')).toBe(false);
      expect(rule.validate('2024/01/15')).toBe(false);
      expect(rule.validate('Jan 15, 2024')).toBe(false);
    });
  });

  describe('futureDate', () => {
    const rule = futureDate();

    it('should pass for future date', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      expect(rule.validate(futureDate.toISOString().split('T')[0])).toBe(true);
    });

    it('should fail for past date', () => {
      expect(rule.validate('2020-01-01')).toBe(false);
    });
  });

  describe('pastDate', () => {
    const rule = pastDate();

    it('should pass for past date', () => {
      expect(rule.validate('2020-01-01')).toBe(true);
    });

    it('should fail for future date', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      expect(rule.validate(futureDate.toISOString().split('T')[0])).toBe(false);
    });
  });

  describe('minValue', () => {
    const rule = minValue(10);

    it('should pass for values >= min', () => {
      expect(rule.validate('10')).toBe(true);
      expect(rule.validate('100')).toBe(true);
    });

    it('should fail for values < min', () => {
      expect(rule.validate('5')).toBe(false);
      expect(rule.validate('9.99')).toBe(false);
    });
  });

  describe('maxValue', () => {
    const rule = maxValue(100);

    it('should pass for values <= max', () => {
      expect(rule.validate('100')).toBe(true);
      expect(rule.validate('50')).toBe(true);
    });

    it('should fail for values > max', () => {
      expect(rule.validate('101')).toBe(false);
      expect(rule.validate('1000')).toBe(false);
    });
  });

  describe('pattern', () => {
    const rule = pattern(/^[A-Z]{3}$/);

    it('should pass for matching pattern', () => {
      expect(rule.validate('ABC')).toBe(true);
      expect(rule.validate('XYZ')).toBe(true);
    });

    it('should fail for non-matching pattern', () => {
      expect(rule.validate('abc')).toBe(false);
      expect(rule.validate('ABCD')).toBe(false);
      expect(rule.validate('AB')).toBe(false);
    });
  });

  describe('licenseNumber', () => {
    const rule = licenseNumber();

    it('should pass for valid license numbers', () => {
      expect(rule.validate('ABC123')).toBe(true);
      expect(rule.validate('12345ABCDE')).toBe(true);
    });

    it('should fail for invalid license numbers', () => {
      expect(rule.validate('AB')).toBe(false);
      expect(rule.validate('ABC-123')).toBe(false);
    });
  });

  describe('match', () => {
    it('should pass when values match', () => {
      const rule = match('password123');
      expect(rule.validate('password123')).toBe(true);
    });

    it('should fail when values do not match', () => {
      const rule = match('password123');
      expect(rule.validate('password456')).toBe(false);
    });
  });
});

describe('validateField', () => {
  it('should return error message for first failing rule', () => {
    const result = validateField('', [required(), minLength(3)]);
    expect(result).toBe('This field is required');
  });

  it('should return null for valid field', () => {
    const result = validateField('hello@example.com', [required(), email()]);
    expect(result).toBeNull();
  });

  it('should validate multiple rules in order', () => {
    const result = validateField('ab', [required(), minLength(3)]);
    expect(result).toBe('Must be at least 3 characters');
  });
});

describe('validateForm', () => {
  it('should return empty errors for valid form', () => {
    const result = validateForm({
      email: { value: 'test@example.com', rules: [required(), email()] },
      name: { value: 'John', rules: [required(), minLength(2)] },
    });

    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it('should return errors for invalid fields', () => {
    const result = validateForm({
      email: { value: '', rules: [required(), email()] },
      name: { value: 'J', rules: [required(), minLength(2)] },
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBe('This field is required');
    expect(result.errors.name).toBe('Must be at least 2 characters');
  });

  it('should only return first error per field', () => {
    const result = validateForm({
      email: { value: '', rules: [required(), email(), minLength(5)] },
    });

    expect(result.errors.email).toBe('This field is required');
  });
});
