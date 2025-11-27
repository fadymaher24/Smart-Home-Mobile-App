import React from 'react';
import { render, screen } from '@testing-library/react-native';
import LoginScreen from './LoginScreen';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';

test('renders LoginScreen component', () => {
    render(
        <ThemeProvider>
            <AuthProvider>
                <LoginScreen />
            </AuthProvider>
        </ThemeProvider>
    );
    const element = screen.getByText(/login/i);
    expect(element).toBeTruthy();
});