import React from 'react';
import { render, screen } from '@testing-library/react-native';
import Welcome from './index';

// Mock navigation prop
const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
    reset: jest.fn(),
    isFocused: jest.fn(),
    canGoBack: jest.fn(),
    getId: jest.fn(),
    getState: jest.fn(),
    getParent: jest.fn(),
    setParams: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
};

test('renders the app', () => {
    render(<Welcome navigation={mockNavigation as any} />);
    const element = screen.getByText(/welcome/i);
    expect(element).toBeTruthy();
});