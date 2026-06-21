/**
 * GigWheels - Customer Journey E2E Tests
 * Weekly car rentals for gig drivers
 *
 * End-to-end tests for the complete customer journey.
 */

import { test, expect } from '@playwright/test';

test.describe('Customer Journey', () => {
  test.describe('Public Pages', () => {
    test('should display home page correctly', async ({ page }) => {
      await page.goto('/');

      // Hero section
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      // Navigation
      await expect(page.getByRole('navigation')).toBeVisible();

      // Call to action buttons
      const ctaButtons = page.getByRole('link', { name: /get started|learn more|browse fleet/i });
      await expect(ctaButtons.first()).toBeVisible();
    });

    test('should navigate to how it works page', async ({ page }) => {
      await page.goto('/');

      // Click how it works link
      await page.getByRole('link', { name: /how it works/i }).click();

      await expect(page).toHaveURL(/how-it-works/);
      await expect(page.getByRole('heading', { name: /how it works/i })).toBeVisible();
    });

    test('should display fleet page with vehicles', async ({ page }) => {
      await page.goto('/fleet');

      // Should show vehicle cards
      const vehicleCards = page.getByTestId('vehicle-card');

      // Wait for vehicles to load
      await page.waitForLoadState('networkidle');

      // Check for vehicle content
      await expect(page.getByText(/tesla|bmw|mercedes|luxury/i).first()).toBeVisible();
    });

    test('should have contact/inquiry form', async ({ page }) => {
      await page.goto('/contact');

      // Form should be visible
      await expect(page.getByLabel(/name/i)).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/message|inquiry/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /submit|send/i })).toBeVisible();
    });
  });

  test.describe('Inquiry Submission', () => {
    test('should submit inquiry successfully', async ({ page }) => {
      await page.goto('/contact');

      // Fill form
      await page.getByLabel(/name/i).fill('John Doe');
      await page.getByLabel(/email/i).fill('john@example.com');
      await page.getByLabel(/phone/i).fill('555-123-4567');
      await page.getByLabel(/message|inquiry/i).fill('I am interested in leasing a luxury vehicle.');

      // Submit
      await page.getByRole('button', { name: /submit|send/i }).click();

      // Success message
      await expect(page.getByText(/thank you|received|success/i)).toBeVisible();
    });

    test('should validate inquiry form', async ({ page }) => {
      await page.goto('/contact');

      // Submit empty form
      await page.getByRole('button', { name: /submit|send/i }).click();

      // Validation errors
      await expect(page.getByText(/required|invalid/i).first()).toBeVisible();
    });
  });

  test.describe('Customer Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      // Login as customer
      await page.goto('/login');
      await page.getByLabel(/email/i).fill('customer@example.com');
      await page.getByLabel(/password/i).fill('customerpass123');
      await page.getByRole('button', { name: /login|sign in/i }).click();

      // Wait for dashboard
      await page.waitForURL(/dashboard/, { timeout: 10000 });
    });

    test('should display customer dashboard', async ({ page }) => {
      // Dashboard elements
      await expect(page.getByText(/dashboard|welcome/i)).toBeVisible();

      // Quick stats
      await expect(page.getByText(/active lease|current vehicle/i)).toBeVisible();
    });

    test('should navigate to leases page', async ({ page }) => {
      await page.getByRole('link', { name: /leases|my vehicles/i }).click();

      await expect(page).toHaveURL(/leases/);

      // Lease list or empty state
      const hasLeases = await page.getByTestId('lease-item').count();
      if (hasLeases > 0) {
        await expect(page.getByTestId('lease-item').first()).toBeVisible();
      } else {
        await expect(page.getByText(/no.*leases|get started/i)).toBeVisible();
      }
    });

    test('should view invoices', async ({ page }) => {
      await page.getByRole('link', { name: /invoices|payments/i }).click();

      await expect(page).toHaveURL(/invoices|payments/);

      // Invoice list or empty state
      await page.waitForLoadState('networkidle');
    });

    test('should access profile settings', async ({ page }) => {
      await page.getByRole('link', { name: /profile|settings|account/i }).click();

      await expect(page).toHaveURL(/profile|settings/);

      // Profile form
      await expect(page.getByLabel(/name|email/i).first()).toBeVisible();
    });
  });

  test.describe('Payment Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Login as customer with active lease
      await page.goto('/login');
      await page.getByLabel(/email/i).fill('customer@example.com');
      await page.getByLabel(/password/i).fill('customerpass123');
      await page.getByRole('button', { name: /login|sign in/i }).click();
      await page.waitForURL(/dashboard/, { timeout: 10000 });
    });

    test('should view payment history', async ({ page }) => {
      await page.getByRole('link', { name: /payments|invoices/i }).click();

      // Check for payment list
      await page.waitForLoadState('networkidle');

      // Either show payments or empty state
      const pageContent = await page.textContent('body');
      expect(pageContent?.toLowerCase()).toMatch(/payment|invoice|no.*payments|history/i);
    });

    test('should display invoice details', async ({ page }) => {
      await page.goto('/customer/invoices');
      await page.waitForLoadState('networkidle');

      // Click on first invoice if available
      const invoiceRow = page.getByTestId('invoice-row').first();
      if (await invoiceRow.isVisible()) {
        await invoiceRow.click();

        // Invoice details
        await expect(page.getByText(/invoice|amount|date/i).first()).toBeVisible();
      }
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should have mobile navigation menu', async ({ page }) => {
      await page.goto('/');

      // Look for hamburger menu or mobile nav
      const mobileMenu = page.getByRole('button', { name: /menu/i });
      if (await mobileMenu.isVisible()) {
        await mobileMenu.click();

        // Nav links should be visible after opening menu
        await expect(page.getByRole('link', { name: /home|fleet|contact/i }).first()).toBeVisible();
      }
    });

    test('should display content properly on mobile', async ({ page }) => {
      await page.goto('/');

      // Content should be readable
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      // No horizontal scrolling
      const body = page.locator('body');
      const scrollWidth = await body.evaluate((el) => el.scrollWidth);
      const clientWidth = await body.evaluate((el) => el.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 10); // Allow small margin
    });
  });
});
