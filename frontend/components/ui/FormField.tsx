'use client';

/**
 * GigWheels - Form Field Component
 * Weekly car rentals for gig drivers
 *
 * Reusable form field component with validation feedback.
 */

import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';

// Base field props
interface BaseFieldProps {
  label?: string;
  error?: string | null;
  touched?: boolean;
  required?: boolean;
  hint?: string;
  className?: string;
  inputClassName?: string;
  showError?: boolean;
}

// Input field props
interface InputFieldProps extends BaseFieldProps, Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  type?: 'text' | 'email' | 'tel' | 'password' | 'number' | 'url' | 'date' | 'time' | 'datetime-local';
}

// Textarea field props
interface TextareaFieldProps extends BaseFieldProps, Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  rows?: number;
}

// Select field props
interface SelectFieldProps extends BaseFieldProps, Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  options: Array<{ value: string; label: string; disabled?: boolean }>;
  placeholder?: string;
}

// Common styling
const baseInputClasses = 'w-full px-4 py-2 border rounded-lg transition-colors focus:outline-none focus:ring-2';
const normalBorderClasses = 'border-gray-300 focus:border-gold focus:ring-gold';
const errorBorderClasses = 'border-red-500 focus:border-red-500 focus:ring-red-500';
const disabledClasses = 'bg-gray-100 text-gray-500 cursor-not-allowed';

/**
 * Error message component
 */
const ErrorMessage = ({ error, show }: { error?: string | null; show: boolean }) => {
  if (!show || !error) return null;

  return (
    <p className="mt-1 text-sm text-red-600 flex items-center" role="alert">
      <svg
        className="w-4 h-4 mr-1 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      {error}
    </p>
  );
};

/**
 * Label component
 */
const FieldLabel = ({
  label,
  required,
  htmlFor,
}: {
  label?: string;
  required?: boolean;
  htmlFor?: string;
}) => {
  if (!label) return null;

  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-medium text-gray-700 mb-1"
    >
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
};

/**
 * Hint text component
 */
const HintText = ({ hint }: { hint?: string }) => {
  if (!hint) return null;

  return (
    <p className="mt-1 text-sm text-gray-500">{hint}</p>
  );
};

/**
 * Input field component
 */
export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  (
    {
      label,
      error,
      touched = false,
      required,
      hint,
      className,
      inputClassName,
      showError = true,
      type = 'text',
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const hasError = touched && !!error;
    const fieldId = id || props.name;

    return (
      <div className={clsx('w-full', className)}>
        <FieldLabel label={label} required={required} htmlFor={fieldId} />
        <input
          ref={ref}
          type={type}
          id={fieldId}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${fieldId}-error` : undefined}
          className={clsx(
            baseInputClasses,
            hasError ? errorBorderClasses : normalBorderClasses,
            disabled && disabledClasses,
            inputClassName
          )}
          {...props}
        />
        {showError && hasError && (
          <div id={`${fieldId}-error`}>
            <ErrorMessage error={error} show={hasError} />
          </div>
        )}
        <HintText hint={hint} />
      </div>
    );
  }
);

InputField.displayName = 'InputField';

/**
 * Textarea field component
 */
export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  (
    {
      label,
      error,
      touched = false,
      required,
      hint,
      className,
      inputClassName,
      showError = true,
      rows = 4,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const hasError = touched && !!error;
    const fieldId = id || props.name;

    return (
      <div className={clsx('w-full', className)}>
        <FieldLabel label={label} required={required} htmlFor={fieldId} />
        <textarea
          ref={ref}
          id={fieldId}
          rows={rows}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${fieldId}-error` : undefined}
          className={clsx(
            baseInputClasses,
            'resize-y',
            hasError ? errorBorderClasses : normalBorderClasses,
            disabled && disabledClasses,
            inputClassName
          )}
          {...props}
        />
        {showError && hasError && (
          <div id={`${fieldId}-error`}>
            <ErrorMessage error={error} show={hasError} />
          </div>
        )}
        <HintText hint={hint} />
      </div>
    );
  }
);

TextareaField.displayName = 'TextareaField';

/**
 * Select field component
 */
export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  (
    {
      label,
      error,
      touched = false,
      required,
      hint,
      className,
      inputClassName,
      showError = true,
      options,
      placeholder,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const hasError = touched && !!error;
    const fieldId = id || props.name;

    return (
      <div className={clsx('w-full', className)}>
        <FieldLabel label={label} required={required} htmlFor={fieldId} />
        <select
          ref={ref}
          id={fieldId}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${fieldId}-error` : undefined}
          className={clsx(
            baseInputClasses,
            'appearance-none bg-white',
            hasError ? errorBorderClasses : normalBorderClasses,
            disabled && disabledClasses,
            inputClassName
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        {showError && hasError && (
          <div id={`${fieldId}-error`}>
            <ErrorMessage error={error} show={hasError} />
          </div>
        )}
        <HintText hint={hint} />
      </div>
    );
  }
);

SelectField.displayName = 'SelectField';

/**
 * Checkbox field component
 */
interface CheckboxFieldProps extends BaseFieldProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  name?: string;
  disabled?: boolean;
  children?: ReactNode;
}

export const CheckboxField = forwardRef<HTMLInputElement, CheckboxFieldProps>(
  (
    {
      label,
      error,
      touched = false,
      className,
      showError = true,
      checked,
      onChange,
      name,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const hasError = touched && !!error;
    const fieldId = name;

    return (
      <div className={clsx('w-full', className)}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            ref={ref}
            type="checkbox"
            name={name}
            id={fieldId}
            checked={checked}
            onChange={(e) => onChange?.(e.target.checked)}
            disabled={disabled}
            aria-invalid={hasError}
            className={clsx(
              'w-5 h-5 mt-0.5 rounded border-gray-300 text-gold focus:ring-gold',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            {...props}
          />
          <span className={clsx('text-gray-700', disabled && 'text-gray-400')}>
            {children || label}
          </span>
        </label>
        {showError && hasError && <ErrorMessage error={error} show={hasError} />}
      </div>
    );
  }
);

CheckboxField.displayName = 'CheckboxField';

/**
 * Form group for organizing fields
 */
export const FormGroup = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div className={clsx('grid grid-cols-1 gap-4', className)}>
      {children}
    </div>
  );
};

/**
 * Form section with title
 */
export const FormSection = ({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div className={clsx('bg-white rounded-xl shadow-lg p-6', className)}>
      <h2 className="text-xl font-semibold text-charcoal mb-2">{title}</h2>
      {description && <p className="text-gray-600 mb-4">{description}</p>}
      {children}
    </div>
  );
};

// Export all components
export default {
  InputField,
  TextareaField,
  SelectField,
  CheckboxField,
  FormGroup,
  FormSection,
};
