import { useState, useCallback, useMemo, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { WhatsAppTrigger, TriggerMatchResult } from '@/types/mensagens';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';

export const DEFAULT_TRIGGERS: WhatsAppTrigger[] = [
  {
    id: 'trig-matriculas',
    nome: 'Matrículas & Mensalidades',
    ativo: true,
    tipoCorrespondencia: 'contem',
    palavrasChave: ['matricula', 'matrícula', 'vagas', 'vaga', 'preço', 'valor', 'mensalidade'],
    respostaTexto: 'Olá {{nome}}! 🎒 Que alegria seu interesse na {{escola}}! Nossas matrículas para o período letivo estão com condições especiais. Estou transferindo seu atendimento para nossa equipe de Matrículas e Admissões agora mesmo! 📚',
    setorDestinoId: 'comercial',
    alterarStatus: 'open',
    prioridade: 1,
    criadoEm: '2026-01-01T00:00:00.000Z',
    totalAcionamentos: 42,
  },
  {
    id: 'trig-financeiro',
    nome: 'Segunda Via de Boleto / PIX',
    ativo: true,
    tipoCorrespondencia: 'contem',
    palavrasChave: ['boleto', 'pix', 'segunda via', '2 via', 'pagamento', 'pagar', 'carne', 'carnê', 'comprovante'],
    respostaTexto: 'Olá {{nome}}! 💳 Localizamos seu contato. Para emissão de 2ª via de boleto ou confirmação de pagamento para o aluno(a) {{aluno}}, estou transferindo você para o nosso setor Financeiro. Um momento!',
    setorDestinoId: 'financeiro',
    alterarStatus: 'open',
    prioridade: 2,
    criadoEm: '2026-01-01T00:00:00.000Z',
    totalAcionamentos: 89,
  },
  {
    id: 'trig-secretaria',
    nome: 'Secretaria & Declarações',
    ativo: true,
    tipoCorrespondencia: 'contem',
    palavrasChave: ['declaracao', 'declaração', 'historico', 'histórico', 'atestado', 'transferencia', 'transferência', 'secretaria'],
    respostaTexto: 'Olá {{nome}}! 📑 Para solicitação de declaração de matrícula, histórico escolar ou atestados acadêmicos, seu atendimento foi direcionado para a nossa Secretaria Escolar.',
    setorDestinoId: 'secretaria',
    alterarStatus: 'open',
    prioridade: 3,
    criadoEm: '2026-01-01T00:00:00.000Z',
    totalAcionamentos: 31,
  },
  {
    id: 'trig-pedagogico',
    nome: 'Coordenação Pedagógica & Notas',
    ativo: true,
    tipoCorrespondencia: 'contem',
    palavrasChave: ['nota', 'boletim', 'prova', 'tarefa', 'reuniao', 'reunião', 'professor', 'professora', 'rendimento'],
    respostaTexto: 'Olá {{nome}}! 👩‍🏫 Sobre a rotina pedagógica, desempenho e atividades de sala de aula do(a) {{aluno}}, estamos encaminhando sua conversa para a Coordenação Pedagógica.',
    setorDestinoId: 'pedagogico',
    alterarStatus: 'open',
    prioridade: 4,
    criadoEm: '2026-01-01T00:00:00.000Z',
    totalAcionamentos: 27,
  },
  {
    id: 'trig-horario',
    nome: 'Horário de Atendimento',
    ativo: true,
    tipoCorrespondencia: 'contem',
    palavrasChave: ['horario', 'horário', 'funcionamento', 'aberto', 'fecha', 'atendimento'],
    respostaTexto: 'Olá {{nome}}! ⏰ O atendimento da {{escola}} funciona de Segunda a Sexta-feira, das 07h00 às 18h00. Como podemos te ajudar hoje?',
    setorDestinoId: null,
    alterarStatus: null,
    prioridade: 5,
    criadoEm: '2026-01-01T00:00:00.000Z',
    totalAcionamentos: 64,
  },
];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function useWhatsAppTriggers() {
  const { school } = useAuth();
  const [triggersRaw, setTriggers] = useLocalStorage<WhatsAppTrigger[]>(
    'purple_whatsapp_triggers_v1',
    DEFAULT_TRIGGERS
  );
  const [isSyncing, setIsSyncing] = useState(false);

  // Garante que a lista de gatilhos nunca fique vazia por falha de cache local
  const triggers = useMemo(() => {
    if (Array.isArray(triggersRaw) && triggersRaw.length > 0) {
      return triggersRaw;
    }
    return DEFAULT_TRIGGERS;
  }, [triggersRaw]);

  // Sync with Supabase school settings if available
  useEffect(() => {
    if (!school?.id) return;

    let mounted = true;
    const fetchRemoteTriggers = async () => {
      try {
        const { data, error } = await supabase
          .from('schools')
          .select('settings')
          .eq('id', school.id)
          .maybeSingle();

        if (error || !data || !mounted) return;
        const settings = data.settings as Record<string, unknown> | null;
        const automation = settings?.automation as Record<string, unknown> | undefined;
        const remoteTriggers = automation?.triggers as WhatsAppTrigger[] | undefined;

        if (Array.isArray(remoteTriggers) && remoteTriggers.length > 0) {
          setTriggers(remoteTriggers);
        }
      } catch (err) {
        console.warn('Could not sync remote triggers:', err);
      }
    };

    fetchRemoteTriggers();
    return () => {
      mounted = false;
    };
  }, [school?.id, setTriggers]);

  // Persist to Supabase if school exists
  const persistToRemote = useCallback(
    async (updatedTriggers: WhatsAppTrigger[]) => {
      if (!school?.id) return;
      setIsSyncing(true);
      try {
        const { data: currentSchool } = await supabase
          .from('schools')
          .select('settings')
          .eq('id', school.id)
          .single();

        const currentSettings = (currentSchool?.settings || {}) as Record<string, unknown>;
        const currentAutomation = (currentSettings.automation || {}) as Record<string, unknown>;

        await supabase
          .from('schools')
          .update({
            settings: {
              ...currentSettings,
              automation: {
                ...currentAutomation,
                triggers: updatedTriggers,
              },
            } as unknown as Json,
          })
          .eq('id', school.id);
      } catch (err) {
        console.warn('Failed saving triggers to Supabase school settings', err);
      } finally {
        setIsSyncing(false);
      }
    },
    [school?.id]
  );

  const addTrigger = useCallback(
    (triggerData: Omit<WhatsAppTrigger, 'id' | 'criadoEm' | 'totalAcionamentos'>) => {
      const newTrigger: WhatsAppTrigger = {
        ...triggerData,
        id: `trig-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        criadoEm: new Date().toISOString(),
        totalAcionamentos: 0,
      };

      const updated = [...triggers, newTrigger];
      setTriggers(updated);
      persistToRemote(updated);
      toast.success(`Trigger "${newTrigger.nome}" criado com sucesso!`);
      return newTrigger;
    },
    [triggers, setTriggers, persistToRemote]
  );

  const updateTrigger = useCallback(
    (id: string, updates: Partial<WhatsAppTrigger>) => {
      const updated = triggers.map((t) => (t.id === id ? { ...t, ...updates } : t));
      setTriggers(updated);
      persistToRemote(updated);
      toast.success('Gatilho atualizado com sucesso!');
    },
    [triggers, setTriggers, persistToRemote]
  );

  const deleteTrigger = useCallback(
    (id: string) => {
      const updated = triggers.filter((t) => t.id !== id);
      setTriggers(updated);
      persistToRemote(updated);
      toast.info('Gatilho removido.');
    },
    [triggers, setTriggers, persistToRemote]
  );

  const toggleTrigger = useCallback(
    (id: string) => {
      const updated = triggers.map((t) => (t.id === id ? { ...t, ativo: !t.ativo } : t));
      setTriggers(updated);
      persistToRemote(updated);
    },
    [triggers, setTriggers, persistToRemote]
  );

  const resetDefaultTriggers = useCallback(() => {
    setTriggers(DEFAULT_TRIGGERS);
    persistToRemote(DEFAULT_TRIGGERS);
    toast.success('Gatilhos redefinidos para os padrões da escola!');
  }, [setTriggers, persistToRemote]);

  const importTriggers = useCallback(
    (importedTriggers: WhatsAppTrigger[]) => {
      if (!Array.isArray(importedTriggers) || importedTriggers.length === 0) {
        toast.error('Arquivo de gatilhos inválido ou vazio.');
        return;
      }
      setTriggers(importedTriggers);
      persistToRemote(importedTriggers);
      toast.success(`${importedTriggers.length} gatilhos importados com sucesso!`);
    },
    [setTriggers, persistToRemote]
  );

  // Evaluates a incoming message against triggers
  const evaluateMessage = useCallback(
    (
      text: string,
      context?: {
        contactName?: string;
        studentName?: string;
        schoolName?: string;
        currentSectorName?: string;
      }
    ): TriggerMatchResult => {
      if (!text || !text.trim()) {
        return { matched: false };
      }

      const cleanInput = normalizeText(text);
      const activeTriggers = (Array.isArray(triggers) ? triggers : [])
        .filter((t) => t && t.ativo)
        .sort((a, b) => (a.prioridade || 0) - (b.prioridade || 0));

      for (const trigger of activeTriggers) {
        if (!trigger) continue;
        if (trigger.tipoCorrespondencia === 'qualquer_primeira') {
          return buildMatchResult(trigger, cleanInput, context);
        }

        const keywords = Array.isArray(trigger.palavrasChave)
          ? trigger.palavrasChave
          : Array.isArray((trigger as any).keywords)
          ? (trigger as any).keywords
          : [];

        for (const keyword of keywords) {
          if (!keyword || typeof keyword !== 'string') continue;
          const cleanKw = normalizeText(keyword);
          if (!cleanKw) continue;

          let matches = false;
          if (trigger.tipoCorrespondencia === 'exata') {
            matches = cleanInput === cleanKw;
          } else if (trigger.tipoCorrespondencia === 'inicio') {
            matches = cleanInput.startsWith(cleanKw);
          } else {
            // 'contem' default
            matches = cleanInput.includes(cleanKw);
          }

          if (matches) {
            // Increment acionamentos counter
            const updated = triggers.map((t) =>
              t.id === trigger.id ? { ...t, totalAcionamentos: (t.totalAcionamentos || 0) + 1 } : t
            );
            setTriggers(updated);

            return buildMatchResult(trigger, keyword, context);
          }
        }
      }

      return { matched: false };
    },
    [triggers, setTriggers]
  );

  return {
    triggers: Array.isArray(triggers) ? triggers : [],
    isSyncing,
    addTrigger,
    updateTrigger,
    deleteTrigger,
    toggleTrigger,
    resetDefaultTriggers,
    importTriggers,
    evaluateMessage,
  };
}

function buildMatchResult(
  trigger: WhatsAppTrigger,
  matchedKeyword: string,
  context?: {
    contactName?: string;
    studentName?: string;
    schoolName?: string;
    currentSectorName?: string;
  }
): TriggerMatchResult {
  const nome = context?.contactName || 'Responsável';
  const aluno = context?.studentName || 'seu filho(a)';
  const escola = context?.schoolName || 'Purple Edu';
  const setor = context?.currentSectorName || 'Secretaria';

  const rawText =
    trigger.respostaTexto ||
    (trigger as any).message_template ||
    (trigger as any).text ||
    '';

  const formatted = rawText
    .replace(/\{\{nome\}\}/gi, nome)
    .replace(/\{\{aluno\}\}/gi, aluno)
    .replace(/\{\{escola\}\}/gi, escola)
    .replace(/\{\{setor\}\}/gi, setor);

  return {
    matched: true,
    trigger,
    matchedKeyword,
    formattedResponse: formatted,
    targetSectorId: trigger.setorDestinoId || (trigger as any).target_sector_id || null,
    newStatus: trigger.alterarStatus || (trigger as any).target_status || null,
  };
}
