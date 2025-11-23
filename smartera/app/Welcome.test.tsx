import React from 'react';
import { render, screen } from '@testing-library/react';
import Welcome from './Welcome';

test('renders welcome message', () => {
    render(<Welcome />);
    const linkElement = screen.getByText(/welcome/i);
    expect(linkElement).toBeInTheDocument();
});