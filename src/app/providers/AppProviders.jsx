import React from 'react';
import { AuthProvider } from '../../context/AuthContext';
import { NotificationProvider } from '../../context/NotificationContext';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';

export function AppProviders({ children }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
