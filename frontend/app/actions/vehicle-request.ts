'use server';

/**
 * GigWheels - Vehicle Request Server Actions
 * Weekly car rentals for gig drivers
 *
 * Server actions for vehicle request operations.
 */

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { serverApiBaseUrl } from '@/lib/api';

const API_BASE_URL = serverApiBaseUrl();

interface VehicleRequestData {
  preferred_vehicle_type?: string;
  budget_range?: string;
  notes?: string;
  gps_consent_confirmed?: boolean;
}

interface ActionResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  errors?: Record<string, string>;
}

/**
 * Get authentication token from cookies
 */
async function getAuthToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get('auth_token')?.value;
}

/**
 * Submit a new vehicle request
 */
export async function submitVehicleRequest(formData: FormData): Promise<ActionResponse> {
  const token = await getAuthToken();

  if (!token) {
    return { success: false, error: 'Not authenticated. Please log in.' };
  }

  const data: VehicleRequestData = {
    preferred_vehicle_type: (formData.get('preferred_vehicle_type') as string) || undefined,
    budget_range: (formData.get('budget_range') as string) || undefined,
    notes: (formData.get('notes') as string) || undefined,
    gps_consent_confirmed: formData.get('gps_consent') === 'on',
  };

  // Validation
  const errors: Record<string, string> = {};

  if (!data.gps_consent_confirmed) {
    errors.gps_consent = 'You must agree to GPS tracking to proceed';
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/customer/vehicle-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.detail || 'Failed to submit vehicle request'
      };
    }

    const result = await response.json();

    // Revalidate relevant pages
    revalidatePath('/vehicle-request');
    revalidatePath('/dashboard');

    return { success: true, data: result };
  } catch (error) {
    console.error('Vehicle request error:', error);
    return {
      success: false,
      error: 'Network error. Please try again.'
    };
  }
}

/**
 * Cancel an existing vehicle request
 */
export async function cancelVehicleRequest(requestId: number): Promise<ActionResponse> {
  const token = await getAuthToken();

  if (!token) {
    return { success: false, error: 'Not authenticated. Please log in.' };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/customer/vehicle-request/${requestId}/cancel`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.detail || 'Failed to cancel request'
      };
    }

    const result = await response.json();

    // Revalidate relevant pages
    revalidatePath('/vehicle-request');
    revalidatePath('/dashboard');

    return { success: true, data: result };
  } catch (error) {
    console.error('Cancel request error:', error);
    return {
      success: false,
      error: 'Network error. Please try again.'
    };
  }
}

/**
 * Check vehicle request eligibility
 */
export async function checkRequestEligibility(): Promise<ActionResponse> {
  const token = await getAuthToken();

  if (!token) {
    return { success: false, error: 'Not authenticated. Please log in.' };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/customer/vehicle-request/eligibility`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.detail || 'Failed to check eligibility'
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Eligibility check error:', error);
    return {
      success: false,
      error: 'Network error. Please try again.'
    };
  }
}
