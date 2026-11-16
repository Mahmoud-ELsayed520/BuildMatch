import { useAuth } from './useAuth';

export function useRole() {
  const { role, isLandowner, isContractor, isAdmin, loading } = useAuth();
  return { role, isLandowner, isContractor, isAdmin, loading };
}
