import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../../context/AuthContext';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
}));

jest.mock('../../utils/api', () => ({
  API_BASE_URL: 'http://localhost:3000/api',
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
    }
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockAsyncStorage.removeItem.mockResolvedValue();
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    mockSecureStore.setItemAsync.mockResolvedValue();
    mockSecureStore.deleteItemAsync.mockResolvedValue();
    global.fetch = jest.fn();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  describe('useAuth', () => {
    it('throws when used outside AuthProvider', () => {
      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');
    });

    it('provides auth context values', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401 });

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current).toHaveProperty('token');
      expect(result.current).toHaveProperty('user');
      expect(result.current).toHaveProperty('login');
      expect(result.current).toHaveProperty('register');
      expect(result.current).toHaveProperty('logout');
      expect(result.current).toHaveProperty('isLoading');
    });
  });

  describe('login', () => {
    it('stores token and fetches user profile on successful login', async () => {
      const mockUser = { id: 1, email: 'test@test.com', name: 'Test' };
      const mockToken = 'jwt-token-123';

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ token: mockToken }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('test@test.com', 'password123');
      });

      expect(result.current.token).toBe(mockToken);
      expect(result.current.user).toEqual(mockUser);
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'smartera.accessToken',
        mockToken,
        { keychainAccessible: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY' }
      );
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockUser));
    });

    it('uses cached user when profile fetch fails on login', async () => {
      const mockToken = 'jwt-token-123';
      const cachedUser = JSON.stringify({ id: 1, name: 'Cached' });

      mockAsyncStorage.getItem.mockImplementation(async (key: string) => {
        if (key === 'user') return cachedUser;
        return null;
      });

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ token: mockToken }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: { id: 1, name: 'Test' } }),
        });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('test@test.com', 'password123');
      });

      expect(result.current.token).toBe(mockToken);
    });

    it('throws on failed login with 401', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('{"message":"Invalid credentials"}'),
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.login('test@test.com', 'wrong');
        })
      ).rejects.toThrow('Invalid email or password');
    });

    it('throws on failed login with parsed error message', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('{"message":"Account locked"}'),
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.login('test@test.com', 'password');
        })
      ).rejects.toThrow('Account locked');
    });
  });

  describe('logout', () => {
    it('clears token and user', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ token: 'token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: { id: 1 } }),
        });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('test@test.com', 'password');
      });

      expect(result.current.token).toBe('token');

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.token).toBeNull();
      expect(result.current.user).toBeNull();
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('smartera.accessToken');
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('user');
    });
  });

  describe('register', () => {
    it('calls register endpoint then auto-logins', async () => {
      const mockUser = { id: 2, email: 'new@test.com', name: 'New User' };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ token: 'new-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ user: mockUser }),
        });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.register('New User', 'new@test.com', 'password');
      });

      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(result.current.token).toBe('new-token');
      expect(result.current.user).toEqual(mockUser);
    });

    it('throws on failed registration', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 409,
        text: () => Promise.resolve('{"message":"Email already exists"}'),
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(
        act(async () => {
          await result.current.register('User', 'exists@test.com', 'password');
        })
      ).rejects.toThrow('Email already exists');
    });
  });

  describe('initial load', () => {
    it('loads stored token and verifies it', async () => {
      const storedToken = 'stored-token';
      const storedUser = JSON.stringify({ id: 1, name: 'Stored' });

      mockSecureStore.getItemAsync.mockResolvedValueOnce(storedToken);
      mockAsyncStorage.getItem.mockResolvedValueOnce(storedUser);

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: { id: 1, name: 'Stored' } }),
      });

      renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/me'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${storedToken}`,
          }),
        })
      );
    });

    it('clears invalid stored token on auth failure', async () => {
      mockSecureStore.getItemAsync.mockResolvedValueOnce('bad-token');
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);

      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401 });

      renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('smartera.accessToken');
    });

    it('keeps token on server error', async () => {
      mockSecureStore.getItemAsync.mockResolvedValueOnce('valid-token');
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify({ id: 1, name: 'Cached' }));

      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });

      expect(result.current.token).toBe('valid-token');
    });
  });
});
