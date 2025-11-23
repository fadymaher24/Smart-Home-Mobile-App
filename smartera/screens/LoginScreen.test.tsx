import React from 'react';
import { render, screen } from '@testing-library/react';
import LoginScreen from '../LoginScreen';

test('renders LoginScreen component', () => {
    render(<LoginScreen />);
    const linkElement = screen.getByText(/login/i);
    expect(linkElement).toBeInTheDocument();
});