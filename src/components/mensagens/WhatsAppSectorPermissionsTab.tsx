import React, { useState, useMemo } from 'react';
import {
  Shield,
  ShieldCheck,
  Users,
  Building2,
  Search,
  Check,
  Info,
  Crown,
  Lock,
  Unlock,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWhatsAppInbox } from '@/hooks/useWhatsAppInbox';
import { toast } from 'sonner';

interface CollaboratorProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  is_director: boolean;
}

const DEFAULT_DEMO_COLLABORATORS: CollaboratorProfile[] = [
  {
    id: 'user-demo-dir',
    full_name: 'Dra. Ana Valéria (Diretoria)',
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
    role: 'Diretor(a)',
    is_director: true,
  },
  {
    id: 'user-demo-sec1',
    full_name: 'Beatriz Vasconcelos',
    avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&auto=format&fit=crop&q=80',
    role: 'Secretária',
    is_director: false,
  },
  {
    id: 'user-demo-fin1',
    full_name: 'Carla Dias',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
    role: 'Administrativo / Financeiro',
    is_director: false,
  },
  {
    id: 'user-demo-prof1',
    full_name: 'Juliana Castro',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80',
    role: 'Professor(a)',
    is_director: false,
  },
  {
    id: 'user-demo-vend1',
    full_name: 'Roberto Miranda',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
    role: 'Vendedor(a) / Comercial',
    is_director: false,
  },
];

export function WhatsAppSectorPermissionsTab() {
  const { school, roles, refreshProfile } = useAuth();
  const { allAvailableSectors } = useWhatsAppInbox();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');

  // Fallback demo user_sectors map (userId -> Set of sectorIds)
  const [localUserSectors, setLocalUserSectors] = useState<Record<string, string[]>>({
    'user-demo-sec1': ['secretaria'],
    'user-demo-fin1': ['financeiro'],
    'user-demo-prof1': ['pedagogico'],
    'user-demo-vend1': ['comercial'],
  });

  // Fetch real users from Supabase
  const { data: dbUsers = [] } = useQuery({
    queryKey: ['sector-permissions-users', school?.id],
    queryFn: async () => {
      if (!school?.id) return [];
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          avatar_url,
          user_roles(role)
        `)
        .eq('school_id', school.id)
        .eq('is_active', true);

      if (error || !profiles) return [];

      return profiles.map((p: any) => {
        const userRoles = p.user_roles?.map((ur: any) => ur.role) || [];
        const isDir = userRoles.includes('director') || userRoles.includes('admin');
        const roleLabel = isDir
          ? 'Diretor(a) / Admin'
          : userRoles[0]
          ? String(userRoles[0])
          : 'Colaborador';

        return {
          id: p.id,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          role: roleLabel,
          is_director: isDir,
        } as CollaboratorProfile;
      });
    },
    enabled: !!school?.id,
  });

  // Fetch real user_sectors relations from Supabase
  const { data: dbUserSectors = [] } = useQuery({
    queryKey: ['sector-permissions-relations', school?.id],
    queryFn: async () => {
      if (!school?.id) return [];
      const { data, error } = await supabase
        .from('user_sectors')
        .select('id, user_id, sector_id');

      if (error || !data) return [];
      return data;
    },
    enabled: !!school?.id,
  });

  const collaborators = useMemo(() => {
    return dbUsers.length > 0 ? dbUsers : DEFAULT_DEMO_COLLABORATORS;
  }, [dbUsers]);

  // Check if a user has access to a specific sector
  const hasUserAccessToSector = (userId: string, isDirector: boolean, sectorId: string) => {
    if (isDirector) return true;

    // Check DB
    if (dbUserSectors.length > 0) {
      return dbUserSectors.some((us) => us.user_id === userId && us.sector_id === sectorId);
    }

    // Check local fallback
    const userSects = localUserSectors[userId] || [];
    return userSects.includes(sectorId);
  };

  // Toggle permission
  const handleToggleAccess = async (userId: string, isDirector: boolean, sectorId: string) => {
    if (isDirector) {
      toast.info('Diretores possuem acesso integral a todos os setores por definição do sistema.');
      return;
    }

    const currentAccess = hasUserAccessToSector(userId, isDirector, sectorId);

    // If Supabase is connected
    if (school?.id && dbUsers.length > 0) {
      try {
        if (currentAccess) {
          // Remove relation
          await supabase
            .from('user_sectors')
            .delete()
            .eq('user_id', userId)
            .eq('sector_id', sectorId);
          toast.info('Permissão removida.');
        } else {
          // Add relation
          await supabase.from('user_sectors').insert({
            user_id: userId,
            sector_id: sectorId,
          });
          toast.success('Permissão de acesso concedida!');
        }
        queryClient.invalidateQueries({ queryKey: ['sector-permissions-relations'] });
        queryClient.invalidateQueries({ queryKey: ['user-sectors'] });
        refreshProfile();
      } catch (err: any) {
        toast.error(err.message || 'Erro ao alterar permissão');
      }
    } else {
      // Local fallback
      setLocalUserSectors((prev) => {
        const current = prev[userId] || [];
        const next = currentAccess
          ? current.filter((s) => s !== sectorId)
          : [...current, sectorId];
        return { ...prev, [userId]: next };
      });
      toast.success(currentAccess ? 'Permissão revogada.' : 'Permissão concedida!');
    }
  };

  // Filter collaborators by name or role
  const filteredCollaborators = useMemo(() => {
    if (!searchQuery.trim()) return collaborators;
    const query = searchQuery.toLowerCase();
    return collaborators.filter(
      (c) =>
        c.full_name.toLowerCase().includes(query) || c.role.toLowerCase().includes(query)
    );
  }, [collaborators, searchQuery]);

  return (
    <div className="space-y-6">
      {/* ---------------- CABEÇALHO DA ABA ---------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Permissões de Usuários por Setor
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Defina quais setores e filas de atendimento cada colaborador tem autorização para visualizar e responder no WhatsApp.
          </p>
        </div>
      </div>

      {/* ---------------- BANNER INFORMATIVO RBAC ---------------- */}
      <Card className="bg-primary/5 border-primary/20 p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
            <Crown className="w-5 h-5 text-amber-500" />
          </div>
          <div className="space-y-1 text-xs">
            <h4 className="font-semibold text-foreground text-sm">
              Regra de Visibilidade por Departamento
            </h4>
            <p className="text-muted-foreground leading-relaxed">
              <strong>Diretoria e Administradores Gerais</strong> possuem acesso irrestrito automático a todos os setores e atendimentos.
              Para <strong>Professores, Secretárias, Atendentes e Vendedores</strong>, a caixa de entrada do WhatsApp só exibe conversas e contatos dos setores explicitamente marcados abaixo.
            </p>
          </div>
        </div>
      </Card>

      {/* ---------------- BUSCA DE USUÁRIOS ---------------- */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            placeholder="Buscar colaborador por nome ou função..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* ---------------- MATRIZ DE ACESSO COLABORADOR X SETOR ---------------- */}
      <div className="space-y-3">
        {filteredCollaborators.map((user) => {
          return (
            <Card key={user.id} className="overflow-hidden hover:border-primary/40 transition-colors">
              <CardContent className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Perfil do Colaborador */}
                <div className="flex items-center gap-3 min-w-[240px]">
                  <Avatar className="w-11 h-11 border-2 border-border">
                    {user.avatar_url && <AvatarImage src={user.avatar_url} />}
                    <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                      {user.full_name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{user.full_name}</span>
                      {user.is_director && (
                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-300 text-[10px] gap-1 h-5">
                          <Crown className="w-3 h-3" />
                          Acesso Total
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{user.role}</span>
                  </div>
                </div>

                {/* Grid de Setores com Toggles de Acesso */}
                <div className="flex-1 flex items-center justify-start lg:justify-end gap-2 flex-wrap">
                  {allAvailableSectors.map((sector) => {
                    const hasAccess = hasUserAccessToSector(user.id, user.is_director, sector.id);

                    return (
                      <div
                        key={sector.id}
                        onClick={() => handleToggleAccess(user.id, user.is_director, sector.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                          hasAccess
                            ? 'bg-primary/10 text-primary border-primary/30 font-medium shadow-2xs'
                            : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/60'
                        } ${user.is_director ? 'cursor-default opacity-80' : ''}`}
                        title={
                          user.is_director
                            ? 'Acesso universal automático'
                            : `Clique para ${hasAccess ? 'revogar' : 'conceder'} acesso`
                        }
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{sector.name}</span>
                        {hasAccess ? (
                          <Check className="w-3.5 h-3.5 text-primary ml-1" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/30 ml-1" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
