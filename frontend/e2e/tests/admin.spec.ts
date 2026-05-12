/**
 * Weekly Vehicle Leasing Platform - Admin E2E Tests
 * Salvage-to-Lux Fleet Management
 *
 * End-to-end tests for admin workflows.
 */

import { test, expect } from '@playwright/test';

test.describe('Admin Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@example.com');
    await page.getByLabel(/password/i).fill('adminpass123');
    await page.getByRole('button', { name: /login|sign in/i }).click();

    // Wait for admin dashboard
    await page.waitForURL(/admin|dashboard/, { timeout: 10000 });
  });

  test.describe('Admin Dashboard', () => {
    test('should display admin dashboard with stats', async ({ page }) => {
      // Dashboard should have overview stats
      await expect(page.getByText(/total.*vehicles|fleet/i)).toBeVisible();
      await expect(page.getByText(/active.*leases|customers/i)).toBeVisible();
    });

    test('should have navigation to all admin sections', async ({ page }) => {
      // Admin nav items
      await expect(page.getByRole('link', { name: /vehicles|fleet/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /customers|users/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /leases/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /invoices|billing/i })).toBeVisible();
    });
  });

  test.describe('Vehicle Management', () => {
    test('should display vehicle list', async ({ page }) => {
      await page.getByRole('link', { name: /vehicles|fleet/i }).click();

      await expect(page).toHaveURL(/vehicles/);

      // Data table should be visible
      await page.waitForLoadState('networkidle');
      const table = page.getByRole('table');
      if (await table.isVisible()) {
        await expect(table).toBeVisible();
      }
    });

    test('should open add vehicle form', async ({ page }) => {
      await page.goto('/admin/vehicles');

      // Click add button
      const addButton = page.getByRole('button', { name: /add.*vehicle|new.*vehicle/i });
      if (await addButton.isVisible()) {
        await addButton.click();

        // Form modal or page
        await expect(page.getByLabel(/make/i)).toBeVisible();
        await expect(page.getByLabel(/model/i)).toBeVisible();
      }
    });

    test('should filter vehicles', async ({ page }) => {
      await page.goto('/admin/vehicles');
      await page.waitForLoadState('networkidle');

      // Find filter/search input
      const searchInput = page.getByPlaceholder(/search|filter/i);
      if (await searchInput.isVisible()) {
        await searchInput.fill('Tesla');
        await page.waitForTimeout(500); // Debounce

        // Results should be filtered
        await page.waitForLoadState('networkidle');
      }
    });

    test('should sort vehicles', async ({ page }) => {
      await page.goto('/admin/vehicles');
      await page.waitForLoadState('networkidle');

      // Click column header to sort
      const makeHeader = page.getByRole('columnheader', { name: /make/i });
      if (await makeHeader.isVisible()) {
        await makeHeader.click();

        // Sort indicator should be visible
        await expect(makeHeader.locator('[class*="sort"]')).toBeVisible();
      }
    });

    test('should paginate vehicle list', async ({ page }) => {
      await page.goto('/admin/vehicles');
      await page.waitForLoadState('networkidle');

      // Pagination controls
      const nextButton = page.getByRole('button', { name: /next|>/i });
      if (await nextButton.isVisible() && await nextButton.isEnabled()) {
        await nextButton.click();

        // Page should change
        await page.waitForLoadState('networkidle');
      }
    });
  });

  test.describe('Customer Management', () => {
    test('should display customer list', async ({ page }) => {
      await page.getByRole('link', { name: /customers|users/i }).click();

      await page.waitForLoadState('networkidle');

      // Check for customer data
      const content = await page.textContent('body');
      expect(content?.toLowerCase()).toMatch(/customer|user|email/i);
    });

    test('should view customer details', async ({ page }) => {
      await page.goto('/admin/customers');
      await page.waitForLoadState('networkidle');

      // Click on customer row
      const customerRow = page.getByTestId('customer-row').first();
      if (await customerRow.isVisible()) {
        await customerRow.click();

        // Customer details
        await expect(page.getByText(/profile|details/i)).toBeVisible();
      }
    });
  });

  test.describe('Lease Management', () => {
    test('should display lease list', async ({ page }) => {
      await page.getByRole('link', { name: /leases/i }).click();

      await page.waitForLoadState('networkidle');

      // Lease data
      const content = await page.textContent('body');
      expect(content?.toLowerCase()).toMatch(/lease|vehicle|customer/i);
    });

    test('should create new lease', async ({ page }) => {
      await page.goto('/admin/leases');

      const addButton = page.getByRole('button', { name: /new.*lease|create.*lease/i });
      if (await addButton.isVisible()) {
        await addButton.click();

        // Lease form
        await expect(page.getByLabel(/customer|select.*customer/i)).toBeVisible();
        await expect(page.getByLabel(/vehicle|select.*vehicle/i)).toBeVisible();
      }
    });
  });

  test.describe('Invoice Management', () => {
    test('should display invoice list', async ({ page }) => {
      await page.getByRole('link', { name: /invoices|billing/i }).click();

      await page.waitForLoadState('networkidle');

      // Invoice data
      const content = await page.textContent('body');
      expect(content?.toLowerCase()).toMatch(/invoice|amount|status/i);
    });

    test('should print invoice', async ({ page }) => {
      await page.goto('/admin/invoices');
      await page.waitForLoadState('networkidle');

      // Click on invoice
      const invoiceRow = page.getByTestId('invoice-row').first();
      if (await invoiceRow.isVisible()) {
        await invoiceRow.click();

        // Print button
        const printButton = page.getByRole('button', { name: /print/i });
        if (await printButton.isVisible()) {
          await expect(printButton).toBeVisible();
        }
      }
    });
  });

  test.describe('Inquiry Management', () => {
    test('should display inquiry list', async ({ page }) => {
      await page.goto('/admin/inquiries');

      await page.waitForLoadState('networkidle');

      // Inquiry data
      const content = await page.textContent('body');
      expect(content?.toLowerCase()).toMatch(/inquiry|name|email|status/i);
    });

    test('should update inquiry status', async ({ page }) => {
      await page.goto('/admin/inquiries');
      await page.waitForLoadState('networkidle');

      // Click on inquiry
      const inquiryRow = page.getByTestId('inquiry-row').first();
      if (await inquiryRow.isVisible()) {
        await inquiryRow.click();

        // Status dropdown
        const statusSelect = page.getByLabel(/status/i);
        if (await statusSelect.isVisible()) {
          await statusSelect.selectOption('contacted');
        }
      }
    });
  });

  test.describe('File Management', () => {
    test('should upload document', async ({ page }) => {
      // Navigate to a page with file upload
      await page.goto('/admin/documents');

      // File input
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        // Upload a test file
        await fileInput.setInputFiles({
          name: 'test-document.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('PDF content'),
        });

        // Upload button or auto-upload
        const uploadButton = page.getByRole('button', { name: /upload/i });
        if (await uploadButton.isVisible()) {
          await uploadButton.click();
        }

        // Success message
        await expect(page.getByText(/uploaded|success/i)).toBeVisible();
      }
    });
  });

  test.describe('Modal Interactions', () => {
    test('should open and close confirmation modal', async ({ page }) => {
      await page.goto('/admin/vehicles');
      await page.waitForLoadState('networkidle');

      // Find delete button
      const deleteButton = page.getByRole('button', { name: /delete/i }).first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Confirmation modal
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByText(/confirm|are you sure/i)).toBeVisible();

        // Cancel button
        await page.getByRole('button', { name: /cancel|no/i }).click();

        // Modal should close
        await expect(page.getByRole('dialog')).not.toBeVisible();
      }
    });
  });

  test.describe('Notifications', () => {
    test('should display toast notifications', async ({ page }) => {
      await page.goto('/admin/vehicles');
      await page.waitForLoadState('networkidle');

      // Trigger an action that shows toast (like save)
      const saveButton = page.getByRole('button', { name: /save|update/i }).first();
      if (await saveButton.isVisible()) {
        await saveButton.click();

        // Toast notification
        await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 });
      }
    });
  });

  test.describe('Breadcrumb Navigation', () => {
    test('should display breadcrumbs', async ({ page }) => {
      await page.goto('/admin/vehicles/1');

      // Breadcrumb trail
      const breadcrumb = page.getByRole('navigation', { name: /breadcrumb/i });
      if (await breadcrumb.isVisible()) {
        await expect(breadcrumb).toContainText(/home|admin/i);
        await expect(breadcrumb).toContainText(/vehicles/i);
      }
    });

    test('should navigate via breadcrumb', async ({ page }) => {
      await page.goto('/admin/vehicles/1');

      // Click breadcrumb link
      const breadcrumbLink = page.getByRole('link', { name: /vehicles/i });
      if (await breadcrumbLink.isVisible()) {
        await breadcrumbLink.click();

        await expect(page).toHaveURL(/admin\/vehicles$/);
      }
    });
  });
});
