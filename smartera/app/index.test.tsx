import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './index';

test('renders the app', () => {
	render(<App />);
	const linkElement = screen.getByText(/welcome/i);
	expect(linkElement).toBeInTheDocument();
});