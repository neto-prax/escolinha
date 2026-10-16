import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { WhatsAppSectorItem } from '@/types/mensagens';

export const DEFAULT_WHATSAPP_SECTORS: WhatsAppSectorItem[] = [
  {
    id: 'comercial',
    name: 'Comercial & Matrículas',
    description: 'Atendimento a novos alunos e rematrículas',
    color: '#3b82f6',
    is_active: true,
  },
  {
    id: 'financeiro',
    name: 'Financeiro',
    description: 'Boletos, cobranças, acordos e pagamentos',
    color: '#10b981',
    is_active: true,
  },
  {
    id: 'secretaria',
    name: 'Secretaria',
    description: 'Declarações, histórico, atestados e transferências',
    color: '#f59e0b',
    is_active: true,
  },
  {
    id: 'pedagogico',
    name: 'Coordenação Pedagógica',
    description: 'Coordenação, professores e rendimento escolar',
    color: '#8b5cf6',
    is_active: true,
  },
  {
    id: 'suporte',
    name: 'Suporte & Recepção',
    description: 'Dúvidas gerais e recepção',
    color: '#64748b',
    is_active: true,
  },
];

export function useWhatsAppSectors() {
  const { school } = useAuth();
  const schoolId = school?.id;

  const { data: dbSectors = [], isLoading, refetch } = useQuery({
    queryKey: ['sectors-list', schoolId],
    queryFn: async () => {
      let query = supabase
        .from('sectors')
        .select('*')
        .order('name');

      if (schoolId) {
        query = query.eq('school_id', schoolId);
      }

      const { data, error } = await query;
      if (error) {
        console.warn('Error fetching sectors in useWhatsAppSectors:', error);
        return [];
      }
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutos de cache fresco
  });

  const allAvailableSectors: WhatsAppSectorItem[] = useMemo(() => {
    if (!Array.isArray(dbSectors) || dbSectors.length === 0) return DEFAULT_WHATSAPP_SECTORS;

    const mappedDbSectors: WhatsAppSectorItem[] = dbSectors.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description || null,
      color: (s as any).color || '#6366f1',
      is_active: s.is_active ?? true,
    }));

    const normalize = (str?: string | null) =>
      String(str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    const existingNames = new Set(mappedDbSectors.map((s) => normalize(s?.name)));

    const missingDefaults = DEFAULT_WHATSAPP_SECTORS.filter(
      (def) =>
        !existingNames.has(normalize(def.name)) &&
        !mappedDbSectors.some((db) => db.id === def.id || (db.name && normalize(db.name).includes(normalize(def.id))))
    );

    return [...mappedDbSectors, ...missingDefaults];
  }, [dbSectors]);

  return {
    allAvailableSectors,
    isLoading,
    refetch,
  };
}

