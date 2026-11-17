import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { AppProviders } from './providers/AppProviders';

export function App() {
  return (
    <AppProviders>
      <React.Suspense fallback={<div className="p-6 text-center" role="status" aria-live="polite">Loading page…</div>}>
        <RouterProvider router={router} />
      </React.Suspense>
    </AppProviders>
  );
}

export default App;
