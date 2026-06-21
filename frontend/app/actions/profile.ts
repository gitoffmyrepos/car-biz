'use server';

/**
 * Weekly Vehicle Leasing Platform - Profile Server Actions
 * Salvage-to-Lux Fleet Management
 *
 * Server actions for customer profile operations.
 */

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { serverApiBaseUrl } from '@/lib/api';

const API_BASE_URL = serverApiBaseUrl();

interface ProfileUpdateData {
  full_name?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  notification_email?: boolean;
  notification_sms?: boolean;
}

interface ActionResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

/**
 * Get authentication token from cookies
 */
async function getAuthToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get('auth_token')?.value;
}

/**
 * Update customer profile
 */
export async function updateProfile(formData: FormData): Promise<ActionResponse> {
  const token = await getAuthToken();

  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }

  const data: ProfileUpdateData = {
    full_name: formData.get('full_name') as string || undefined,
    phone: formData.get('phone') as string || undefined,
    address_line1: formData.get('address_line1') as string || undefined,
    address_line2: formData.get('address_line2') as string || undefined,
    city: formData.get('city') as string || undefined,
    state: formData.get('state') as string || undefined,
    zip_code: formData.get('zip_code') as string || undefined,
    notification_email: formData.get('notification_email') === 'on',
    notification_sms: formData.get('notification_sms') === 'on',
  };

  // Remove undefined values
  Object.keys(data).forEach(key => {
    if (data[key as keyof ProfileUpdateData] === undefined) {
      delete data[key as keyof ProfileUpdateData];
    }
  });

  try {
    const response = await fetch(`${API_BASE_URL}/customer/profile`, {
      method: 'PUT',
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
        error: errorData.detail || 'Failed to update profile'
      };
    }

    const result = await response.json();

    // Revalidate profile-related pages
    revalidatePath('/profile');
    revalidatePath('/dashboard');

    return { success: true, data: result };
  } catch (error) {
    console.error('Profile update error:', error);
    return {
      success: false,
      error: 'Network error. Please try again.'
    };
  }
}

/**
 * Fetch customer profile
 */
export async function getProfile(): Promise<ActionResponse> {
  const token = await getAuthToken();

  if (!token) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/customer/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.detail || 'Failed to fetch profile'
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Profile fetch error:', error);
    return {
      success: false,
      error: 'Network error. Please try again.'
    };
  }
}
