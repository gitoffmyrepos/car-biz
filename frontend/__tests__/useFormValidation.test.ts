/**
 * GigWheels - useFormValidation Hook Tests
 * Weekly car rentals for gig drivers
 *
 * Unit tests for the form validation React hook.
 */

import { renderHook, act } from '@testing-library/react';
import { useFormValidation, UseFormValidationConfig } from '@/hooks/useFormValidation';
import { required, email, minLength } from '@/lib/validation';

// Define field type for tests
type TestFields = 'email' | 'name';

describe('useFormValidation', () => {
  // Config matching the actual hook interface
  const defaultConfig: UseFormValidationConfig<TestFields> = {
    fields: ['email', 'name'],
    validationRules: {
      email: [required(), email()],
      name: [required(), minLength(2)],
    },
    initialValues: {
      email: '',
      name: '',
    },
    validateOnBlur: true,
    validateOnChange: false,
  };

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useFormValidation(defaultConfig));

      expect(result.current.values.email).toBe('');
      expect(result.current.values.name).toBe('');
      expect(result.current.errors.email).toBeNull();
      expect(result.current.errors.name).toBeNull();
    });

    it('should initialize with provided values', () => {
      const config: UseFormValidationConfig<'email'> = {
        fields: ['email'],
        validationRules: {
          email: [required(), email()],
        },
        initialValues: {
          email: 'test@example.com',
        },
      };

      const { result } = renderHook(() => useFormValidation(config));

      expect(result.current.values.email).toBe('test@example.com');
    });

    it('should be valid initially when no errors', () => {
      const { result } = renderHook(() => useFormValidation(defaultConfig));

      // Initially valid because no validation has run yet
      expect(result.current.isValid).toBe(true);
      expect(result.current.isDirty).toBe(false);
    });
  });

  describe('handleChange', () => {
    it('should update value on change', () => {
      const { result } = renderHook(() => useFormValidation(defaultConfig));

      act(() => {
        result.current.handleChange('email', 'test@example.com');
      });

      expect(result.current.values.email).toBe('test@example.com');
    });

    it('should set isDirty after change', () => {
      const { result } = renderHook(() => useFormValidation(defaultConfig));

      expect(result.current.isDirty).toBe(false);

      act(() => {
        result.current.handleChange('email', 'a');
      });

      expect(result.current.isDirty).toBe(true);
    });

    it('should validate on change when validateOnChange is true', () => {
      const config: UseFormValidationConfig<TestFields> = {
        ...defaultConfig,
        validateOnChange: true,
      };
      const { result } = renderHook(() => useFormValidation(config));

      act(() => {
        result.current.handleChange('email', 'invalid-email');
      });

      expect(result.current.errors.email).toBe('Please enter a valid email address');
    });
  });

  describe('handleBlur', () => {
    it('should mark field as touched', () => {
      const { result } = renderHook(() => useFormValidation(defaultConfig));

      expect(result.current.touched.email).toBe(false);

      act(() => {
        result.current.handleBlur('email');
      });

      expect(result.current.touched.email).toBe(true);
    });

    it('should validate field on blur', () => {
      const { result } = renderHook(() => useFormValidation(defaultConfig));

      act(() => {
        result.current.handleBlur('email');
      });

      expect(result.current.errors.email).toBe('This field is required');
    });
  });

  describe('setFieldValue', () => {
    it('should set field value programmatically', () => {
      const { result } = renderHook(() => useFormValidation(defaultConfig));

      act(() => {
        result.current.setFieldValue('email', 'new@example.com');
      });

      expect(result.current.values.email).toBe('new@example.com');
    });
  });

  describe('setFieldError', () => {
    it('should set field error programmatically', () => {
      const { result } = renderHook(() => useFormValidation(defaultConfig));

      act(() => {
        result.current.setFieldError('email', 'Custom error message');
      });

      expect(result.current.errors.email).toBe('Custom error message');
    });

    it('should clear error when set to null', () => {
      const { result } = renderHook(() => useFormValidation(defaultConfig));

      act(() => {
        result.current.setFieldError('email', 'Error');
      });

      act(() => {
        result.current.setFieldError('email', null);
      });

      expect(result.current.errors.email).toBeNull();
    });
  });

  describe('validateField', () => {
    it('should return error for invalid field', () => {
      const { result } = renderHook(() => useFormValidation(defaultConfig));

      let error: string | null = null;
      act(() => {
        error = result.current.validateField('email');
      });

      expect(error).toBe('This field is required');
    });

    it('should return null for valid field', () => {
      const { result } = renderHook(() => useFormValidation(defaultConfig));

      act(() => {
        result.current.setFieldValue('email', 'valid@example.com');
      });

      let error: string | null = null;
      act(() => {
        error = result.current.validateField('email');
      });

      expect(error).toBeNull();
    });
  });

  describe('validateAll', () => {
    it('should validate all fields and return validity', () => {
      const { result } = renderHook(() => useFormValidation(defaultConfig));

      let isValid = true;
      act(() => {
        isValid = result.current.validateAll();
      });

      expect(isValid).toBe(false);
      expect(result.current.errors.email).toBe('This field is required');
      expect(result.current.errors.name).toBe('This field is required');
    });

    it('should return true when all fields are valid', () => {
      const { result } = renderHook(() => useFormValidation(defaultConfig));

      act(() => {
        result.current.setFieldValue('email', 'valid@example.com');
        result.current.setFieldValue('name', 'John');
      });

      let isValid = false;
      act(() => {
        isValid = result.current.validateAll();
      });

      expect(isValid).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset form to initial values', () => {
      const { result } = renderHook(() => useFormValidation(defaultConfig));

      act(() => {
        result.current.setFieldValue('email', 'changed@example.com');
        result.current.handleBlur('email');
      });

      expect(result.current.values.email).toBe('changed@example.com');
      expect(result.current.isDirty).toBe(true);

      act(() => {
        result.current.reset();
      });

      expect(result.current.values.email).toBe('');
      expect(result.current.isDirty).toBe(false);
      expect(result.current.touched.email).toBe(false);
      expect(result.current.errors.email).toBeNull();
    });

    it('should reset to custom values when provided', () => {
      const { result } = renderHook(() => useFormValidation(defaultConfig));

      act(() => {
        result.current.reset({ email: 'custom@example.com' });
      });

      expect(result.current.values.email).toBe('custom@example.com');
    });
  });

  describe('getFieldProps', () => {
    it('should return props for input element', () => {
      const { result } = renderHook(() => useFormValidation(defaultConfig));

      const props = result.current.getFieldProps('email');

      expect(props.value).toBe('');
      expect(typeof props.onChange).toBe('function');
      expect(typeof props.onBlur).toBe('function');
      expect(props.error).toBeNull();
      expect(props.touched).toBe(false);
    });

    it('should return updated props after interaction', () => {
      const { result } = renderHook(() => useFormValidation(defaultConfig));

      act(() => {
        result.current.setFieldValue('email', 'test@example.com');
        result.current.handleBlur('email');
      });

      const props = result.current.getFieldProps('email');

      expect(props.value).toBe('test@example.com');
      expect(props.touched).toBe(true);
      expect(props.error).toBeNull();
    });
  });

  describe('isValid', () => {
    it('should be false when fields have errors', () => {
      const { result } = renderHook(() => useFormValidation(defaultConfig));

      act(() => {
        result.current.validateAll();
      });

      expect(result.current.isValid).toBe(false);
    });

    it('should be true when all fields are valid', () => {
      const { result } = renderHook(() => useFormValidation(defaultConfig));

      act(() => {
        result.current.setFieldValue('email', 'valid@example.com');
        result.current.setFieldValue('name', 'John');
        result.current.validateAll();
      });

      expect(result.current.isValid).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty fields array', () => {
      const config: UseFormValidationConfig<never> = {
        fields: [],
        validationRules: {},
      };

      const { result } = renderHook(() => useFormValidation(config));

      expect(result.current.isValid).toBe(true);
      expect(result.current.isDirty).toBe(false);
    });

    it('should handle fields without validation rules', () => {
      const config: UseFormValidationConfig<'optional'> = {
        fields: ['optional'],
        validationRules: {},
        initialValues: { optional: '' },
      };

      const { result } = renderHook(() => useFormValidation(config));

      let isValid = false;
      act(() => {
        isValid = result.current.validateAll();
      });

      expect(isValid).toBe(true);
      expect(result.current.errors.optional).toBeNull();
    });
  });
});
