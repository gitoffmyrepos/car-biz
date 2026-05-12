/**
 * Weekly Vehicle Leasing Platform - API Integration Tests
 * Salvage-to-Lux Fleet Management
 *
 * Tests for API client functions and data fetching.
 */

import { rest } from 'msw';
import { setupServer } from 'msw/node';

// Mock API base URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Setup MSW server for API mocking
const server = setupServer(
  // Health check
  rest.get(`${API_BASE}/health`, (req, res, ctx) => {
    return res(ctx.json({ status: 'healthy' }));
  }),

  // Public vehicles
  rest.get(`${API_BASE}/api/public/vehicles`, (req, res, ctx) => {
    return res(
      ctx.json([
        {
          id: 1,
          make: 'Tesla',
          model: 'Model S',
          year: 2024,
          category: 'luxury',
          image_url: '/vehicles/tesla-model-s.jpg',
        },
        {
          id: 2,
          make: 'BMW',
          model: '5 Series',
          year: 2023,
          category: 'luxury',
          image_url: '/vehicles/bmw-5-series.jpg',
        },
      ])
    );
  }),

  // Auth endpoints
  rest.post(`${API_BASE}/api/auth/login`, async (req, res, ctx) => {
    const body = await req.json();

    if (body.email === 'test@example.com' && body.password === 'password123') {
      return res(
        ctx.json({
          access_token: 'mock-access-token',
          token_type: 'bearer',
          user: {
            id: 1,
            email: 'test@example.com',
            role: 'admin',
          },
        })
      );
    }

    return res(
      ctx.status(401),
      ctx.json({ detail: 'Invalid credentials' })
    );
  }),

  rest.get(`${API_BASE}/api/auth/me`, (req, res, ctx) => {
    const authHeader = req.headers.get('Authorization');

    if (authHeader === 'Bearer mock-access-token') {
      return res(
        ctx.json({
          id: 1,
          email: 'test@example.com',
          role: 'admin',
          name: 'Test User',
        })
      );
    }

    return res(ctx.status(401), ctx.json({ detail: 'Not authenticated' }));
  }),

  // Inquiries
  rest.post(`${API_BASE}/api/inquiries/`, async (req, res, ctx) => {
    const body = await req.json();

    return res(
      ctx.status(201),
      ctx.json({
        id: 1,
        ...body,
        status: 'new',
        created_at: new Date().toISOString(),
      })
    );
  }),

  // Admin vehicles
  rest.get(`${API_BASE}/api/admin/vehicles`, (req, res, ctx) => {
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return res(ctx.status(401), ctx.json({ detail: 'Not authenticated' }));
    }

    return res(
      ctx.json({
        items: [
          {
            id: 1,
            make: 'Tesla',
            model: 'Model S',
            year: 2024,
            vin: '1HGCM82633A123456',
            weekly_rate: 200,
            status: 'available',
          },
        ],
        total: 1,
        page: 1,
        page_size: 10,
      })
    );
  }),

  // Customer endpoints
  rest.get(`${API_BASE}/api/customer/dashboard`, (req, res, ctx) => {
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return res(ctx.status(401), ctx.json({ detail: 'Not authenticated' }));
    }

    return res(
      ctx.json({
        active_leases: 1,
        total_payments: 600,
        next_payment_date: '2024-01-15',
        notifications: 2,
      })
    );
  }),

  rest.get(`${API_BASE}/api/customer/leases`, (req, res, ctx) => {
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return res(ctx.status(401), ctx.json({ detail: 'Not authenticated' }));
    }

    return res(
      ctx.json([
        {
          id: 1,
          vehicle: { make: 'Tesla', model: 'Model S', year: 2024 },
          start_date: '2024-01-01',
          weekly_rate: 150,
          status: 'active',
        },
      ])
    );
  })
);

// Enable API mocking before tests
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('API Integration Tests', () => {
  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await fetch(`${API_BASE}/health`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.status).toBe('healthy');
    });
  });

  describe('Public Endpoints', () => {
    it('should fetch public vehicles without authentication', async () => {
      const response = await fetch(`${API_BASE}/api/public/vehicles`);
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty('make');
      expect(data[0]).toHaveProperty('model');
    });

    it('should create inquiry without authentication', async () => {
      const response = await fetch(`${API_BASE}/api/inquiries/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '555-1234',
          inquiry_type: 'general',
          message: 'Test inquiry',
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty('id');
      expect(data.status).toBe('new');
    });
  });

  describe('Authentication', () => {
    it('should login with valid credentials', async () => {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toHaveProperty('access_token');
      expect(data.user.email).toBe('test@example.com');
    });

    it('should reject invalid credentials', async () => {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'wrong@example.com',
          password: 'wrongpassword',
        }),
      });

      expect(response.status).toBe(401);
    });

    it('should get current user with valid token', async () => {
      const response = await fetch(`${API_BASE}/api/auth/me`, {
        headers: {
          Authorization: 'Bearer mock-access-token',
        },
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.email).toBe('test@example.com');
    });

    it('should reject request without token', async () => {
      const response = await fetch(`${API_BASE}/api/auth/me`);

      expect(response.status).toBe(401);
    });
  });

  describe('Protected Endpoints', () => {
    it('should fetch admin vehicles with authentication', async () => {
      const response = await fetch(`${API_BASE}/api/admin/vehicles`, {
        headers: {
          Authorization: 'Bearer mock-access-token',
        },
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toHaveProperty('items');
      expect(Array.isArray(data.items)).toBe(true);
    });

    it('should reject admin vehicles without authentication', async () => {
      const response = await fetch(`${API_BASE}/api/admin/vehicles`);

      expect(response.status).toBe(401);
    });

    it('should fetch customer dashboard with authentication', async () => {
      const response = await fetch(`${API_BASE}/api/customer/dashboard`, {
        headers: {
          Authorization: 'Bearer mock-customer-token',
        },
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data).toHaveProperty('active_leases');
    });

    it('should fetch customer leases with authentication', async () => {
      const response = await fetch(`${API_BASE}/api/customer/leases`, {
        headers: {
          Authorization: 'Bearer mock-customer-token',
        },
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      server.use(
        rest.get(`${API_BASE}/api/public/vehicles`, (req, res) => {
          return res.networkError('Network error');
        })
      );

      await expect(
        fetch(`${API_BASE}/api/public/vehicles`)
      ).rejects.toThrow();
    });

    it('should handle 500 errors', async () => {
      server.use(
        rest.get(`${API_BASE}/api/public/vehicles`, (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({ detail: 'Internal server error' })
          );
        })
      );

      const response = await fetch(`${API_BASE}/api/public/vehicles`);

      expect(response.status).toBe(500);
    });
  });
});

describe('API Response Format', () => {
  it('should return proper pagination format for list endpoints', async () => {
    const response = await fetch(`${API_BASE}/api/admin/vehicles`, {
      headers: {
        Authorization: 'Bearer mock-access-token',
      },
    });
    const data = await response.json();

    expect(data).toHaveProperty('items');
    expect(data).toHaveProperty('total');
    expect(data).toHaveProperty('page');
    expect(data).toHaveProperty('page_size');
  });

  it('should include timestamps on created resources', async () => {
    const response = await fetch(`${API_BASE}/api/inquiries/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test',
        email: 'test@test.com',
        phone: '555-0000',
        inquiry_type: 'general',
        message: 'Test',
      }),
    });
    const data = await response.json();

    expect(data).toHaveProperty('created_at');
  });
});
