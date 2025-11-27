import React from 'react';
import { render, screen } from '@testing-library/react-native';
import Welcome from './Welcome';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';

test('renders welcome message', () => {
    render(
        <ThemeProvider>
            <AuthProvider>
                <Welcome />
            </AuthProvider>
        </ThemeProvider>
    );
    const element = screen.getByText(/smartera/i);
    expect(element).toBeTruthy();
});