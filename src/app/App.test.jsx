import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import App from './App';

describe('BuildMatch Root Application', () => {
  it('renders application brand title on home route', async () => {
    render(<App />);
    await waitFor(() => {
      const brandElements = screen.getAllByText(/BuildMatch/i);
      expect(brandElements.length).toBeGreaterThan(0);
    });
  });
});
