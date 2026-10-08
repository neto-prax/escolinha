import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, UserProfile, School, Sector } from '@/types/auth';
import { useToast } from '@/hooks/use-toast';
import { resetSchoolIdCache } from '@/lib/cloudState';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  roles: AppRole[];
  school: School | null;
  availableSchools: School[];
  isSuperAdmin: boolean;
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
  selectSchool: (schoolId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [school, setSchool] = useState<School | null>(null);
  const [availableSchools, setAvailableSchools] = useState<School[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const activeUserId = useRef<string | null>(null);
  const { toast } = useToast();

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      // Fetch profile
      // 1. Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData as UserProfile);

      // Fetch roles
      // 2. Fetch roles
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
      // 3. Check super admin status
      const { data: superAdminData } = await supabase
        .from('super_admins')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      const { data: sessionUser } = await supabase.auth.getUser();
      const isSuper = !!superAdminData || sessionUser?.user?.email === 'sport@gmail.com';
      setIsSuperAdmin(isSuper);

      if (isSuper) {
        // Super admin has all permissions
        const superRoles: AppRole[] = Array.from(new Set([...userRoles, 'director' as AppRole]));
        setRoles(superRoles);

        // Fetch all schools for the super admin
        const { data: allSchoolsData } = await supabase
          .from('schools')
          .select('*')
          .eq('id', profileData.school_id)
          .single();
          .order('name');
        const schoolList = (allSchoolsData as School[]) || [];
        setAvailableSchools(schoolList);

        if (!schoolError && schoolData) {
          setSchool(schoolData as School);
        // Determine active school
        let activeSchool: School | null = null;
        const savedSchoolId = typeof window !== 'undefined' ? localStorage.getItem('super_admin_active_school_id') : null;
        if (savedSchoolId && schoolList.some((s) => s.id === savedSchoolId)) {
          activeSchool = schoolList.find((s) => s.id === savedSchoolId) || null;
        } else if (profileData?.school_id && schoolList.some((s) => s.id === profileData.school_id)) {
          activeSchool = schoolList.find((s) => s.id === profileData.school_id) || null;
        } else if (schoolList.length > 0) {
          activeSchool = schoolList[0];
        }
      }

      // Fetch user sectors
      const { data: userSectorsData, error: sectorsError } = await supabase
        .from('user_sectors')
        .select('sector_id, sectors(*)')
        .eq('user_id', userId);
        setSchool(activeSchool);
        if (activeSchool && typeof window !== 'undefined') {
          localStorage.setItem('super_admin_active_school_id', activeSchool.id);
        }

      if (!sectorsError && userSectorsData) {
        const userSectors = userSectorsData
          .filter((us) => us.sectors)
          .map((us) => us.sectors as unknown as Sector);
        setSectors(userSectors);
        // Virtual profile ensuring school_id is available for all queries
        setProfile({
          ...(profileData as UserProfile),
          school_id: activeSchool?.id || profileData?.school_id || null,
        });

        // Fetch sectors for active school
        if (activeSchool?.id) {
          const { data: schoolSectors } = await supabase
            .from('sectors')
            .select('*')
            .eq('school_id', activeSchool.id);
          if (schoolSectors) {
            setSectors(schoolSectors as Sector[]);
          }
        }
      } else {
        // Standard user flow
        setProfile(profileData as UserProfile);
        setRoles(userRoles);
        setAvailableSchools([]);

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
        resetSchoolIdCache();
        const nextUserId = session?.user?.id ?? null;
        if (activeUserId.current !== nextUserId) {
          activeUserId.current = nextUserId;
          setProfile(null);
          setRoles([]);
          setSchool(null);
          setSectors([]);
          if (nextUserId) setIsLoading(true);
        }
        setSession(session);
        setUser(session?.user ?? null);

        // Defer Supabase calls with setTimeout
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id).finally(() => {
              setIsLoading(false);
            });
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
      activeUserId.current = session?.user?.id ?? null;

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
      resetSchoolIdCache();
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
    resetSchoolIdCache();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('super_admin_active_school_id');
    }
    await supabase.auth.signOut();
    toast({
      title: 'Logout realizado',
      description: 'Você foi desconectado com sucesso.',
    });
  };

  const selectSchool = async (schoolId: string) => {
    if (!isSuperAdmin) return;
    const targetSchool = availableSchools.find((s) => s.id === schoolId);
    if (!targetSchool) return;

    if (typeof window !== 'undefined') {
      localStorage.setItem('super_admin_active_school_id', schoolId);
    }
    resetSchoolIdCache();
    setSchool(targetSchool);
    if (profile) {
      setProfile({
        ...profile,
        school_id: targetSchool.id,
      });
    }

    const { data: schoolSectors } = await supabase
      .from('sectors')
      .select('*')
      .eq('school_id', targetSchool.id);
    if (schoolSectors) {
      setSectors(schoolSectors as Sector[]);
    }

    toast({
      title: 'Escola selecionada',
      description: `Visualizando escola: ${targetSchool.name}`,
    });

    window.dispatchEvent(new CustomEvent('school-changed', { detail: { schoolId } }));
  };

  const hasRole = (role: AppRole): boolean => {
    if (isSuperAdmin) return true;
    return roles.includes('director') || roles.includes(role);
  };

  const hasAnyRole = (checkRoles: AppRole[]): boolean => {
    if (isSuperAdmin) return true;
    return roles.includes('director') || checkRoles.some((role) => roles.includes(role));
  };

  const hasPermission = (module: string): boolean => {
    if (isSuperAdmin) return true;
    if (roles.includes('director')) return true;

    const modulePermissions: Record<string, AppRole[]> = {
      pedagogico: ['teacher', 'director'],
      diario: ['teacher', 'director'],
      turmas: ['teacher', 'secretary', 'director'],
      alunos: ['secretary', 'director'],
      secretaria: ['secretary', 'director'],
      mensagens: ['secretary', 'admin', 'director', 'teacher', 'seller'],
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
    if (isSuperAdmin) return true;
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
        availableSchools,
        isSuperAdmin,
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
        selectSchool,
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
