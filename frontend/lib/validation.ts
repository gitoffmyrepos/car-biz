/**
 * Weekly Vehicle Leasing Platform - Form Validation Utilities
 * Salvage-to-Lux Fleet Management
 *
 * Client-side form validation with comprehensive rules and error messages.
 */

// Validation rule types
export type ValidationRule<T = string> = {
  validate: (value: T) => boolean;
  message: string;
};

export type FieldValidation = {
  value: string;
  rules: ValidationRule[];
};

export type ValidationErrors = Record<string, string>;
export type ValidationResult = {
  isValid: boolean;
  errors: ValidationErrors;
};

// Common validation patterns
const patterns = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/,
  zipCode: /^\d{5}(-\d{4})?$/,
  state: /^[A-Z]{2}$/i,
  url: /^https?:\/\/.+/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  numeric: /^\d+$/,
  currency: /^\d+(\.\d{1,2})?$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
  licenseNumber: /^[A-Z0-9]{5,20}$/i,
};

// ============================================
// Built-in Validation Rules
// ============================================

/**
 * Required field validation
 */
export const required = (message = 'This field is required'): ValidationRule => ({
  validate: (value: string) => value !== undefined && value !== null && value.trim() !== '',
  message,
});

/**
 * Minimum length validation
 */
export const minLength = (min: number, message?: string): ValidationRule => ({
  validate: (value: string) => !value || value.length >= min,
  message: message || `Must be at least ${min} characters`,
});

/**
 * Maximum length validation
 */
export const maxLength = (max: number, message?: string): ValidationRule => ({
  validate: (value: string) => !value || value.length <= max,
  message: message || `Must be no more than ${max} characters`,
});

/**
 * Email format validation
 */
export const email = (message = 'Please enter a valid email address'): ValidationRule => ({
  validate: (value: string) => !value || patterns.email.test(value),
  message,
});

/**
 * Phone number validation (US format)
 */
export const phone = (message = 'Please enter a valid phone number'): ValidationRule => ({
  validate: (value: string) => !value || patterns.phone.test(value.replace(/\s/g, '')),
  message,
});

/**
 * ZIP code validation (US format)
 */
export const zipCode = (message = 'Please enter a valid ZIP code'): ValidationRule => ({
  validate: (value: string) => !value || patterns.zipCode.test(value),
  message,
});

/**
 * US state abbreviation validation
 */
export const state = (message = 'Please enter a valid 2-letter state code'): ValidationRule => ({
  validate: (value: string) => !value || patterns.state.test(value),
  message,
});

/**
 * URL format validation
 */
export const url = (message = 'Please enter a valid URL'): ValidationRule => ({
  validate: (value: string) => !value || patterns.url.test(value),
  message,
});

/**
 * Numeric value validation
 */
export const numeric = (message = 'Please enter a numeric value'): ValidationRule => ({
  validate: (value: string) => !value || patterns.numeric.test(value),
  message,
});

/**
 * Currency format validation
 */
export const currency = (message = 'Please enter a valid amount'): ValidationRule => ({
  validate: (value: string) => !value || patterns.currency.test(value),
  message,
});

/**
 * Date format validation (YYYY-MM-DD)
 */
export const dateFormat = (message = 'Please enter a valid date (YYYY-MM-DD)'): ValidationRule => ({
  validate: (value: string) => !value || patterns.date.test(value),
  message,
});

/**
 * Date is in the future validation
 */
export const futureDate = (message = 'Date must be in the future'): ValidationRule => ({
  validate: (value: string) => {
    if (!value) return true;
    const inputDate = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return inputDate > today;
  },
  message,
});

/**
 * Date is in the past validation
 */
export const pastDate = (message = 'Date must be in the past'): ValidationRule => ({
  validate: (value: string) => {
    if (!value) return true;
    const inputDate = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return inputDate < today;
  },
  message,
});

/**
 * Minimum value validation (for numeric strings)
 */
export const minValue = (min: number, message?: string): ValidationRule => ({
  validate: (value: string) => !value || parseFloat(value) >= min,
  message: message || `Value must be at least ${min}`,
});

/**
 * Maximum value validation (for numeric strings)
 */
export const maxValue = (max: number, message?: string): ValidationRule => ({
  validate: (value: string) => !value || parseFloat(value) <= max,
  message: message || `Value must be no more than ${max}`,
});

/**
 * Pattern match validation
 */
export const pattern = (regex: RegExp, message: string): ValidationRule => ({
  validate: (value: string) => !value || regex.test(value),
  message,
});

/**
 * Driver's license number validation
 */
export const licenseNumber = (message = 'Please enter a valid license number'): ValidationRule => ({
  validate: (value: string) => !value || patterns.licenseNumber.test(value),
  message,
});

/**
 * Match another field validation
 */
export const match = (otherValue: string, message = 'Values do not match'): ValidationRule => ({
  validate: (value: string) => value === otherValue,
  message,
});

// ============================================
// Validation Functions
// ============================================

/**
 * Validate a single field against its rules
 */
export function validateField(value: string, rules: ValidationRule[]): string | null {
  for (const rule of rules) {
    if (!rule.validate(value)) {
      return rule.message;
    }
  }
  return null;
}

/**
 * Validate multiple fields
 */
export function validateForm(fields: Record<string, FieldValidation>): ValidationResult {
  const errors: ValidationErrors = {};
  let isValid = true;

  for (const [fieldName, { value, rules }] of Object.entries(fields)) {
    const error = validateField(value, rules);
    if (error) {
      errors[fieldName] = error;
      isValid = false;
    }
  }

  return { isValid, errors };
}

// ============================================
// Common Field Validation Presets
// ============================================

/**
 * Get validation rules for profile form fields
 */
export const profileValidation = {
  full_name: [required('Full name is required'), minLength(2, 'Name must be at least 2 characters'), maxLength(100)],
  phone: [phone('Please enter a valid phone number')],
  address_line1: [maxLength(255)],
  address_line2: [maxLength(255)],
  city: [maxLength(100)],
  state: [state('Please enter a 2-letter state code (e.g., CA)')],
  zip_code: [zipCode('Please enter a valid 5-digit ZIP code')],
};

/**
 * Get validation rules for contact form fields
 */
export const contactValidation = {
  name: [required('Name is required'), minLength(2), maxLength(100)],
  email: [required('Email is required'), email()],
  phone: [phone()],
  message: [required('Message is required'), minLength(10, 'Message must be at least 10 characters'), maxLength(2000)],
};

/**
 * Get validation rules for vehicle request form fields
 */
export const vehicleRequestValidation = {
  name: [required('Name is required'), minLength(2), maxLength(100)],
  email: [required('Email is required'), email()],
  phone: [required('Phone number is required'), phone()],
  vehicle_type: [required('Please select a vehicle type')],
  message: [maxLength(1000)],
};

/**
 * Get validation rules for payment form fields
 */
export const paymentValidation = {
  amount: [required('Amount is required'), currency(), minValue(1, 'Amount must be at least $1')],
  payment_method: [required('Please select a payment method')],
  reference: [maxLength(100)],
};

/**
 * Get validation rules for login form
 */
export const loginValidation = {
  email: [required('Email is required'), email()],
  password: [required('Password is required'), minLength(8, 'Password must be at least 8 characters')],
};

// ============================================
// Form State Hook Helper
// ============================================

export interface FormFieldState {
  value: string;
  error: string | null;
  touched: boolean;
}

export type FormState<T extends string> = Record<T, FormFieldState>;

/**
 * Create initial form state
 */
export function createFormState<T extends string>(
  fields: T[],
  initialValues?: Partial<Record<T, string>>
): FormState<T> {
  const state = {} as FormState<T>;
  for (const field of fields) {
    state[field] = {
      value: initialValues?.[field] || '',
      error: null,
      touched: false,
    };
  }
  return state;
}

/**
 * Update a field value in form state
 */
export function updateFieldValue<T extends string>(
  state: FormState<T>,
  field: T,
  value: string
): FormState<T> {
  return {
    ...state,
    [field]: {
      ...state[field],
      value,
    },
  };
}

/**
 * Mark a field as touched in form state
 */
export function touchField<T extends string>(
  state: FormState<T>,
  field: T
): FormState<T> {
  return {
    ...state,
    [field]: {
      ...state[field],
      touched: true,
    },
  };
}

/**
 * Set error for a field in form state
 */
export function setFieldError<T extends string>(
  state: FormState<T>,
  field: T,
  error: string | null
): FormState<T> {
  return {
    ...state,
    [field]: {
      ...state[field],
      error,
    },
  };
}

/**
 * Reset form state to initial values
 */
export function resetFormState<T extends string>(
  fields: T[],
  initialValues?: Partial<Record<T, string>>
): FormState<T> {
  return createFormState(fields, initialValues);
}
