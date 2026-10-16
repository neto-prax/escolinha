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

  const matrizSede = useMemo(() => {
    return sedes.find((s) => s.tipo === 'Matriz') || sedes[0] || null;
  }, [sedes]);

  // Verifica se um item pertence à sede ativa no momento
  const isItemInActiveSede = useCallback(
    (itemSedeId?: string, itemUnidadeNome?: string): boolean => {
      const matrizId = matrizSede?.id || 'sede-matriz';
      return checkItemInActiveSede({
        itemSedeId,
        itemUnidadeNome,
        activeSedeId: effectiveActiveSedeId,
        matrizId,
        sedes,
      });
    },
    [effectiveActiveSedeId, matrizSede, sedes]
  );

  return {
    sedes,
    userAllowedSedes,
    activeSedeId: effectiveActiveSedeId,
    activeSede,
    matrizSede,
    isItemInActiveSede,
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

export interface CheckItemInActiveSedeParams {
  itemSedeId?: string;
  itemUnidadeNome?: string;
  activeSedeId: string;
  matrizId?: string;
  sedes?: { id: string; nome: string; codigo?: string }[];
}

/**
 * Função pura que valida o isolamento de dados entre sedes/unidades escolares.
 * Regras:
 * 1. 'todas': visualização consolidada global.
 * 2. itemSedeId explícito: deve coincidir exatamente com a sede ativa.
 * 3. itemUnidadeNome gravado: deve coincidir com o nome ou código de uma sede correspondente à ativa.
 * 4. Dados legados (sem sedeId nem unidade): pertencem exclusivamente à Matriz,
 *    garantindo que novas sedes recém-criadas NÃO herdem dados órfãos da Matriz.
 */
export function checkItemInActiveSede({
  itemSedeId,
  itemUnidadeNome,
  activeSedeId,
  matrizId = 'sede-matriz',
  sedes = [],
}: CheckItemInActiveSedeParams): boolean {
  // Visão global 'Todas as Sedes': exibe tudo consolidado
  if (activeSedeId === 'todas') return true;

  // 1. Se tem sedeId explícito gravado
  if (itemSedeId) {
    return itemSedeId === activeSedeId;
  }

  // 2. Se tem unidade/nome gravado
  if (itemUnidadeNome && itemUnidadeNome !== 'Todas') {
    const matched = sedes.find(
      (s) =>
        s.nome.trim().toLowerCase() === itemUnidadeNome.trim().toLowerCase() ||
        (s.codigo && s.codigo.trim().toLowerCase() === itemUnidadeNome.trim().toLowerCase())
    );
    if (matched) {
      return matched.id === activeSedeId;
    }
  }

  // 3. Se não tem sedeId nem unidade (dados legados da escola original):
  // Pertence exclusivamente à Matriz principal, NÃO aparecendo em novas sedes.
  return activeSedeId === matrizId;
}

export interface ResolveSedeParams {
  rawSede?: any;
  sedes?: { id: string; nome: string; codigo?: string; tipo?: string }[];
  activeSede?: { id: string; nome: string } | null;
  matrizSede?: { id: string; nome: string } | null;
}

/**
 * Resolve o sedeId e o nome da unidade para importação ou cadastro de alunos.
 * Mapeia termos flexíveis como "Papagaio", "PAP", "Sede Papagaio", "Senador", etc.
 * Padrão da instituição: Sede Principal (Papagaio).
 */
export function resolveSedeFromImport({
  rawSede,
  sedes = [],
  activeSede,
  matrizSede,
}: ResolveSedeParams): { sedeId: string; unidade: string } {
  // Localiza a sede Papagaio
  const papagaioSede =
    sedes.find(
      (s) =>
        s.nome.toLowerCase().includes('papagaio') ||
        (s.codigo && s.codigo.toLowerCase() === 'pap')
    ) ||
    matrizSede ||
    sedes.find((s) => s.tipo === 'Matriz') ||
    sedes[0] || {
      id: 'sede-matriz',
      nome: 'Sede Principal (Papagaio)',
    };

  if (rawSede !== undefined && rawSede !== null && String(rawSede).trim() !== '') {
    const clean = String(rawSede).trim().toLowerCase();

    // 1. Busca exata por id, nome ou código
    const exact = sedes.find(
      (s) =>
        s.id.toLowerCase() === clean ||
        s.nome.toLowerCase() === clean ||
        (s.codigo && s.codigo.toLowerCase() === clean)
    );
    if (exact) return { sedeId: exact.id, unidade: exact.nome };

    // 2. Busca parcial por nome ou código
    const partial = sedes.find(
      (s) =>
        s.nome.toLowerCase().includes(clean) ||
        clean.includes(s.nome.toLowerCase()) ||
        (s.codigo && clean.includes(s.codigo.toLowerCase()))
    );
    if (partial) return { sedeId: partial.id, unidade: partial.nome };

    // 3. Menção explícita a Papagaio
    if (clean.includes('papagaio') || clean === 'pap') {
      return { sedeId: papagaioSede.id, unidade: papagaioSede.nome };
    }
  }

  // Se não foi informada sede na linha:
  // Se o usuário estiver operando em uma sede ativa específica diferente de 'todas', usa ela
  if (activeSede && activeSede.id !== 'todas') {
    return { sedeId: activeSede.id, unidade: activeSede.nome };
  }

  // Fallback padrão institucional: Sede Papagaio
  return { sedeId: papagaioSede.id, unidade: papagaioSede.nome };
}
