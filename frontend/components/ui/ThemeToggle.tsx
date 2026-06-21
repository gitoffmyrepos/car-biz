'use client';

/**
 * Theme Toggle Component
 * GigWheels
 *
 * Provides dark mode toggle with system preference detection
 * and persistent storage of user preference.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'gigwheels-theme';

/**
 * Get system preference for dark/light mode
 */
function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Get stored theme preference from localStorage
 */
function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // localStorage might be unavailable
  }
  return null;
}

/**
 * Store theme preference in localStorage
 */
function storeTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // localStorage might be unavailable
  }
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

/**
 * ThemeProvider - Manages theme state and applies dark mode class to html element
 */
export function ThemeProvider({ children, defaultTheme = 'system' }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  // Initialize theme from storage on mount
  useEffect(() => {
    const stored = getStoredTheme();
    if (stored) {
      setThemeState(stored);
    }
    setMounted(true);
  }, []);

  // Update resolved theme when theme changes or system preference changes
  useEffect(() => {
    if (!mounted) return;

    const updateResolvedTheme = () => {
      let resolved: 'light' | 'dark';
      if (theme === 'system') {
        resolved = getSystemTheme();
      } else {
        resolved = theme;
      }
      setResolvedTheme(resolved);

      // Apply dark class to html element
      const root = document.documentElement;
      if (resolved === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    updateResolvedTheme();

    // Listen for system theme changes if using system theme
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => updateResolvedTheme();
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme, mounted]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    storeTheme(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light');
  }, [resolvedTheme, setTheme]);

  // Prevent hydration mismatch by not rendering until mounted
  const value: ThemeContextType = {
    theme,
    resolvedTheme: mounted ? resolvedTheme : 'light',
    setTheme,
    toggleTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to access theme context
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * Sun icon for light mode
 */
function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
      />
    </svg>
  );
}

/**
 * Moon icon for dark mode
 */
function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
      />
    </svg>
  );
}

/**
 * Computer/System icon
 */
function ComputerIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z"
      />
    </svg>
  );
}

interface ThemeToggleProps {
  /** Additional CSS class names */
  className?: string;
  /** Show label text alongside icons */
  showLabel?: boolean;
  /** Show dropdown for all options (light, dark, system) */
  showDropdown?: boolean;
}

/**
 * ThemeToggle - Button to toggle between light and dark modes
 *
 * Can be used as a simple toggle button or with a dropdown for system preference.
 */
export function ThemeToggle({ className = '', showLabel = false, showDropdown = false }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Simple toggle button (no dropdown)
  if (!showDropdown) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`
          inline-flex items-center justify-center p-2 rounded-lg
          text-gray-600 dark:text-gray-300
          hover:bg-gray-100 dark:hover:bg-gray-800
          focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2
          dark:focus:ring-offset-gray-900
          transition-colors duration-200
          ${className}
        `}
        aria-label={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
      >
        {resolvedTheme === 'light' ? (
          <MoonIcon className="w-5 h-5" />
        ) : (
          <SunIcon className="w-5 h-5" />
        )}
        {showLabel && (
          <span className="ml-2 text-sm font-medium">
            {resolvedTheme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </span>
        )}
      </button>
    );
  }

  // Dropdown with all options
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className={`
          inline-flex items-center justify-center p-2 rounded-lg
          text-gray-600 dark:text-gray-300
          hover:bg-gray-100 dark:hover:bg-gray-800
          focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2
          dark:focus:ring-offset-gray-900
          transition-colors duration-200
          ${className}
        `}
        aria-label="Theme options"
        aria-haspopup="true"
        aria-expanded={dropdownOpen}
      >
        {theme === 'system' ? (
          <ComputerIcon className="w-5 h-5" />
        ) : theme === 'dark' ? (
          <MoonIcon className="w-5 h-5" />
        ) : (
          <SunIcon className="w-5 h-5" />
        )}
        {showLabel && (
          <span className="ml-2 text-sm font-medium capitalize">{theme}</span>
        )}
      </button>

      {dropdownOpen && (
        <>
          {/* Backdrop to close dropdown */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setDropdownOpen(false)}
            aria-hidden="true"
          />

          {/* Dropdown menu */}
          <div
            className="
              absolute right-0 mt-2 w-40 z-50
              bg-white dark:bg-gray-800
              border border-gray-200 dark:border-gray-700
              rounded-lg shadow-lg
              overflow-hidden
            "
            role="menu"
          >
            <button
              type="button"
              onClick={() => {
                setTheme('light');
                setDropdownOpen(false);
              }}
              className={`
                flex items-center w-full px-4 py-2 text-left text-sm
                ${theme === 'light'
                  ? 'bg-gold-50 dark:bg-gold-900/30 text-gold-700 dark:text-gold-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
              role="menuitem"
            >
              <SunIcon className="w-4 h-4 mr-2" />
              Light
              {theme === 'light' && (
                <span className="ml-auto text-gold-600 dark:text-gold-400">✓</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setTheme('dark');
                setDropdownOpen(false);
              }}
              className={`
                flex items-center w-full px-4 py-2 text-left text-sm
                ${theme === 'dark'
                  ? 'bg-gold-50 dark:bg-gold-900/30 text-gold-700 dark:text-gold-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
              role="menuitem"
            >
              <MoonIcon className="w-4 h-4 mr-2" />
              Dark
              {theme === 'dark' && (
                <span className="ml-auto text-gold-600 dark:text-gold-400">✓</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setTheme('system');
                setDropdownOpen(false);
              }}
              className={`
                flex items-center w-full px-4 py-2 text-left text-sm
                ${theme === 'system'
                  ? 'bg-gold-50 dark:bg-gold-900/30 text-gold-700 dark:text-gold-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
              role="menuitem"
            >
              <ComputerIcon className="w-4 h-4 mr-2" />
              System
              {theme === 'system' && (
                <span className="ml-auto text-gold-600 dark:text-gold-400">✓</span>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Re-export ThemeContext for advanced use cases
export { ThemeContext };
