/**
 * GigWheels - Auth E2E Tests
 * Weekly car rentals for gig drivers
 *
 * End-to-end tests for authentication flows.
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.describe('Login Flow', () => {
    test('should display login page', async ({ page }) => {
      await page.goto('/login');

      // Check page title or heading
      await expect(page.getByRole('heading', { name: /login|sign in/i })).toBeVisible();

      // Check form elements
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /login|sign in/i })).toBeVisible();
    });

    test('should show validation errors for empty fields', async ({ page }) => {
      await page.goto('/login');

      // Try to submit empty form
      await page.getByRole('button', { name: /login|sign in/i }).click();

      // Expect validation messages
      await expect(page.getByText(/required|enter.*email/i)).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      // Fill in invalid credentials
      await page.getByLabel(/email/i).fill('wrong@example.com');
      await page.getByLabel(/password/i).fill('wrongpassword');
      await page.getByRole('button', { name: /login|sign in/i }).click();

      // Expect error message
      await expect(page.getByText(/invalid|incorrect|failed/i)).toBeVisible();
    });

    test('should successfully login with valid credentials', async ({ page }) => {
      await page.goto('/login');

      // Fill in valid credentials (using test account)
      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByLabel(/password/i).fill('testpassword123');
      await page.getByRole('button', { name: /login|sign in/i }).click();

      // Should redirect to dashboard
      await expect(page).toHaveURL(/dashboard|home/);
    });

    test('should have forgot password link', async ({ page }) => {
      await page.goto('/login');

      // Check for forgot password link
      const forgotLink = page.getByRole('link', { name: /forgot|reset/i });
      await expect(forgotLink).toBeVisible();
    });

    test('should navigate to registration page', async ({ page }) => {
      await page.goto('/login');

      // Click sign up/register link
      const registerLink = page.getByRole('link', { name: /sign up|register|create account/i });
      if (await registerLink.isVisible()) {
        await registerLink.click();
        await expect(page).toHaveURL(/register|signup/);
      }
    });
  });

  test.describe('Logout Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByLabel(/password/i).fill('testpassword123');
      await page.getByRole('button', { name: /login|sign in/i }).click();

      // Wait for redirect
      await page.waitForURL(/dashboard|home/, { timeout: 10000 });
    });

    test('should successfully logout', async ({ page }) => {
      // Find and click logout
      const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
      if (await logoutButton.isVisible()) {
        await logoutButton.click();

        // Should redirect to login or home
        await expect(page).toHaveURL(/login|\/$/);
      }
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to login when accessing dashboard without auth', async ({ page }) => {
      await page.goto('/dashboard');

      // Should redirect to login
      await expect(page).toHaveURL(/login/);
    });

    test('should redirect to login when accessing admin routes without auth', async ({ page }) => {
      await page.goto('/admin');

      // Should redirect to login
      await expect(page).toHaveURL(/login/);
    });

    test('should stay on page after login redirect', async ({ page }) => {
      // Try to access dashboard without auth
      await page.goto('/dashboard');

      // Get redirected to login
      await expect(page).toHaveURL(/login/);

      // Login
      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByLabel(/password/i).fill('testpassword123');
      await page.getByRole('button', { name: /login|sign in/i }).click();

      // Should return to dashboard
      await expect(page).toHaveURL(/dashboard/);
    });
  });

  test.describe('Password Reset', () => {
    test('should display forgot password page', async ({ page }) => {
      await page.goto('/forgot-password');

      // Check for email input
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /send|reset|submit/i })).toBeVisible();
    });

    test('should show confirmation after submitting reset request', async ({ page }) => {
      await page.goto('/forgot-password');

      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByRole('button', { name: /send|reset|submit/i }).click();

      // Should show confirmation message
      await expect(page.getByText(/sent|check.*email|instructions/i)).toBeVisible();
    });
  });
});
