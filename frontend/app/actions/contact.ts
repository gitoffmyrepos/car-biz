'use server';

/**
 * Weekly Vehicle Leasing Platform - Contact Form Server Actions
 * Salvage-to-Lux Fleet Management
 *
 * Server actions for contact/inquiry form submissions.
 * Uses Next.js Server Actions for secure, validated mutations.
 */

import { revalidatePath } from 'next/cache';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8100/api';

// Map frontend values to backend enum values
const vehicleTypeMap: Record<string, string> = {
  'Luxury Sedan': 'sedan',
  'Premium SUV': 'suv',
  'Sports & Performance': 'sports',
  'Compact & Economy': 'sedan',
  'Executive Luxury': 'luxury',
  'Pickup Truck': 'truck',
  'Not Sure - Need Guidance': 'any',
};

const timeframeMap: Record<string, string> = {
  'Immediately (This Week)': 'immediate',
  'Within 2 Weeks': 'this_week',
  'Within 1 Month': 'this_month',
  'Just Exploring Options': 'just_browsing',
};

export interface ContactFormState {
  success: boolean;
  message: string;
  errors: Record<string, string>;
  inquiryId?: number;
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone format
 */
function isValidPhone(phone: string): boolean {
  if (!phone) return true;
  const phoneRegex = /^[\d\s\-\(\)\+]{10,}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Initial state for contact form
 */
export const initialContactFormState: ContactFormState = {
  success: false,
  message: '',
  errors: {},
};

/**
 * Submit contact/inquiry form - Server Action
 * Compatible with useActionState hook for progressive enhancement
 */
export async function submitContactForm(
  prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  // Extract form data
  const fullName = (formData.get('fullName') as string)?.trim() || '';
  const email = (formData.get('email') as string)?.trim() || '';
  const phone = (formData.get('phone') as string)?.trim() || '';
  const preferredContact = (formData.get('preferredContact') as string) || 'either';
  const vehicleType = formData.get('vehicleType') as string | null;
  const timeframe = formData.get('timeframe') as string | null;
  const notes = (formData.get('notes') as string)?.trim() || '';

  // Validation
  const errors: Record<string, string> = {};

  // Full name validation
  if (!fullName) {
    errors.fullName = 'Full name is required';
  } else if (fullName.length < 2) {
    errors.fullName = 'Please enter your full name';
  }

  // Email validation
  if (!email) {
    errors.email = 'Email address is required';
  } else if (!isValidEmail(email)) {
    errors.email = 'Please enter a valid email address';
  }

  // Phone validation
  if (!phone) {
    errors.phone = 'Phone number is required';
  } else if (!isValidPhone(phone)) {
    errors.phone = 'Please enter a valid phone number';
  }

  // Vehicle type validation
  if (!vehicleType) {
    errors.vehicleType = 'Please select a vehicle type';
  }

  // Timeframe validation
  if (!timeframe) {
    errors.timeframe = 'Please select your timeframe';
  }

  // Return early if validation fails
  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      message: 'Please correct the errors below',
      errors,
    };
  }

  // Prepare API payload with enum values
  const apiPayload = {
    full_name: fullName,
    email: email,
    phone: phone || null,
    preferred_contact: preferredContact,
    vehicle_type: vehicleTypeMap[vehicleType!] || 'any',
    timeframe: timeframeMap[timeframe!] || 'just_browsing',
    notes: notes || null,
  };

  try {
    const response = await fetch(`${API_BASE_URL}/inquiries/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data.message || 'Failed to submit inquiry. Please try again.',
        errors: { form: data.detail || 'Server error occurred' },
      };
    }

    // Revalidate contact page cache
    revalidatePath('/contact');

    if (data.success) {
      return {
        success: true,
        message: 'Your inquiry has been submitted successfully! Our team will contact you within 24 hours.',
        errors: {},
        inquiryId: data.inquiry_id,
      };
    }

    return {
      success: false,
      message: data.message || 'Failed to submit inquiry. Please try again.',
      errors: { form: 'Unexpected response from server' },
    };
  } catch (error) {
    console.error('Error submitting inquiry:', error);
    return {
      success: false,
      message: 'Failed to submit inquiry. Please try again.',
      errors: { form: 'Network error. Please check your connection.' },
    };
  }
}
