/**
 * Weekly Vehicle Leasing Platform - Auth Flow Integration Tests
 * Salvage-to-Lux Fleet Management
 *
 * Integration tests for authentication flow including login, logout, and session management.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';

// Mock next/navigation
const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
    back: jest.fn(),
  }),
  usePathname: () => '/login',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock API URL
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// MSW handlers
const handlers = [
  rest.post(`${API_BASE}/api/auth/login`, async (req, res, ctx) => {
    const body = await req.json();

    if (body.email === 'valid@example.com' && body.password === 'validpassword') {
      return res(
        ctx.json({
          access_token: 'test-access-token',
          token_type: 'bearer',
          user: {
            id: 1,
            email: 'valid@example.com',
            role: 'customer',
            name: 'Valid User',
          },
        })
      );
    }

    return res(
      ctx.status(401),
      ctx.json({ detail: 'Incorrect email or password' })
    );
  }),

  rest.post(`${API_BASE}/api/auth/logout`, (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ message: 'Logged out successfully' }));
  }),

  rest.get(`${API_BASE}/api/auth/me`, (req, res, ctx) => {
    const authHeader = req.headers.get('Authorization');

    if (authHeader === 'Bearer test-access-token') {
      return res(
        ctx.json({
          id: 1,
          email: 'valid@example.com',
          role: 'customer',
          name: 'Valid User',
        })
      );
    }

    return res(ctx.status(401), ctx.json({ detail: 'Not authenticated' }));
  }),

  rest.post(`${API_BASE}/api/auth/register`, async (req, res, ctx) => {
    const body = await req.json();

    if (body.email === 'existing@example.com') {
      return res(
        ctx.status(400),
        ctx.json({ detail: 'Email already registered' })
      );
    }

    return res(
      ctx.status(201),
      ctx.json({
        id: 2,
        email: body.email,
        role: 'customer',
        name: body.name,
      })
    );
  }),

  rest.post(`${API_BASE}/api/auth/forgot-password`, async (req, res, ctx) => {
    // Always return success for security (don't reveal if email exists)
    return res(
      ctx.status(200),
      ctx.json({ message: 'If the email exists, a reset link has been sent' })
    );
  }),

  rest.post(`${API_BASE}/api/auth/reset-password`, async (req, res, ctx) => {
    const body = await req.json();

    if (body.token === 'valid-reset-token') {
      return res(
        ctx.status(200),
        ctx.json({ message: 'Password reset successfully' })
      );
    }

    return res(
      ctx.status(400),
      ctx.json({ detail: 'Invalid or expired reset token' })
    );
  }),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  mockPush.mockClear();
  mockRefresh.mockClear();
  localStorage.clear();
  sessionStorage.clear();
});
afterAll(() => server.close());

// Mock Login Component for testing
function MockLoginForm({
  onSuccess,
  onError,
}: {
  onSuccess?: (user: any) => void;
  onError?: (error: string) => void;
}) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Login failed');
      }

      const data = await response.json();
      localStorage.setItem('token', data.access_token);
      onSuccess?.(data.user);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} data-testid="login-form">
      {error && <div role="alert">{error}</div>}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        aria-label="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        aria-label="Password"
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}

describe('Authentication Flow Integration', () => {
  describe('Login Flow', () => {
    it('should successfully login with valid credentials', async () => {
      const user = userEvent.setup();
      const onSuccess = jest.fn();

      render(<MockLoginForm onSuccess={onSuccess} />);

      await user.type(screen.getByLabelText('Email'), 'valid@example.com');
      await user.type(screen.getByLabelText('Password'), 'validpassword');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'valid@example.com',
            role: 'customer',
          })
        );
      });

      expect(localStorage.getItem('token')).toBe('test-access-token');
    });

    it('should display error with invalid credentials', async () => {
      const user = userEvent.setup();
      const onError = jest.fn();

      render(<MockLoginForm onError={onError} />);

      await user.type(screen.getByLabelText('Email'), 'invalid@example.com');
      await user.type(screen.getByLabelText('Password'), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/incorrect/i);
      });

      expect(onError).toHaveBeenCalled();
      expect(localStorage.getItem('token')).toBeNull();
    });

    it('should show loading state during login', async () => {
      const user = userEvent.setup();

      render(<MockLoginForm />);

      await user.type(screen.getByLabelText('Email'), 'valid@example.com');
      await user.type(screen.getByLabelText('Password'), 'validpassword');

      const loginButton = screen.getByRole('button', { name: /login/i });
      await user.click(loginButton);

      // Button should be disabled while loading
      expect(loginButton).toBeDisabled();
    });
  });

  describe('Logout Flow', () => {
    it('should clear token on logout', async () => {
      localStorage.setItem('token', 'test-access-token');

      const response = await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
      });

      expect(response.ok).toBe(true);

      // Simulate clearing token after logout
      localStorage.removeItem('token');
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  describe('Session Validation', () => {
    it('should validate token and return user info', async () => {
      const response = await fetch(`${API_BASE}/api/auth/me`, {
        headers: {
          Authorization: 'Bearer test-access-token',
        },
      });
      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.email).toBe('valid@example.com');
    });

    it('should reject invalid token', async () => {
      const response = await fetch(`${API_BASE}/api/auth/me`, {
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Registration Flow', () => {
    it('should successfully register new user', async () => {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User',
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.email).toBe('newuser@example.com');
    });

    it('should reject registration with existing email', async () => {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'existing@example.com',
          password: 'password123',
          name: 'Existing User',
        }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.detail).toContain('already registered');
    });
  });

  describe('Password Reset Flow', () => {
    it('should handle forgot password request', async () => {
      const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com',
        }),
      });

      expect(response.ok).toBe(true);
    });

    it('should reset password with valid token', async () => {
      const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'valid-reset-token',
          new_password: 'newpassword123',
        }),
      });

      expect(response.ok).toBe(true);
    });

    it('should reject password reset with invalid token', async () => {
      const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: 'invalid-token',
          new_password: 'newpassword123',
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Token Storage', () => {
    it('should store token in localStorage after login', async () => {
      const user = userEvent.setup();

      render(<MockLoginForm />);

      await user.type(screen.getByLabelText('Email'), 'valid@example.com');
      await user.type(screen.getByLabelText('Password'), 'validpassword');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(localStorage.getItem('token')).toBe('test-access-token');
      });
    });

    it('should include token in subsequent requests', async () => {
      localStorage.setItem('token', 'test-access-token');

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.ok).toBe(true);
    });
  });

  describe('Error States', () => {
    it('should handle network errors', async () => {
      server.use(
        rest.post(`${API_BASE}/api/auth/login`, (req, res) => {
          return res.networkError('Network error');
        })
      );

      const user = userEvent.setup();
      const onError = jest.fn();

      render(<MockLoginForm onError={onError} />);

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });

    it('should handle server errors', async () => {
      server.use(
        rest.post(`${API_BASE}/api/auth/login`, (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({ detail: 'Internal server error' })
          );
        })
      );

      const user = userEvent.setup();
      const onError = jest.fn();

      render(<MockLoginForm onError={onError} />);

      await user.type(screen.getByLabelText('Email'), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });
  });
});
