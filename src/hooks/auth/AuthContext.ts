import { createContext } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Database } from '../../lib/database.types.ts';

type Profile = Database['public']['Tables']['profiles']['Row'];

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isProfileComplete: boolean;
  is_admin: boolean;
  revalidateProfile: () => Promise<void>;
  refreshTrigger: number;
  triggerRefresh: () => void;
  resetEnrollments: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
