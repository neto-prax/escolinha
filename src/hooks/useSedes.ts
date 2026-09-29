import { useMemo, useEffect, useCallback } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Sede, DEFAULT_SEDES } from '@/types/sede';
import { useAuth } from '@/contexts/AuthContext';
import { AllUserPermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';

export function useSedes() {
  const [sedes, setSedes] = useLocalStorage<Sede[]>('escolinha_sedes', DEFAULT_SEDES);
  const [storedActiveSedeId, setStoredActiveSedeId] = useLocalStorage<string>('escolinha_active_sede_id', 'todas');
  const [permissionsStore] = useLocalStorage<AllUserPermissions>('escolinha_user_permissions_v2', {});

  // Obter usuário e papéis de forma segura
  let user: any = null;
  let roles: any[] = [];
  try {
    const auth = useAuth();
    user = auth.user;
    roles = auth.roles || [];
  } catch {
    // Caso useSedes seja executado fora do AuthProvider em testes ou telas isoladas
  }

  const isDirector = roles.includes('director');
  const userConfig = user?.id ? permissionsStore[user.id] : undefined;

  // Sedes configuradas para este usuário
  const configuredSedes = useMemo(() => {
    if (userConfig?.sedes && Array.isArray(userConfig.sedes) && userConfig.sedes.length > 0) {
      return userConfig.sedes;
    }
    return ['todas'];
  }, [userConfig]);

  // Se o usuário pode acessar visão global de todas as sedes
  const canAccessAllSedes = useMemo(() => {
    if (isDirector) return true;
    return configuredSedes.includes('todas');
  }, [isDirector, configuredSedes]);

  // Todas as sedes ativas no sistema
  const activeSedesList = useMemo(() => {
    return sedes.filter((s) => s.is_ativa !== false);
  }, [sedes]);

  // Sedes que este usuário específico tem autorização para visualizar/operar
  const userAllowedSedes = useMemo(() => {
    if (canAccessAllSedes) {
      return activeSedesList;
    }
    return activeSedesList.filter((s) => configuredSedes.includes(s.id));
  }, [canAccessAllSedes, activeSedesList, configuredSedes]);

  // Se o usuário está restrito a apenas 1 unidade (ex: Sede Senador)
  const isRestrictedToSingleSede = !canAccessAllSedes && userAllowedSedes.length === 1;

  // Sede padrão para este usuário
  const userDefaultSedeId = useMemo(() => {
    if (canAccessAllSedes) {
      return userConfig?.defaultSedeId || 'todas';
    }
    if (userConfig?.defaultSedeId && userAllowedSedes.some((s) => s.id === userConfig.defaultSedeId)) {
      return userConfig.defaultSedeId;
    }
    return userAllowedSedes.length > 0 ? userAllowedSedes[0].id : 'todas';
  }, [canAccessAllSedes, userConfig?.defaultSedeId, userAllowedSedes]);

  // Sede ativa efetiva: garante que um colaborador restrito (ex: Sede Senador) já abra lá sem depender do localStorage prévio
  const effectiveActiveSedeId = useMemo(() => {
    if (canAccessAllSedes) {
      if (storedActiveSedeId === 'todas') return 'todas';
      if (activeSedesList.some((s) => s.id === storedActiveSedeId)) return storedActiveSedeId;
      return 'todas';
    }

    // Usuário com restrição de acesso
    if (userAllowedSedes.length === 0) return 'todas';

    // Se o ID atual estiver entre os autorizados, mantém
    if (storedActiveSedeId !== 'todas' && userAllowedSedes.some((s) => s.id === storedActiveSedeId)) {
      return storedActiveSedeId;
    }

    // Caso contrário (ex: estava em 'todas' ou em outra sede não autorizada), abre direto na sede padrão/única
    return userDefaultSedeId;
  }, [canAccessAllSedes, storedActiveSedeId, activeSedesList, userAllowedSedes, userDefaultSedeId]);

  // Mantém o localStorage sincronizado com a sede autorizada do usuário
  useEffect(() => {
    if (user?.id && effectiveActiveSedeId !== storedActiveSedeId) {
      setStoredActiveSedeId(effectiveActiveSedeId);
    }
  }, [user?.id, effectiveActiveSedeId, storedActiveSedeId, setStoredActiveSedeId]);

  // Objeto da sede ativa atualmente
  const activeSede = useMemo(() => {
    if (effectiveActiveSedeId === 'todas') return null;
    return sedes.find((s) => s.id === effectiveActiveSedeId) || null;
  }, [sedes, effectiveActiveSedeId]);

  // Função segura de troca de sede que bloqueia tentativas de acessar sedes não autorizadas
  const setActiveSedeId = useCallback(
    (newId: string) => {
      if (!canAccessAllSedes) {
        if (newId === 'todas') {
          toast.error('Seu usuário não possui acesso global a todas as sedes consolidadas.');
          return;
        }
        if (!userAllowedSedes.some((s) => s.id === newId)) {
          toast.error('Você não possui permissão para acessar esta unidade escolar.');
          return;
        }
      }
      setStoredActiveSedeId(newId);
    },
    [canAccessAllSedes, userAllowedSedes, setStoredActiveSedeId]
  );

  const addSede = (data: Omit<Sede, 'id' | 'dataCriacao'>) => {
    const newSede: Sede = {
      ...data,
      id: `sede-${Date.now()}`,
      dataCriacao: new Date().toISOString(),
    };

    // Se for Matriz, garante que as outras virem Filiais
    let updatedSedes = [...sedes];
    if (newSede.tipo === 'Matriz') {
      updatedSedes = updatedSedes.map((s) => ({
        ...s,
        tipo: 'Filial' as const,
      }));
    }

    setSedes([...updatedSedes, newSede]);
    toast.success(`Sede "${newSede.nome}" cadastrada com sucesso!`);
    return newSede;
  };

  const updateSede = (id: string, updates: Partial<Sede>) => {
    let updatedSedes = sedes.map((s) => (s.id === id ? { ...s, ...updates } : s));

    // Se a alteração transformou em Matriz, desmarca as outras
    if (updates.tipo === 'Matriz') {
      updatedSedes = updatedSedes.map((s) => (s.id === id ? s : { ...s, tipo: 'Filial' as const }));
    }

    setSedes(updatedSedes);
    toast.success('Dados da sede atualizados!');
  };

  const deleteSede = (id: string) => {
    const target = sedes.find((s) => s.id === id);
    if (!target) return;

    if (sedes.length <= 1) {
      toast.error('A instituição deve possuir pelo menos uma sede cadastrada.');
      return;
    }

    if (target.tipo === 'Matriz') {
      toast.error('Não é possível excluir a sede Matriz principal. Defina outra sede como Matriz antes.');
      return;
    }

    setSedes(sedes.filter((s) => s.id !== id));
    if (storedActiveSedeId === id) {
      setStoredActiveSedeId('todas');
    }
    toast.success(`Sede "${target.nome}" removida.`);
  };

  return {
    sedes,
    userAllowedSedes,
    activeSedeId: effectiveActiveSedeId,
    activeSede,
    setActiveSedeId,
    canAccessAllSedes,
    isRestrictedToSingleSede,
    canSwitchSedes: canAccessAllSedes || userAllowedSedes.length > 1,
    userDefaultSedeId,
    addSede,
    updateSede,
    deleteSede,
  };
}
