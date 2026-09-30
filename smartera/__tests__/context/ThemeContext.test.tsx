import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { ThemeProvider, useTheme } from '../../context/ThemeContext';

jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  const useColorScheme = jest.fn(() => 'light');
  return new Proxy(actual, {
    get(target, key) {
      return key === 'useColorScheme' ? useColorScheme : Reflect.get(target, key);
    },
  });
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('ThemeContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider>{children}</ThemeProvider>
  );

  describe('useTheme', () => {
    it('throws when used outside ThemeProvider', () => {
      expect(() => {
        renderHook(() => useTheme());
      }).toThrow('useTheme must be used within a ThemeProvider');
    });

    it('provides theme context values', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current).toHaveProperty('theme');
      expect(result.current).toHaveProperty('toggleTheme');
      expect(result.current).toHaveProperty('isDarkMode');
    });

    it('defaults to system color scheme', async () => {
      (useColorScheme as jest.Mock).mockReturnValue('light');

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme).toBe('light');
      expect(result.current.isDarkMode).toBe(false);
    });

    it('uses dark mode when system prefers dark', async () => {
      (useColorScheme as jest.Mock).mockReturnValue('dark');

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme).toBe('dark');
      expect(result.current.isDarkMode).toBe(true);
    });
  });

  describe('toggleTheme', () => {
    it('switches from light to dark', async () => {
      (useColorScheme as jest.Mock).mockReturnValue('light');

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme).toBe('light');

      await act(async () => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe('dark');
      expect(result.current.isDarkMode).toBe(true);
    });

    it('switches from dark to light', async () => {
      (useColorScheme as jest.Mock).mockReturnValue('dark');

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme).toBe('dark');

      await act(async () => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe('light');
      expect(result.current.isDarkMode).toBe(false);
    });

    it('persists theme to AsyncStorage', async () => {
      (useColorScheme as jest.Mock).mockReturnValue('light');

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        result.current.toggleTheme();
      });

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
    });
  });

  describe('saved theme preference', () => {
    it('loads saved theme from AsyncStorage', async () => {
      (useColorScheme as jest.Mock).mockReturnValue('light');
      mockAsyncStorage.getItem.mockResolvedValue('dark');

      const { result } = renderHook(() => useTheme(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      expect(result.current.theme).toBe('dark');
    });
  });
});
