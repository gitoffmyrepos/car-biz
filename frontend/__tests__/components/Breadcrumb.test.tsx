/**
 * Weekly Vehicle Leasing Platform - Breadcrumb Component Tests
 * Salvage-to-Lux Fleet Management
 *
 * Unit tests for the breadcrumb navigation component.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  Breadcrumb,
  BreadcrumbContainer,
  BreadcrumbItem,
  generateBreadcrumbsFromPath,
  useBreadcrumbs,
} from '@/components/ui/Breadcrumb';

// Mock next/link
jest.mock('next/link', () => {
  return function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  };
});

describe('Breadcrumb', () => {
  describe('rendering', () => {
    it('should render nothing when items array is empty and showHome is false', () => {
      const { container } = render(
        <Breadcrumb items={[]} showHome={false} />
      );

      expect(container.querySelector('nav')).toBeNull();
    });

    it('should render home link by default', () => {
      render(<Breadcrumb items={[]} />);

      expect(screen.getByText('Home')).toBeInTheDocument();
    });

    it('should not render home link when showHome is false', () => {
      render(
        <Breadcrumb
          items={[{ label: 'Dashboard' }]}
          showHome={false}
        />
      );

      expect(screen.queryByText('Home')).not.toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    it('should render all breadcrumb items', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Vehicles', href: '/dashboard/vehicles' },
        { label: 'Tesla Model S' },
      ];

      render(<Breadcrumb items={items} />);

      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Vehicles')).toBeInTheDocument();
      expect(screen.getByText('Tesla Model S')).toBeInTheDocument();
    });

    it('should render custom home label and href', () => {
      render(
        <Breadcrumb
          items={[]}
          homeLabel="Start"
          homeHref="/start"
        />
      );

      const homeLink = screen.getByText('Start').closest('a');
      expect(homeLink).toHaveAttribute('href', '/start');
    });
  });

  describe('links', () => {
    it('should render links for items with href that are not last', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Current Page' },
      ];

      render(<Breadcrumb items={items} />);

      const dashboardLink = screen.getByText('Dashboard').closest('a');
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    });

    it('should not render link for last item even if href provided', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Vehicles', href: '/vehicles' },
      ];

      render(<Breadcrumb items={items} />);

      const vehiclesElement = screen.getByText('Vehicles');
      expect(vehiclesElement.closest('a')).toBeNull();
    });

    it('should mark last item with aria-current="page"', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Current Page' },
      ];

      render(<Breadcrumb items={items} />);

      const currentPage = screen.getByText('Current Page');
      expect(currentPage.closest('[aria-current="page"]')).toBeInTheDocument();
    });
  });

  describe('separators', () => {
    it('should render default separators between items', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Vehicles' },
      ];

      render(<Breadcrumb items={items} />);

      // Default separator is an SVG, check for presence of separators
      const svgs = document.querySelectorAll('svg[aria-hidden="true"]');
      // Should have home icon + 2 separators
      expect(svgs.length).toBeGreaterThanOrEqual(2);
    });

    it('should render custom separator when provided', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Vehicles' },
      ];

      render(
        <Breadcrumb
          items={items}
          separator={<span data-testid="custom-separator">/</span>}
        />
      );

      const separators = screen.getAllByTestId('custom-separator');
      expect(separators.length).toBe(2); // Between Home-Dashboard and Dashboard-Vehicles
    });

    it('should not render separator before first item', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Only Item' },
      ];

      render(<Breadcrumb items={items} showHome={false} />);

      // Should only have the item, no separators
      const list = screen.getByRole('list');
      expect(list.querySelectorAll('li').length).toBe(1);
    });
  });

  describe('icons', () => {
    it('should render icon for home', () => {
      render(<Breadcrumb items={[]} />);

      // Home has an icon (the house SVG)
      const homeItem = screen.getByText('Home').closest('li');
      const homeIcon = homeItem?.querySelector('svg');
      expect(homeIcon).toBeInTheDocument();
    });

    it('should render custom icon for item', () => {
      const items: BreadcrumbItem[] = [
        {
          label: 'Settings',
          href: '/settings',
          icon: <span data-testid="settings-icon">⚙️</span>,
        },
      ];

      render(<Breadcrumb items={items} />);

      expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper aria-label on nav element', () => {
      const items: BreadcrumbItem[] = [{ label: 'Dashboard' }];

      render(<Breadcrumb items={items} />);

      expect(screen.getByLabelText('Breadcrumb')).toBeInTheDocument();
    });

    it('should use ordered list for items', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Dashboard' },
        { label: 'Settings' },
      ];

      render(<Breadcrumb items={items} />);

      expect(screen.getByRole('list')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should apply custom className', () => {
      render(
        <Breadcrumb items={[]} className="custom-class" />
      );

      const nav = screen.getByLabelText('Breadcrumb');
      expect(nav).toHaveClass('custom-class');
    });

    it('should style last item differently', () => {
      const items: BreadcrumbItem[] = [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Current' },
      ];

      render(<Breadcrumb items={items} />);

      const currentItem = screen.getByText('Current');
      expect(currentItem).toHaveClass('font-medium');
    });
  });
});

describe('BreadcrumbContainer', () => {
  it('should render children', () => {
    render(
      <BreadcrumbContainer>
        <span data-testid="child">Child content</span>
      </BreadcrumbContainer>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should apply default styles', () => {
    render(
      <BreadcrumbContainer>
        <span>Content</span>
      </BreadcrumbContainer>
    );

    const container = screen.getByText('Content').parentElement;
    expect(container).toHaveClass('bg-white', 'border-b');
  });

  it('should apply custom className', () => {
    render(
      <BreadcrumbContainer className="custom-container">
        <span>Content</span>
      </BreadcrumbContainer>
    );

    const container = screen.getByText('Content').parentElement;
    expect(container).toHaveClass('custom-container');
  });
});

describe('generateBreadcrumbsFromPath', () => {
  it('should return empty array for root path', () => {
    expect(generateBreadcrumbsFromPath('/')).toEqual([]);
  });

  it('should return empty array for empty path', () => {
    expect(generateBreadcrumbsFromPath('')).toEqual([]);
  });

  it('should generate breadcrumbs from simple path', () => {
    const result = generateBreadcrumbsFromPath('/dashboard');

    expect(result).toEqual([
      { label: 'Dashboard', href: undefined },
    ]);
  });

  it('should generate breadcrumbs from nested path', () => {
    const result = generateBreadcrumbsFromPath('/dashboard/vehicles');

    expect(result).toEqual([
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Vehicles', href: undefined },
    ]);
  });

  it('should skip numeric IDs in path', () => {
    const result = generateBreadcrumbsFromPath('/dashboard/vehicles/123');

    expect(result).toEqual([
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Vehicles', href: undefined },
    ]);
  });

  it('should use labelMap for custom labels', () => {
    const result = generateBreadcrumbsFromPath('/admin/users', {
      admin: 'Administration',
      users: 'User Management',
    });

    expect(result).toEqual([
      { label: 'Administration', href: '/admin' },
      { label: 'User Management', href: undefined },
    ]);
  });

  it('should format kebab-case segments as title case', () => {
    const result = generateBreadcrumbsFromPath('/user-settings');

    expect(result).toEqual([
      { label: 'User Settings', href: undefined },
    ]);
  });

  it('should handle trailing slashes', () => {
    const result = generateBreadcrumbsFromPath('/dashboard/');

    expect(result).toEqual([
      { label: 'Dashboard', href: undefined },
    ]);
  });
});

describe('useBreadcrumbs', () => {
  it('should return breadcrumbs with default labels', () => {
    const result = useBreadcrumbs('/dashboard/vehicles');

    expect(result).toEqual([
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Vehicles', href: undefined },
    ]);
  });

  it('should merge custom labels with defaults', () => {
    const result = useBreadcrumbs('/dashboard/inventory', {
      inventory: 'Fleet Inventory',
    });

    expect(result).toEqual([
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Fleet Inventory', href: undefined },
    ]);
  });

  it('should use default label for settings', () => {
    const result = useBreadcrumbs('/settings');

    expect(result).toEqual([
      { label: 'Settings', href: undefined },
    ]);
  });
});
