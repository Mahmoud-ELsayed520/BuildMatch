import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import { Button } from '../../components/ui/Button';

export function NotFoundPage() {
  return <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
    <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">404</p>
    <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
    <p className="text-sm text-gray-600">The page you requested does not exist or is no longer available.</p>
    <Link to={ROUTES.HOME}><Button>Return home</Button></Link>
  </main>;
}
