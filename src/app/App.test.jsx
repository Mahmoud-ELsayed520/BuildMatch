import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import App from './App';

describe('BuildMatch Root Application', () => {
  it('renders application brand title on home route', () => {
    render(<App />);
    const brandElements = screen.getAllByText(/BuildMatch/i);
    expect(brandElements.length).toBeGreaterThan(0);
  });
});
