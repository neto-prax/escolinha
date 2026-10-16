import { useState, useCallback, useMemo, useEffect } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { WhatsAppTrigger, TriggerMatchResult, WhatsAppGreetingConfig } from '@/types/mensagens';
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

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export const DEFAULT_GREETING_MESSAGE = `Olá! 👋 Bem-vindo(a) à {{escola}}!

Para direcionar seu atendimento ao setor responsável, por favor digite o número da opção desejada:

{SECTORS_LIST}

Como podemos te ajudar hoje?`;

export const DEFAULT_GREETING_CONFIG: WhatsAppGreetingConfig = {
  enabled: true,
  message: DEFAULT_GREETING_MESSAGE,
  enabledSectors: ['comercial', 'financeiro', 'secretaria', 'pedagogico'],
  sectorGreetings: {
    comercial: 'Transferindo seu atendimento para a equipe de Matrículas & Comercial. Um momento por favor! 🎒',
    financeiro: 'Localizamos seu contato. Para 2ª via de boleto, PIX ou pagamentos, estou transferindo você para o setor Financeiro! 💳',
    secretaria: 'Seu atendimento foi direcionado para a Secretaria Escolar. Em instantes um responsável irá te atender! 📑',
    pedagogico: 'Conectando você com a Coordenação Pedagógica. Um momento por favor! 👩‍🏫',
  },
  defaultSectorId: null,
  onlyFirstMessage: true,
};

export function findSectorByIdOrSlug(
  allSectors: { id: string; name: string }[],
  idOrSlug: string
): { id: string; name: string } | undefined {
  if (!idOrSlug) return undefined;
  const cleanKey = normalizeText(idOrSlug);
  return allSectors.find((s) => {
    if (s.id === idOrSlug) return true;
    const cleanName = normalizeText(s.name);
    if (cleanName === cleanKey) return true;
    if (cleanKey.length >= 3 && cleanName.includes(cleanKey)) return true;
    if (cleanName.length >= 3 && cleanKey.includes(cleanName)) return true;
    return false;
  });
}

/**
 * Monta o texto de saudação substituindo {SECTORS_LIST} e tags dinâmicas
 */
export function buildGreetingMenuText(
  template: string,
  allSectors: { id: string; name: string }[],
  enabledSectorIds: string[],
  context?: { schoolName?: string; contactName?: string }
): string {
  const schoolName = context?.schoolName || 'Purple Edu';
  const contactName = context?.contactName || 'Responsável';

  const orderedSectors = enabledSectorIds
    .map((id) => findSectorByIdOrSlug(allSectors, id))
    .filter((s): s is { id: string; name: string } => Boolean(s));

  const sectorsToDisplay = orderedSectors.length > 0 ? orderedSectors : allSectors;

  const sectorsList = sectorsToDisplay
    .map((s, idx) => `*${idx + 1}* - ${s.name}`)
    .join('\n');

  let baseTemplate = template && template.trim() ? template : DEFAULT_GREETING_MESSAGE;

  if (baseTemplate.includes('{SECTORS_LIST}')) {
    baseTemplate = baseTemplate.replace('{SECTORS_LIST}', sectorsList || '*1* - Atendimento Geral');
  } else {
    baseTemplate = `${baseTemplate}\n\n${sectorsList || '*1* - Atendimento Geral'}`;
  }

  return baseTemplate
    .replace(/\{\{escola\}\}/gi, schoolName)
    .replace(/\{\{nome\}\}/gi, contactName.split(' ')[0] || contactName);
}

export interface SectorMenuEvaluationResult {
  matched: boolean;
  sectorId?: string;
  sectorName?: string;
  matchedSector?: { id: string; name: string };
}

/**
 * Avalia se uma mensagem é uma resposta a um menu de setores (número ou nome)
 */
export function evaluateSectorMenuResponse(
  input: string,
  allSectors: { id: string; name: string }[],
  enabledSectorIds: string[]
): SectorMenuEvaluationResult {
  if (!input || !input.trim()) return { matched: false };

  const clean = normalizeText(input);

  const orderedSectors = enabledSectorIds
    .map((id) => findSectorByIdOrSlug(allSectors, id))
    .filter((s): s is { id: string; name: string } => Boolean(s));

  const sectorsToSearch = orderedSectors.length > 0 ? orderedSectors : allSectors;

  // 1. Resposta numérica: "1", "2", "opcao 1", "#1", "1.", etc.
  const numMatch = clean.match(/^(?:opcao\s*|opção\s*|#)?([1-9][0-9]?)\.?$/i) || clean.match(/\b([1-9][0-9]?)\b/);
  if (numMatch) {
    const optionIndex = parseInt(numMatch[1], 10) - 1;
    if (optionIndex >= 0 && optionIndex < sectorsToSearch.length) {
      const selected = sectorsToSearch[optionIndex];
      return {
        matched: true,
        sectorId: selected.id,
        sectorName: selected.name,
        matchedSector: selected,
      };
    }
  }

  // 2. Resposta por nome aproximado do setor ou palavras-chave
  for (const sector of sectorsToSearch) {
    const cleanSectorName = normalizeText(sector.name);
    const sectorKeywords = cleanSectorName
      .split(/[\s,&/-]+/)
      .filter((w) => w.length > 3 && !['setor', 'para', 'com'].includes(w));

    if (
      clean === cleanSectorName ||
      clean.includes(cleanSectorName) ||
      cleanSectorName.includes(clean) ||
      sectorKeywords.some((kw) => clean.includes(kw))
    ) {
      return {
        matched: true,
        sectorId: sector.id,
        sectorName: sector.name,
        matchedSector: sector,
      };
    }
  }

  return { matched: false };
}

export function useWhatsAppTriggers() {
  const { school } = useAuth();
  const [triggersRaw, setTriggers] = useLocalStorage<WhatsAppTrigger[]>(
    'purple_whatsapp_triggers_v1',
    DEFAULT_TRIGGERS
  );
  const [greetingConfigRaw, setGreetingConfigRaw] = useLocalStorage<WhatsAppGreetingConfig>(
    'purple_whatsapp_greeting_v1',
    DEFAULT_GREETING_CONFIG
  );
  const [isSyncing, setIsSyncing] = useState(false);

  // Garante que a lista de gatilhos nunca fique vazia por falha de cache local
  const triggers = useMemo(() => {
    if (Array.isArray(triggersRaw) && triggersRaw.length > 0) {
      return triggersRaw;
    }
    return DEFAULT_TRIGGERS;
  }, [triggersRaw]);

  // Garante que a configuração de saudação tenha todos os campos válidos
  const greetingConfig = useMemo<WhatsAppGreetingConfig>(() => {
    return {
      ...DEFAULT_GREETING_CONFIG,
      ...(greetingConfigRaw || {}),
      sectorGreetings: {
        ...DEFAULT_GREETING_CONFIG.sectorGreetings,
        ...(greetingConfigRaw?.sectorGreetings || {}),
      },
    };
  }, [greetingConfigRaw]);

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

        if (automation) {
          if (Array.isArray(automation.triggers) && automation.triggers.length > 0) {
            setTriggers(automation.triggers as WhatsAppTrigger[]);
          }

          if (automation.sector_selection_message || automation.sector_selection_enabled !== undefined) {
            setGreetingConfigRaw({
              enabled: Boolean(automation.sector_selection_enabled),
              message: String(automation.sector_selection_message || DEFAULT_GREETING_MESSAGE),
              enabledSectors:
                Array.isArray(automation.enabled_sectors) && automation.enabled_sectors.length > 0
                  ? (automation.enabled_sectors as string[])
                  : DEFAULT_GREETING_CONFIG.enabledSectors,
              sectorGreetings:
                (automation.sector_greetings as Record<string, string>) ||
                DEFAULT_GREETING_CONFIG.sectorGreetings,
              defaultSectorId: (automation.default_sector_id as string) || null,
              onlyFirstMessage: automation.only_first_message !== false,
            });
          }
        }
      } catch (err) {
        console.warn('Could not sync remote triggers:', err);
      }
    };

    fetchRemoteTriggers();
    return () => {
      mounted = false;
    };
  }, [school?.id, setTriggers, setGreetingConfigRaw]);

  // Persist triggers to Supabase
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

  // Persist greeting & menu config to Supabase
  const saveGreetingConfig = useCallback(
    async (newConfig: WhatsAppGreetingConfig) => {
      setGreetingConfigRaw(newConfig);
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
                sector_selection_enabled: newConfig.enabled,
                sector_selection_message: newConfig.message,
                enabled_sectors: newConfig.enabledSectors,
                sector_greetings: newConfig.sectorGreetings,
                default_sector_id: newConfig.defaultSectorId,
                only_first_message: newConfig.onlyFirstMessage,
              },
            } as unknown as Json,
          })
          .eq('id', school.id);

        toast.success('Configurações de saudação salvas!');
      } catch (err) {
        console.warn('Erro ao salvar saudação:', err);
        toast.error('Erro ao salvar configurações de saudação.');
      } finally {
        setIsSyncing(false);
      }
    },
    [school?.id, setGreetingConfigRaw]
  );

  const updateGreetingConfig = useCallback(
    (updates: Partial<WhatsAppGreetingConfig>) => {
      setGreetingConfigRaw((prev) => ({
        ...DEFAULT_GREETING_CONFIG,
        ...(prev || {}),
        ...updates,
      }));
    },
    [setGreetingConfigRaw]
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

  // Evaluates an incoming message against triggers (pure evaluation)
  const evaluateMessage = useCallback(
    (
      text: string,
      context?: TriggerContext,
      options?: { trackAcionamento?: boolean }
    ): TriggerMatchResult => {
      const result = evaluateTriggerMatch(triggers, text, context);
      if (options?.trackAcionamento && result.matched && result.trigger) {
        // Increment acionamentos counter only when explicitly requested
        const updated = triggers.map((t) =>
          t.id === result.trigger?.id ? { ...t, totalAcionamentos: (t.totalAcionamentos || 0) + 1 } : t
        );
        setTriggers(updated);
      }
      return result;
    },
    [triggers, setTriggers]
  );

  return {
    triggers: Array.isArray(triggers) ? triggers : [],
    greetingConfig,
    isSyncing,
    addTrigger,
    updateTrigger,
    deleteTrigger,
    toggleTrigger,
    resetDefaultTriggers,
    importTriggers,
    evaluateMessage,
    saveGreetingConfig,
    updateGreetingConfig,
  };
}

export interface TriggerContext {
  contactName?: string;
  studentName?: string;
  schoolName?: string;
  currentSectorName?: string;
}

/**
 * Função pura que avalia se uma mensagem dispara algum gatilho configurado.
 * Avalia em ordem de prioridade (menor número = maior prioridade).
 */
export function evaluateTriggerMatch(
  triggers: WhatsAppTrigger[],
  text: string,
  context?: TriggerContext
): TriggerMatchResult {
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
        return buildMatchResult(trigger, keyword, context);
      }
    }
  }

  return { matched: false };
}

export function buildMatchResult(
  trigger: WhatsAppTrigger,
  matchedKeyword: string,
  context?: TriggerContext
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
