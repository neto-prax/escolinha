import { useMemo } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useAuth } from '@/contexts/AuthContext';
import { AppRole, ROLE_PERMISSIONS } from '@/types/auth';

export interface ScreenTabDefinition {
  id: string;
  label: string;
}

export interface ScreenDefinition {
  id: string;
  label: string;
  tabs?: ScreenTabDefinition[];
}

export const APP_SCREENS: ScreenDefinition[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
  },
  {
    id: 'comercial',
    label: 'Comercial',
    tabs: [
      { id: 'kanban', label: 'Kanban por Turmas' },
      { id: 'metas', label: 'Metas de Matrícula e Rematrícula' },
    ],
  },
  {
    id: 'alunos',
    label: 'Alunos',
    tabs: [
      { id: 'gestao', label: 'Gestão de Alunos' },
      { id: 'turmas', label: 'Turmas e Contratos' },
      { id: 'mensalidades', label: 'Mensalidades' },
    ],
  },
  {
    id: 'pedagogico',
    label: 'Pedagógico',
    tabs: [
      { id: 'diario', label: 'Diário de Classe' },
      { id: 'planejamento', label: 'Planejamento de Aulas' },
      { id: 'avaliacoes', label: 'Avaliações' },
      { id: 'turmas', label: 'Turmas & Horários' },
      { id: 'configuracoes', label: 'Configurações (Disciplinas, Médias, Notas)' },
      { id: 'notas', label: 'Notas' },
      { id: 'materias', label: 'Disciplinas & Matérias' },
      { id: 'ciclos-medias', label: 'Ciclos & Médias' },
    ],
  },
  {
    id: 'administrativo',
    label: 'Administrativo',
    tabs: [
      { id: 'employees', label: 'Funcionários' },
      { id: 'os', label: 'Ordens de Serviço' },
    ],
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    tabs: [
      { id: 'lancamentos', label: 'Lançamentos' },
      { id: 'orcamentos', label: 'Orçamentos' },
      { id: 'salarios', label: 'Salários' },
      { id: 'cartoes', label: 'Cartões' },
      { id: 'dashboard', label: 'Dashboard Financeiro' },
      { id: 'turmas', label: 'Turmas' },
    ],
  },
  {
    id: 'estoque',
    label: 'Estoque',
    tabs: [
      { id: 'vendas', label: 'Produtos para Venda' },
      { id: 'retiradas', label: 'Retiradas & Consumo' },
      { id: 'movimentacoes', label: 'Histórico de Movimentações' },
    ],
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
  },
  {
    id: 'vendas',
    label: 'Comissão (Vendas)',
  },
  {
    id: 'usuarios',
    label: 'Usuários do Sistema',
  },
  {
    id: 'configuracoes',
    label: 'Configurações',
    tabs: [
      { id: 'geral', label: 'Geral' },
      { id: 'whatsapp', label: 'WhatsApp' },
      { id: 'financeiro', label: 'Financeiro' },
      { id: 'pedagogico', label: 'Pedagógico' },
      { id: 'administrativo', label: 'Administrativo' },
    ],
  },
];

export interface UserVisibilityConfig {
  screens: string[];
  tabs: Record<string, string[]>;
  kpis?: Record<string, boolean>; // screenId -> show/hide total cards
}

export type AllUserPermissions = Record<string, UserVisibilityConfig>;

export function getDefaultPermissionsForRoles(roles: AppRole[]): UserVisibilityConfig {
  if (roles.includes('director')) {
    // Diretor tem acesso a todas as telas e abas por padrão
    const allScreens = APP_SCREENS.map((s) => s.id);
    const allTabs: Record<string, string[]> = {};
    APP_SCREENS.forEach((s) => {
      if (s.tabs && s.tabs.length > 0) {
        allTabs[s.id] = s.tabs.map((t) => t.id);
      }
    });
    return { screens: allScreens, tabs: allTabs };
  }

  // Coleta as permissões base dos roles
  const allowedScreensSet = new Set<string>();
  allowedScreensSet.add('dashboard'); // Dashboard padrão para todos

  roles.forEach((role) => {
    const perms = ROLE_PERMISSIONS[role] || [];
    perms.forEach((p) => {
      if (p === '*') {
        APP_SCREENS.forEach((s) => allowedScreensSet.add(s.id));
      } else {
        allowedScreensSet.add(p);
      }
    });
  });

  const screens = Array.from(allowedScreensSet);
  const tabs: Record<string, string[]> = {};

  APP_SCREENS.forEach((s) => {
    if (screens.includes(s.id) && s.tabs) {
      tabs[s.id] = s.tabs.map((t) => t.id);
    }
  });

  return { screens, tabs };
}

export function usePermissions() {
  const { user, roles } = useAuth();
  const [permissionsStore, setPermissionsStore] = useLocalStorage<AllUserPermissions>(
    'escolinha_user_permissions_v2',
    {}
  );

  const isDirector = roles.includes('director');

  const canAccessScreen = (screenId: string, targetUserId?: string): boolean => {
    const checkUserId = targetUserId || user?.id;
    if (!checkUserId) return true; // Se não autenticado ou em carregamento, não bloqueia inicialmente

    const userConfig = permissionsStore[checkUserId];

    // Se existe uma configuração personalizada para este usuário
    if (userConfig && Array.isArray(userConfig.screens)) {
      return userConfig.screens.includes(screenId);
    }

    // Caso contrário, usa os papéis padrão do usuário autenticado
    if (isDirector) return true;
    const defaults = getDefaultPermissionsForRoles(roles);
    return defaults.screens.includes(screenId);
  };

  const canAccessTab = (screenId: string, tabId: string, targetUserId?: string): boolean => {
    const checkUserId = targetUserId || user?.id;
    if (!checkUserId) return true;

    // Primeiro verifica se a tela está liberada
    if (!canAccessScreen(screenId, checkUserId)) return false;

    const userConfig = permissionsStore[checkUserId];

    if (userConfig && userConfig.tabs && userConfig.tabs[screenId]) {
      return userConfig.tabs[screenId].includes(tabId);
    }

    // Se não há configuração personalizada para as abas desta tela, verifica padrão
    if (isDirector) return true;
    const defaults = getDefaultPermissionsForRoles(roles);
    if (defaults.tabs[screenId]) {
      return defaults.tabs[screenId].includes(tabId);
    }

    return true;
  };

  const canViewKpis = (screenId: string, targetUserId?: string): boolean => {
    const checkUserId = targetUserId || user?.id;
    if (!checkUserId) return true;

    const userConfig = permissionsStore[checkUserId];
    if (userConfig && userConfig.kpis && typeof userConfig.kpis[screenId] === 'boolean') {
      return userConfig.kpis[screenId];
    }

    if (userConfig && userConfig.kpis && typeof userConfig.kpis['_all'] === 'boolean') {
      return userConfig.kpis['_all'];
    }

    return true; // Padrão: visível a menos que explicitamente desativado para o usuário
  };

  const saveUserPermissions = (userId: string, config: UserVisibilityConfig) => {
    setPermissionsStore((prev) => ({
      ...prev,
      [userId]: config,
    }));
  };

  const resetUserPermissions = (userId: string) => {
    setPermissionsStore((prev) => {
      const copy = { ...prev };
      delete copy[userId];
      return copy;
    });
  };

  const getUserPermissions = (userId: string, userRoles: AppRole[] = []): UserVisibilityConfig => {
    if (permissionsStore[userId]) {
      return permissionsStore[userId];
    }
    return getDefaultPermissionsForRoles(userRoles.length > 0 ? userRoles : roles);
  };

  return {
    canAccessScreen,
    canAccessTab,
    canViewKpis,
    saveUserPermissions,
    resetUserPermissions,
    getUserPermissions,
    permissionsStore,
    APP_SCREENS,
  };
}

