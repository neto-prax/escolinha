import { useMemo } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Sede, DEFAULT_SEDES } from '@/types/sede';
import { toast } from 'sonner';

export function useSedes() {
  const [sedes, setSedes] = useLocalStorage<Sede[]>('escolinha_sedes', DEFAULT_SEDES);
  const [activeSedeId, setActiveSedeId] = useLocalStorage<string>('escolinha_active_sede_id', 'todas');

  const activeSede = useMemo(() => {
    if (activeSedeId === 'todas') return null;
    return sedes.find((s) => s.id === activeSedeId) || null;
  }, [sedes, activeSedeId]);

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
    if (activeSedeId === id) {
      setActiveSedeId('todas');
    }
    toast.success(`Sede "${target.nome}" removida.`);
  };

  return {
    sedes,
    activeSedeId,
    activeSede,
    setActiveSedeId,
    addSede,
    updateSede,
    deleteSede,
  };
}

