/**
 * Weekly Vehicle Leasing Platform - Form Validation Hook
 * Salvage-to-Lux Fleet Management
 *
 * React hook for form validation with real-time feedback.
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  ValidationRule,
  validateField,
  FormFieldState,
  FormState,
} from '@/lib/validation';

export interface UseFormValidationConfig<T extends string> {
  fields: T[];
  validationRules: Partial<Record<T, ValidationRule[]>>;
  initialValues?: Partial<Record<T, string>>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export interface UseFormValidationReturn<T extends string> {
  values: Record<T, string>;
  errors: Record<T, string | null>;
  touched: Record<T, boolean>;
  isValid: boolean;
  isDirty: boolean;
  handleChange: (field: T, value: string) => void;
  handleBlur: (field: T) => void;
  setFieldValue: (field: T, value: string) => void;
  setFieldError: (field: T, error: string | null) => void;
  validateField: (field: T) => string | null;
  validateAll: () => boolean;
  reset: (values?: Partial<Record<T, string>>) => void;
  getFieldProps: (field: T) => {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    onBlur: () => void;
    error: string | null;
    touched: boolean;
  };
}

/**
 * Custom hook for form validation with real-time feedback
 */
export function useFormValidation<T extends string>({
  fields,
  validationRules,
  initialValues = {},
  validateOnChange = false,
  validateOnBlur = true,
}: UseFormValidationConfig<T>): UseFormValidationReturn<T> {
  // Initialize form state
  const initializeState = useCallback(
    (values: Partial<Record<T, string>> = {}) => {
      const state: FormState<T> = {} as FormState<T>;
      for (const field of fields) {
        state[field] = {
          value: values[field] ?? initialValues[field] ?? '',
          error: null,
          touched: false,
        };
      }
      return state;
    },
    [fields, initialValues]
  );

  const [formState, setFormState] = useState<FormState<T>>(() =>
    initializeState()
  );

  // Extract values, errors, and touched from state
  const values = useMemo(() => {
    const result = {} as Record<T, string>;
    for (const field of fields) {
      result[field] = formState[field]?.value ?? '';
    }
    return result;
  }, [formState, fields]);

  const errors = useMemo(() => {
    const result = {} as Record<T, string | null>;
    for (const field of fields) {
      result[field] = formState[field]?.error ?? null;
    }
    return result;
  }, [formState, fields]);

  const touched = useMemo(() => {
    const result = {} as Record<T, boolean>;
    for (const field of fields) {
      result[field] = formState[field]?.touched ?? false;
    }
    return result;
  }, [formState, fields]);

  // Check if form is valid (no errors)
  const isValid = useMemo(() => {
    return Object.values(errors).every((error) => error === null);
  }, [errors]);

  // Check if form has been modified
  const isDirty = useMemo(() => {
    for (const field of fields) {
      if (formState[field]?.value !== (initialValues[field] ?? '')) {
        return true;
      }
    }
    return false;
  }, [formState, fields, initialValues]);

  // Validate a single field
  const validateSingleField = useCallback(
    (field: T): string | null => {
      const rules = validationRules[field] ?? [];
      const value = formState[field]?.value ?? '';
      return validateField(value, rules);
    },
    [formState, validationRules]
  );

  // Handle field value change
  const handleChange = useCallback(
    (field: T, value: string) => {
      setFormState((prev) => {
        const newState = {
          ...prev,
          [field]: {
            ...prev[field],
            value,
          },
        };

        // Optionally validate on change
        if (validateOnChange) {
          const rules = validationRules[field] ?? [];
          const error = validateField(value, rules);
          newState[field].error = error;
        }

        return newState;
      });
    },
    [validateOnChange, validationRules]
  );

  // Handle field blur
  const handleBlur = useCallback(
    (field: T) => {
      setFormState((prev) => {
        const newState = {
          ...prev,
          [field]: {
            ...prev[field],
            touched: true,
          },
        };

        // Validate on blur if enabled
        if (validateOnBlur) {
          const rules = validationRules[field] ?? [];
          const error = validateField(prev[field]?.value ?? '', rules);
          newState[field].error = error;
        }

        return newState;
      });
    },
    [validateOnBlur, validationRules]
  );

  // Set field value directly
  const setFieldValue = useCallback(
    (field: T, value: string) => {
      handleChange(field, value);
    },
    [handleChange]
  );

  // Set field error directly
  const setFieldErrorDirect = useCallback((field: T, error: string | null) => {
    setFormState((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        error,
        touched: true,
      },
    }));
  }, []);

  // Validate all fields
  const validateAll = useCallback((): boolean => {
    let isFormValid = true;
    const newState = { ...formState };

    for (const field of fields) {
      const rules = validationRules[field] ?? [];
      const error = validateField(formState[field]?.value ?? '', rules);
      newState[field] = {
        ...newState[field],
        error,
        touched: true,
      };
      if (error) {
        isFormValid = false;
      }
    }

    setFormState(newState);
    return isFormValid;
  }, [formState, fields, validationRules]);

  // Reset form to initial values
  const reset = useCallback(
    (values?: Partial<Record<T, string>>) => {
      setFormState(initializeState(values));
    },
    [initializeState]
  );

  // Get props for a field (for easy input binding)
  const getFieldProps = useCallback(
    (field: T) => ({
      value: formState[field]?.value ?? '',
      onChange: (
        e: React.ChangeEvent<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
      ) => handleChange(field, e.target.value),
      onBlur: () => handleBlur(field),
      error: formState[field]?.error ?? null,
      touched: formState[field]?.touched ?? false,
    }),
    [formState, handleChange, handleBlur]
  );

  return {
    values,
    errors,
    touched,
    isValid,
    isDirty,
    handleChange,
    handleBlur,
    setFieldValue,
    setFieldError: setFieldErrorDirect,
    validateField: validateSingleField,
    validateAll,
    reset,
    getFieldProps,
  };
}

export default useFormValidation;
