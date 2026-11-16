import React from 'react';
import { cn } from '../../utils/cn';

export function Spinner({ size = 'md', className }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div
      className={cn(
        'rounded-full border-gray-200 border-t-brand-600 animate-spin',
        sizes[size],
        className
      )}
      role="status"
      aria-label="loading"
    />
  );
}
