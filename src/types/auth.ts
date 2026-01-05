export type AppRole = 'teacher' | 'secretary' | 'admin' | 'director';

export interface UserProfile {
  id: string;
  school_id: string | null;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  school_id: string;
  created_at: string;
}

export interface School {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Sector {
  id: string;
  school_id: string;
  name: string;
  description: string | null;
  evolution_instance: string | null;
  whatsapp_number: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: UserProfile | null;
  roles: AppRole[];
  school: School | null;
  sectors: Sector[];
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Role-based permissions
export const ROLE_PERMISSIONS: Record<AppRole, string[]> = {
  teacher: ['pedagogico', 'diario', 'turmas'],
  secretary: ['secretaria', 'turmas', 'alunos', 'mensagens'],
  admin: ['administrativo', 'financeiro', 'mensagens'],
  director: ['*'], // Acesso total
};

export const ROLE_LABELS: Record<AppRole, string> = {
  teacher: 'Professora',
  secretary: 'Secretaria',
  admin: 'Administrativo',
  director: 'Diretora',
};
