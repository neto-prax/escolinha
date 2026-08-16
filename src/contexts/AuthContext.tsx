import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, UserProfile, School, Sector } from '@/types/auth';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  roles: AppRole[];
  school: School | null;
  sectors: Sector[];
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  hasPermission: (module: string) => boolean;
  hasSectorAccess: (sectorId: string) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [school, setSchool] = useState<School | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData as UserProfile);

      // Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesError) throw rolesError;
      const userRoles = rolesData?.map((r) => r.role as AppRole) || [];
      setRoles(userRoles);

      // Fetch school if user has one
      if (profileData?.school_id) {
        const { data: schoolData, error: schoolError } = await supabase
          .from('schools')
          .select('*')
          .eq('id', profileData.school_id)
          .single();

        if (!schoolError && schoolData) {
          setSchool(schoolData as School);
        }
      }

      // Fetch user sectors
      const { data: userSectorsData, error: sectorsError } = await supabase
        .from('user_sectors')
        .select('sector_id, sectors(*)')
        .eq('user_id', userId);

      if (!sectorsError && userSectorsData) {
        const userSectors = userSectorsData
          .filter((us) => us.sectors)
          .map((us) => us.sectors as unknown as Sector);
        setSectors(userSectors);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchUserData(user.id);
    }
  }, [user?.id, fetchUserData]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer Supabase calls with setTimeout
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setSchool(null);
          setSectors([]);
        }

        if (event === 'SIGNED_OUT') {
          setIsLoading(false);
        }

        // Handle token refresh errors - force sign out
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.warn('Token refresh failed, signing out');
          supabase.auth.signOut();
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Session recovery failed:', error.message);
        // Clear invalid session state
        setSession(null);
        setUser(null);
        setProfile(null);
        setRoles([]);
        setSchool(null);
        setSectors([]);
        setIsLoading(false);
        supabase.auth.signOut();
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchUserData(session.user.id).finally(() => {
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: 'Logout realizado',
      description: 'Você foi desconectado com sucesso.',
    });
  };

  const hasRole = (role: AppRole): boolean => {
    return roles.includes('director') || roles.includes(role);
  };

  const hasAnyRole = (checkRoles: AppRole[]): boolean => {
    return roles.includes('director') || checkRoles.some((role) => roles.includes(role));
  };

  const hasPermission = (module: string): boolean => {
    if (roles.includes('director')) return true;

    const modulePermissions: Record<string, AppRole[]> = {
      pedagogico: ['teacher', 'director'],
      diario: ['teacher', 'director'],
      turmas: ['teacher', 'secretary', 'director'],
      alunos: ['secretary', 'director'],
      secretaria: ['secretary', 'director'],
      mensagens: ['secretary', 'admin', 'director'],
      setores: ['director'],
      administrativo: ['admin', 'director'],
      financeiro: ['admin', 'director'],
      relatorios: ['teacher', 'secretary', 'admin', 'director'],
      configuracoes: ['director'],
      usuarios: ['director'],
      vendas: ['seller', 'director'],
    };

    const allowedRoles = modulePermissions[module] || [];
    return allowedRoles.some((role) => roles.includes(role));
  };

  const hasSectorAccess = (sectorId: string): boolean => {
    if (roles.includes('director')) return true;
    return sectors.some((sector) => sector.id === sectorId);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        school,
        sectors,
        isLoading,
        isAuthenticated: !!user,
        signIn,
        signUp,
        signOut,
        hasRole,
        hasAnyRole,
        hasPermission,
        hasSectorAccess,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
