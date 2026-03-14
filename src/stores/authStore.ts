import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthState {
  user: User | null;
  profile: any | null;
  loading: boolean;
  initialize: () => Promise<void>;
  setProfile: (profile: any | null) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,

  initialize: async () => {
    // Get current session first
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      set({ user: session.user, profile, loading: false });
    } else {
      set({ user: null, profile: null, loading: false });
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        set({ user: session.user, profile, loading: false });
      } else {
        set({ user: null, profile: null, loading: false });
      }
    });
  },

  setProfile: (profile) => set({ profile }),

  reset: () => set({ user: null, profile: null, loading: false }),
}));
