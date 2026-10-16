import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle2,
  Loader2,
  MessageSquare,
  ShieldCheck,
  Zap,
  Send,
  ArrowRightLeft,
  Sparkles,
  Building2,
  Search,
  Edit3,
  Plus,
  Save,
  SlidersHorizontal,
  Bot,
  Check,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import { WhatsAppChatConversation, WhatsAppTrigger, WhatsAppGreetingConfig } from '@/types/mensagens';
import {
  useWhatsAppTriggers,
  buildGreetingMenuText,
  DEFAULT_GREETING_CONFIG,
} from '@/hooks/useWhatsAppTriggers';
import { toast } from 'sonner';

/* =========================================================================
   1. MODAL DE RESOLUÇÃO DE ATENDIMENTO
   ========================================================================= */

interface WhatsAppResolveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: WhatsAppChatConversation | null;
  onConfirmResolve: (data: {
    title: string;
    description: string;
    closingMessage?: string;
  }) => Promise<void>;
}

export function WhatsAppResolveModal({
  open,
  onOpenChange,
  conversation,
  onConfirmResolve,
}: WhatsAppResolveModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sendClosingMessage, setSendClosingMessage] = useState(true);
  const [closingMessage, setClosingMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && conversation) {
      setTitle('Atendimento concluído');
      setDescription('');
      setSendClosingMessage(true);
      const contactFirst = conversation.contact_name?.split(' ')[0] || 'Responsável';
      setClosingMessage(
        `Olá, ${contactFirst}! Seu atendimento foi finalizado por nossa equipe. Caso precise de mais algum auxílio, estamos sempre à disposição! 😊`
      );
    }
  }, [open, conversation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Informe um título para o parecer da resolução.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirmResolve({
        title: title.trim(),
        description: description.trim(),
        closingMessage: sendClosingMessage && closingMessage.trim() ? closingMessage.trim() : undefined,
      });
      toast.success('Atendimento marcado como resolvido!');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Erro ao resolver atendimento: ${err?.message || 'Tente novamente'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <DialogTitle>Marcar como Resolvido</DialogTitle>
          </div>
          <DialogDescription>
            Registre o parecer final do atendimento com{' '}
            <strong className="text-foreground">{conversation?.contact_name || 'o contato'}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Título do Parecer */}
          <div className="space-y-1.5">
            <Label htmlFor="resolve-title" className="text-xs font-semibold">
              Título do Parecer *
            </Label>
            <Input
              id="resolve-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Dúvida de matrícula esclarecida / Acordo realizado"
              required
              disabled={isSubmitting}
            />
          </div>

          {/* Descrição / Notas Internas */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="resolve-desc" className="text-xs font-semibold">
                Descrição & Notas Internas
              </Label>
              <span className="text-[11px] text-muted-foreground">Fica registrado no histórico</span>
            </div>
            <Textarea
              id="resolve-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes sobre a tratativa realizada com o responsável..."
              rows={3}
              className="resize-none"
              disabled={isSubmitting}
            />
          </div>

          {/* Enviar mensagem pelo WhatsApp */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <Label htmlFor="send-closing-msg" className="text-xs font-medium cursor-pointer">
                  Enviar mensagem de encerramento no WhatsApp
                </Label>
              </div>
              <Switch
                id="send-closing-msg"
                checked={sendClosingMessage}
                onCheckedChange={setSendClosingMessage}
                disabled={isSubmitting}
              />
            </div>

            {sendClosingMessage && (
              <div className="space-y-1.5 pt-1">
                <Textarea
                  value={closingMessage}
                  onChange={(e) => setClosingMessage(e.target.value)}
                  placeholder="Mensagem a ser enviada no WhatsApp..."
                  rows={3}
                  className="resize-none text-xs bg-background"
                  disabled={isSubmitting}
                />
                <p className="text-[10px] text-muted-foreground">
                  Esta mensagem será enviada instantaneamente pelo WhatsApp ao concluir.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Resolvendo...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Concluir e Resolver
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================================
   2. CENTRAL DE GATILHOS INTERATIVA: DISPARO AJUSTÁVEL & EDIÇÃO DE GATILHOS
   ========================================================================= */

interface SectorItem {
  id: string;
  name: string;
}

interface WhatsAppAdjustableTriggerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: WhatsAppChatConversation | null;
  allSectors: SectorItem[];
  triggers?: (WhatsAppTrigger | any)[];
  schoolName?: string;
  onDispatchTrigger: (payload: {
    message: string;
    targetSectorId?: string | null;
    targetStatus?: 'open' | 'pending' | 'resolved' | null;
  }) => Promise<void>;
  onUpdateTrigger?: (id: string, updates: Partial<WhatsAppTrigger>) => void;
  onAddTrigger?: (trigger: Omit<WhatsAppTrigger, 'id' | 'criadoEm' | 'totalAcionamentos'>) => WhatsAppTrigger;
}

const safeTriggerName = (t: any): string => t?.nome || t?.name || 'Gatilho sem nome';
const safeTriggerText = (t: any): string => t?.respostaTexto || t?.message_template || t?.text || '';
const safeTriggerSector = (t: any): string | null => t?.setorDestinoId || t?.target_sector_id || null;
const safeTriggerStatus = (t: any): 'open' | 'pending' | 'resolved' | null =>
  t?.alterarStatus || t?.target_status || null;
const safeTriggerKeywords = (t: any): string[] => {
  if (Array.isArray(t?.palavrasChave)) return t.palavrasChave.filter((k: any) => typeof k === 'string');
  if (Array.isArray(t?.keywords)) return t.keywords.filter((k: any) => typeof k === 'string');
  if (typeof t?.palavrasChave === 'string') return t.palavrasChave.split(',').map((k: string) => k.trim()).filter(Boolean);
  if (typeof t?.keywords === 'string') return t.keywords.split(',').map((k: string) => k.trim()).filter(Boolean);
  return [];
};

export function WhatsAppAdjustableTriggerModal({
  open,
  onOpenChange,
  conversation,
  allSectors = [],
  triggers: propTriggers = [],
  schoolName = 'Nossa Escola',
  onDispatchTrigger,
  onUpdateTrigger,
  onAddTrigger,
}: WhatsAppAdjustableTriggerModalProps) {
  const {
    triggers: hookTriggers = [],
    updateTrigger: hookUpdateTrigger,
    addTrigger: hookAddTrigger,
    greetingConfig,
    saveGreetingConfig,
  } = useWhatsAppTriggers();

  const [greetingDraft, setGreetingDraft] = useState<WhatsAppGreetingConfig>(greetingConfig);
  const [isSavingGreeting, setIsSavingGreeting] = useState(false);

  useEffect(() => {
    if (greetingConfig) {
      setGreetingDraft(greetingConfig);
    }
  }, [greetingConfig]);

  const [customSectors, setCustomSectors] = useState<SectorItem[]>([]);
  const [newSectorName, setNewSectorName] = useState('');

  const normalizeSector = (str: string) =>
    str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  // Garante todos os setores padrão essenciais mesclados com os do banco e customizados
  const effectiveSectors: SectorItem[] = useMemo(() => {
    const defaultSectors: SectorItem[] = [
      { id: 'comercial', name: 'Comercial & Matrículas' },
      { id: 'financeiro', name: 'Financeiro' },
      { id: 'secretaria', name: 'Secretaria' },
      { id: 'pedagogico', name: 'Coordenação Pedagógica' },
      { id: 'suporte', name: 'Suporte & Atendimento' },
    ];

    const baseList = Array.isArray(allSectors) && allSectors.length > 0 ? allSectors : [];
    const existingNames = new Set(baseList.map((s) => normalizeSector(s.name)));

    const missingDefaults = defaultSectors.filter(
      (def) =>
        !existingNames.has(normalizeSector(def.name)) &&
        !baseList.some((db) => db.id === def.id || normalizeSector(db.name).includes(normalizeSector(def.id)))
    );

    return [...baseList, ...missingDefaults, ...customSectors];
  }, [allSectors, customSectors]);

  // Checa se o setor está ativo no menu (por id ou correspondência de nome)
  const isSectorEnabled = (sectorId: string, sectorName: string) => {
    const cleanName = normalizeSector(sectorName);
    return greetingDraft.enabledSectors.some(
      (id) =>
        id === sectorId ||
        normalizeSector(id) === cleanName ||
        cleanName.includes(normalizeSector(id)) ||
        normalizeSector(id).includes(cleanName)
    );
  };

  // Obtém o número da opção (1, 2, 3...)
  const getOrderNumber = (sectorId: string, sectorName: string): number | null => {
    const cleanName = normalizeSector(sectorName);
    const idx = greetingDraft.enabledSectors.findIndex(
      (id) =>
        id === sectorId ||
        normalizeSector(id) === cleanName ||
        cleanName.includes(normalizeSector(id)) ||
        normalizeSector(id).includes(cleanName)
    );
    return idx >= 0 ? idx + 1 : null;
  };

  // Obtém a mensagem de encaminhamento configurada
  const getSectorGreeting = (sectorId: string, sectorName: string): string => {
    if (greetingDraft.sectorGreetings[sectorId]) {
      return greetingDraft.sectorGreetings[sectorId];
    }
    const cleanName = normalizeSector(sectorName);
    for (const [key, msg] of Object.entries(greetingDraft.sectorGreetings)) {
      if (
        normalizeSector(key) === cleanName ||
        cleanName.includes(normalizeSector(key)) ||
        normalizeSector(key).includes(cleanName)
      ) {
        return msg;
      }
    }
    return '';
  };

  const handleToggleGreetingSector = (sectorId: string, sectorName: string) => {
    const cleanName = normalizeSector(sectorName);
    const isCurrentlyEnabled = isSectorEnabled(sectorId, sectorName);

    setGreetingDraft((prev) => {
      let nextList: string[];
      if (isCurrentlyEnabled) {
        nextList = prev.enabledSectors.filter(
          (id) =>
            id !== sectorId &&
            normalizeSector(id) !== cleanName &&
            !cleanName.includes(normalizeSector(id)) &&
            !normalizeSector(id).includes(cleanName)
        );
      } else {
        nextList = [...prev.enabledSectors, sectorId];
      }
      return { ...prev, enabledSectors: nextList };
    });
  };

  const handleMoveSectorUp = (sectorId: string, sectorName: string) => {
    const cleanName = normalizeSector(sectorName);
    setGreetingDraft((prev) => {
      const idx = prev.enabledSectors.findIndex(
        (id) =>
          id === sectorId ||
          normalizeSector(id) === cleanName ||
          cleanName.includes(normalizeSector(id)) ||
          normalizeSector(id).includes(cleanName)
      );
      if (idx <= 0) return prev;
      const copy = [...prev.enabledSectors];
      [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
      return { ...prev, enabledSectors: copy };
    });
  };

  const handleMoveSectorDown = (sectorId: string, sectorName: string) => {
    const cleanName = normalizeSector(sectorName);
    setGreetingDraft((prev) => {
      const idx = prev.enabledSectors.findIndex(
        (id) =>
          id === sectorId ||
          normalizeSector(id) === cleanName ||
          cleanName.includes(normalizeSector(id)) ||
          normalizeSector(id).includes(cleanName)
      );
      if (idx < 0 || idx >= prev.enabledSectors.length - 1) return prev;
      const copy = [...prev.enabledSectors];
      [copy[idx], copy[idx + 1]] = [copy[idx + 1], copy[idx]];
      return { ...prev, enabledSectors: copy };
    });
  };

  const handleUpdateSectorGreeting = (sectorId: string, text: string) => {
    setGreetingDraft((prev) => ({
      ...prev,
      sectorGreetings: {
        ...prev.sectorGreetings,
        [sectorId]: text,
      },
    }));
  };

  const handleAddNewSector = () => {
    const clean = newSectorName.trim();
    if (!clean) return;
    const newId = `custom-sec-${Date.now()}`;
    const newSec: SectorItem = { id: newId, name: clean };
    setCustomSectors((prev) => [...prev, newSec]);
    setGreetingDraft((prev) => ({
      ...prev,
      enabledSectors: [...prev.enabledSectors, newId],
      sectorGreetings: {
        ...prev.sectorGreetings,
        [newId]: `Perfeito! Transferindo para o setor ${clean}. Em instantes um atendente irá te responder.`,
      },
    }));
    setNewSectorName('');
    toast.success(`Setor "${clean}" adicionado ao menu!`);
  };

  const handleSaveGreetingSettings = async () => {
    setIsSavingGreeting(true);
    try {
      await saveGreetingConfig(greetingDraft);
      toast.success('Mensagem de saudação & menu inicial salvas com sucesso!');
    } finally {
      setIsSavingGreeting(false);
    }
  };

  const handleDispatchGreetingToCurrentChat = async () => {
    const formatted = buildGreetingMenuText(
      greetingDraft.message,
      effectiveSectors,
      greetingDraft.enabledSectors,
      { schoolName, contactName: conversation?.contact_name }
    );
    await onDispatchTrigger({
      message: formatted,
      targetStatus: 'open',
    });
    toast.success('Mensagem de saudação com menu enviada para a conversa!');
    onOpenChange(false);
  };

  // Usa gatilhos do hook ou das props com fallback resiliente
  const triggersList = useMemo(() => {
    if (Array.isArray(hookTriggers) && hookTriggers.length > 0) return hookTriggers;
    if (Array.isArray(propTriggers) && propTriggers.length > 0) return propTriggers;
    return [];
  }, [hookTriggers, propTriggers]);

  const updateFn = onUpdateTrigger || hookUpdateTrigger;
  const addFn = onAddTrigger || hookAddTrigger;

  // Abas do Modal: 'dispatch' (Disparar no Contato), 'manage' (Alterar/Editar Gatilho) ou 'greeting' (Saudação & Menu)
  const [modalTab, setModalTab] = useState<'dispatch' | 'manage' | 'greeting'>('dispatch');
  const [searchQuery, setSearchQuery] = useState('');

  // Estado do Modo Disparo
  const [selectedTriggerId, setSelectedTriggerId] = useState<string>('custom');
  const [message, setMessage] = useState<string>('');
  const [targetSectorId, setTargetSectorId] = useState<string>('keep');
  const [targetStatus, setTargetStatus] = useState<'open' | 'pending' | 'resolved' | 'keep'>('keep');
  const [saveAsTemplateDefault, setSaveAsTemplateDefault] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estado do Modo Edição / Criação de Gatilho
  const [editingTriggerId, setEditingTriggerId] = useState<string | null>(null);
  const [editFormName, setEditFormName] = useState('');
  const [editFormKeywords, setEditFormKeywords] = useState('');
  const [editFormResponse, setEditFormResponse] = useState('');
  const [editFormSectorId, setEditFormSectorId] = useState<string>('none');
  const [editFormStatus, setEditFormStatus] = useState<'open' | 'pending' | 'resolved' | 'none'>('open');
  const [editFormActive, setEditFormActive] = useState<boolean>(true);

  // Interpolação dinâmica de variáveis
  const interpolateMessage = (template: string) => {
    if (!conversation) return template;
    const contactFirst = conversation.contact_name?.split(' ')[0] || conversation.contact_name || '';
    const student = conversation.student_info?.name || 'seu dependente';
    const sectorName =
      allSectors.find((s) => s.id === (targetSectorId !== 'keep' ? targetSectorId : conversation.sector_id))
        ?.name || 'Atendimento';

    return template
      .replace(/\{\{nome\}\}/gi, contactFirst)
      .replace(/\{\{responsavel\}\}/gi, conversation.contact_name || '')
      .replace(/\{\{aluno\}\}/gi, student)
      .replace(/\{\{escola\}\}/gi, schoolName)
      .replace(/\{\{setor\}\}/gi, sectorName);
  };

  // Carrega gatilho selecionado para disparo
  const applyTriggerToDispatch = (trig: any) => {
    if (!trig || trig === 'custom') {
      setSelectedTriggerId('custom');
      setMessage('');
      setTargetSectorId('keep');
      setTargetStatus('keep');
      return;
    }

    setSelectedTriggerId(trig.id);
    setMessage(interpolateMessage(safeTriggerText(trig)));

    const sec = safeTriggerSector(trig);
    if (sec) {
      const matched = allSectors.find(
        (s) => s.id === sec || (s.name && s.name.toLowerCase().includes(String(sec).toLowerCase()))
      );
      setTargetSectorId(matched ? matched.id : 'keep');
    } else {
      setTargetSectorId('keep');
    }

    const st = safeTriggerStatus(trig);
    setTargetStatus(st || 'keep');
  };

  // Inicialização ao abrir o modal
  useEffect(() => {
    if (open) {
      setModalTab('dispatch');
      setSearchQuery('');
      setSaveAsTemplateDefault(false);

      if (triggersList.length > 0) {
        const first = triggersList.find((t) => t.ativo !== false) || triggersList[0];
        applyTriggerToDispatch(first);
      } else {
        setSelectedTriggerId('custom');
        setMessage(
          interpolateMessage(
            'Olá {{nome}}, tudo bem? Estamos entrando em contato sobre o(a) aluno(a) {{aluno}}.'
          )
        );
        setTargetSectorId('keep');
        setTargetStatus('keep');
      }
    }
  }, [open, conversation, triggersList]);

  // Carrega gatilho no formulário de edição
  const loadTriggerIntoEditor = (trig: any) => {
    if (!trig) {
      // Novo Gatilho
      setEditingTriggerId('new');
      setEditFormName('');
      setEditFormKeywords('');
      setEditFormResponse('Olá {{nome}}! Informamos que...');
      setEditFormSectorId('none');
      setEditFormStatus('open');
      setEditFormActive(true);
      return;
    }

    setEditingTriggerId(trig.id);
    setEditFormName(safeTriggerName(trig));
    setEditFormKeywords(safeTriggerKeywords(trig).join(', '));
    setEditFormResponse(safeTriggerText(trig));
    setEditFormSectorId(safeTriggerSector(trig) || 'none');
    setEditFormStatus((safeTriggerStatus(trig) as any) || 'none');
    setEditFormActive(trig.ativo !== false && trig.active !== false);
  };

  // Abrir edição direta a partir de um gatilho da lista
  const handleOpenEditTrigger = (trig: any) => {
    loadTriggerIntoEditor(trig);
    setModalTab('manage');
  };

  // Filtragem de gatilhos por busca
  const filteredTriggers = useMemo(() => {
    if (!searchQuery.trim()) return triggersList;
    const q = searchQuery.toLowerCase().trim();
    return triggersList.filter((t) => {
      const name = safeTriggerName(t).toLowerCase();
      const text = safeTriggerText(t).toLowerCase();
      const kw = safeTriggerKeywords(t).map((k) => k.toLowerCase()).join(' ');
      return name.includes(q) || text.includes(q) || kw.includes(q);
    });
  }, [triggersList, searchQuery]);

  // Inserir tag de variável na mensagem
  const insertVariable = (variable: string) => {
    setMessage((prev) => `${prev} ${variable}`.trimStart());
  };

  // Salvar alterações de um modelo de gatilho
  const handleSaveTriggerDefinition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormName.trim()) {
      toast.error('Informe o nome do gatilho.');
      return;
    }
    if (!editFormResponse.trim()) {
      toast.error('Informe a mensagem padrão de resposta do gatilho.');
      return;
    }

    const keywordsArray = editFormKeywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    const targetSector = editFormSectorId !== 'none' ? editFormSectorId : null;
    const targetSt = editFormStatus !== 'none' ? editFormStatus : null;

    if (editingTriggerId === 'new' || !editingTriggerId) {
      if (addFn) {
        const created = addFn({
          nome: editFormName.trim(),
          ativo: editFormActive,
          tipoCorrespondencia: 'contem',
          palavrasChave: keywordsArray,
          respostaTexto: editFormResponse.trim(),
          setorDestinoId: targetSector,
          alterarStatus: targetSt,
          prioridade: triggersList.length + 1,
        });
        toast.success(`Gatilho "${created.nome}" criado com sucesso!`);
        applyTriggerToDispatch(created);
        setModalTab('dispatch');
      }
    } else {
      if (updateFn) {
        updateFn(editingTriggerId, {
          nome: editFormName.trim(),
          ativo: editFormActive,
          palavrasChave: keywordsArray,
          respostaTexto: editFormResponse.trim(),
          setorDestinoId: targetSector,
          alterarStatus: targetSt,
        });
        toast.success(`Gatilho "${editFormName.trim()}" atualizado com sucesso!`);
        // Atualiza a seleção atual
        const updated = triggersList.find((t) => t.id === editingTriggerId);
        if (updated) {
          applyTriggerToDispatch({
            ...updated,
            nome: editFormName.trim(),
            respostaTexto: editFormResponse.trim(),
            setorDestinoId: targetSector,
            alterarStatus: targetSt,
          });
        }
        setModalTab('dispatch');
      }
    }
  };

  // Disparar gatilho no atendimento ativo
  const handleSubmitDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error('Escreva ou selecione uma mensagem para enviar.');
      return;
    }

    try {
      setIsSubmitting(true);

      // Se marcou para salvar como novo padrão do gatilho
      if (saveAsTemplateDefault && selectedTriggerId !== 'custom' && updateFn) {
        updateFn(selectedTriggerId, {
          respostaTexto: message.trim(),
          setorDestinoId: targetSectorId !== 'keep' ? targetSectorId : null,
          alterarStatus: targetStatus !== 'keep' ? targetStatus : null,
        });
        toast.info('Texto salvo como novo padrão deste gatilho no sistema.');
      }

      await onDispatchTrigger({
        message: message.trim(),
        targetSectorId: targetSectorId !== 'keep' ? targetSectorId : undefined,
        targetStatus: targetStatus !== 'keep' ? targetStatus : undefined,
      });

      toast.success('Gatilho disparado com sucesso no WhatsApp!');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Erro ao disparar gatilho: ${err?.message || 'Tente novamente'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentTrigger = triggersList.find((t) => t.id === selectedTriggerId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Cabeçalho do Modal */}
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b bg-card flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 shadow-2xs">
                <Zap className="w-5 h-5 fill-amber-500" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <span>Central de Gatilhos</span>
                  <Badge variant="outline" className="text-[10px] font-medium border-amber-500/30 text-amber-600 dark:text-amber-400">
                    {triggersList.length} Gatilhos
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Selecione, altere modelos ou personalize mensagens para{' '}
                  <strong className="text-foreground">{conversation?.contact_name || 'o contato'}</strong>.
                </DialogDescription>
              </div>
            </div>

            {/* Alternador de Modos: Disparar, Alterar ou Saudação */}
            <Tabs
              value={modalTab}
              onValueChange={(val) => {
                const nextTab = val as 'dispatch' | 'manage' | 'greeting';
                setModalTab(nextTab);
                if (nextTab === 'manage' && (!editingTriggerId || editingTriggerId === 'new')) {
                  const target = currentTrigger || triggersList[0];
                  loadTriggerIntoEditor(target);
                }
              }}
              className="w-auto flex-shrink-0"
            >
              <TabsList className="h-8 bg-muted/80 p-0.5 text-xs">
                <TabsTrigger value="dispatch" className="text-xs px-2.5 h-7 gap-1.5 data-[state=active]:font-semibold">
                  <Send className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">Disparar no Chat</span>
                  <span className="sm:hidden">Disparar</span>
                </TabsTrigger>
                <TabsTrigger value="manage" className="text-xs px-2.5 h-7 gap-1.5 data-[state=active]:font-semibold">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500" />
                  <span className="hidden sm:inline">Alterar Gatilhos</span>
                  <span className="sm:hidden">Gatilhos</span>
                </TabsTrigger>
                <TabsTrigger value="greeting" className="text-xs px-2.5 h-7 gap-1.5 data-[state=active]:font-semibold">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                  <span className="hidden sm:inline">Saudação & Menu</span>
                  <span className="sm:hidden">Saudação</span>
                  {greetingDraft.enabled ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block ml-0.5" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 inline-block ml-0.5" />
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </DialogHeader>

        {/* ---------------- ABA 1: DISPARAR NO CONTATO ATIVO ---------------- */}
        {modalTab === 'dispatch' && (
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden divide-y md:divide-y-0 md:divide-x">
            {/* Lista Lateral de Gatilhos */}
            <div className="w-full md:w-72 lg:w-80 flex flex-col bg-muted/15 flex-shrink-0 min-h-0 max-h-[220px] md:max-h-none border-b md:border-b-0">
              <div className="p-3 border-b bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Modelos Disponíveis
                  </Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-1.5 text-[11px] gap-1 text-primary hover:bg-primary/10"
                    onClick={() => {
                      loadTriggerIntoEditor(null);
                      setModalTab('manage');
                    }}
                    title="Cadastrar novo gatilho"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Novo</span>
                  </Button>
                </div>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar gatilhos ou palavras..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 text-xs bg-background"
                  />
                </div>
              </div>

              <ScrollArea className="flex-1 p-2">
                <div className="space-y-1.5">
                  {/* Opção Mensagem Personalizada */}
                  <div
                    onClick={() => applyTriggerToDispatch('custom')}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                      selectedTriggerId === 'custom'
                        ? 'bg-primary/10 border-primary shadow-2xs ring-1 ring-primary/40'
                        : 'bg-card border-border/70 hover:bg-muted/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <span>✏️</span> Mensagem em Branco
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                      Escreva livremente sem modelo pré-definido.
                    </p>
                  </div>

                  {/* Opção Boas-Vindas & Menu Inicial */}
                  <div
                    onClick={() => {
                      setSelectedTriggerId('greeting-template');
                      const formatted = buildGreetingMenuText(
                        greetingDraft.message,
                        allSectors,
                        greetingDraft.enabledSectors,
                        { schoolName, contactName: conversation?.contact_name }
                      );
                      setMessage(formatted);
                      setTargetSectorId('keep');
                      setTargetStatus('open');
                    }}
                    className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                      selectedTriggerId === 'greeting-template'
                        ? 'bg-primary/10 border-primary shadow-2xs ring-1 ring-primary/40'
                        : 'bg-card border-border/70 hover:bg-muted/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-primary flex items-center gap-1.5">
                        <Bot className="w-3.5 h-3.5" /> Boas-Vindas & Menu
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setModalTab('greeting');
                        }}
                        className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-primary gap-1"
                        title="Editar modelo de saudação e setores"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Editar</span>
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                      {greetingDraft.message}
                    </p>
                  </div>

                  {filteredTriggers.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      Nenhum gatilho encontrado.
                    </div>
                  ) : (
                    filteredTriggers.map((trig) => {
                      const isSelected = selectedTriggerId === trig.id;
                      const sectorObj = allSectors.find(
                        (s) => s.id === safeTriggerSector(trig) || s.name.toLowerCase() === String(safeTriggerSector(trig)).toLowerCase()
                      );
                      const keywords = safeTriggerKeywords(trig);

                      return (
                        <div
                          key={trig.id}
                          onClick={() => applyTriggerToDispatch(trig)}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all relative group ${
                            isSelected
                              ? 'bg-amber-500/10 border-amber-500/60 shadow-2xs ring-1 ring-amber-500/30'
                              : 'bg-card border-border/70 hover:bg-muted/60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1.5 mb-1">
                            <span className="font-semibold text-foreground flex items-center gap-1 leading-snug line-clamp-1">
                              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                              {safeTriggerName(trig)}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              {/* Botão de Edição Rápida */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditTrigger(trig);
                                }}
                                className="opacity-70 group-hover:opacity-100 hover:text-primary p-0.5 rounded hover:bg-muted transition-colors"
                                title="Editar / Alterar este gatilho no sistema"
                              >
                                <Edit3 className="w-3 h-3 text-muted-foreground hover:text-primary" />
                              </button>
                            </div>
                          </div>

                          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mb-1.5">
                            {safeTriggerText(trig)}
                          </p>

                          <div className="flex items-center gap-1 flex-wrap">
                            {sectorObj && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-primary/30 text-primary bg-background">
                                <Building2 className="w-2.5 h-2.5 mr-0.5" />
                                {sectorObj.name}
                              </Badge>
                            )}
                            {keywords.slice(0, 2).map((k, i) => (
                              <span key={i} className="text-[9px] bg-muted px-1.5 py-0.2 rounded font-mono text-muted-foreground">
                                #{k}
                              </span>
                            ))}
                            {keywords.length > 2 && (
                              <span className="text-[9px] text-muted-foreground">
                                +{keywords.length - 2}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Painel de Customização e Envio */}
            <form onSubmit={handleSubmitDispatch} className="flex-1 flex flex-col min-h-0 bg-card">
              <ScrollArea className="flex-1 p-4 sm:p-5 space-y-4">
                {/* Banner do Gatilho Ativo */}
                <div className="bg-muted/40 border rounded-xl p-3 flex items-center justify-between gap-2 mb-4">
                  <div className="min-w-0">
                    <span className="text-[11px] text-muted-foreground block">Modelo Ativo para Envio:</span>
                    <strong className="text-xs sm:text-sm text-foreground flex items-center gap-1.5 truncate">
                      <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                      {currentTrigger ? safeTriggerName(currentTrigger) : 'Mensagem Personalizada'}
                    </strong>
                  </div>
                  {currentTrigger && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 shrink-0"
                      onClick={() => handleOpenEditTrigger(currentTrigger)}
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Alterar Gatilho</span>
                    </Button>
                  )}
                </div>

                {/* Transferência de Setor e Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                      <Label className="text-xs font-semibold">Setor de Atendimento</Label>
                    </div>
                    <Select value={targetSectorId} onValueChange={setTargetSectorId} disabled={isSubmitting}>
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue placeholder="Manter setor atual" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="keep">Manter no setor atual</SelectItem>
                        {allSectors.map((sec) => (
                          <SelectItem key={sec.id} value={sec.id}>
                            {sec.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <ArrowRightLeft className="w-3.5 h-3.5 text-muted-foreground" />
                      <Label className="text-xs font-semibold">Status do Atendimento</Label>
                    </div>
                    <Select
                      value={targetStatus}
                      onValueChange={(val) => setTargetStatus(val as any)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue placeholder="Manter status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="keep">Manter status atual</SelectItem>
                        <SelectItem value="open">Em Atendimento (Aberto)</SelectItem>
                        <SelectItem value="pending">Pendente (Aguardando)</SelectItem>
                        <SelectItem value="resolved">Resolvido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Campo de Mensagem Editável */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <Label className="text-xs font-semibold">
                      Mensagem no WhatsApp (Personalizável) *
                    </Label>
                    <span className="text-[11px] text-muted-foreground">
                      As variáveis foram preenchidas automaticamente
                    </span>
                  </div>

                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Escreva ou ajuste a mensagem que será enviada pelo WhatsApp..."
                    rows={5}
                    className="resize-none text-xs leading-relaxed bg-background"
                    required
                    disabled={isSubmitting}
                  />

                  {/* Chips de Inserção de Variáveis */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" /> Inserir tag:
                    </span>
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 text-[10px] transition-colors"
                      onClick={() => insertVariable('{{nome}}')}
                    >
                      + Nome
                    </Badge>
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 text-[10px] transition-colors"
                      onClick={() => insertVariable('{{aluno}}')}
                    >
                      + Aluno
                    </Badge>
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 text-[10px] transition-colors"
                      onClick={() => insertVariable('{{escola}}')}
                    >
                      + Escola
                    </Badge>
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 text-[10px] transition-colors"
                      onClick={() => insertVariable('{{setor}}')}
                    >
                      + Setor
                    </Badge>
                  </div>
                </div>

                {/* Opção para Salvar como Modelo Padrão */}
                {selectedTriggerId !== 'custom' && (
                  <div className="flex items-center gap-2 pt-1 border-t">
                    <Switch
                      id="save-as-default"
                      checked={saveAsTemplateDefault}
                      onCheckedChange={setSaveAsTemplateDefault}
                    />
                    <Label htmlFor="save-as-default" className="text-xs text-muted-foreground cursor-pointer">
                      Salvar este texto ajustado como novo padrão permanente deste gatilho
                    </Label>
                  </div>
                )}
              </ScrollArea>

              {/* Rodapé de Envio */}
              <DialogFooter className="p-3 sm:p-4 border-t bg-muted/20 flex-shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium gap-1.5"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Enviar Mensagem no WhatsApp
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </div>
        )}

        {/* ---------------- ABA 2: ALTERAR / GERENCIAR MODELOS DE GATILHOS ---------------- */}
        {modalTab === 'manage' && (
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden divide-y md:divide-y-0 md:divide-x bg-card">
            {/* Lista Lateral para Seleção de Gatilho a Editar */}
            <div className="w-full md:w-64 lg:w-72 flex flex-col bg-muted/15 flex-shrink-0 min-h-0 max-h-[180px] md:max-h-none border-b md:border-b-0">
              <div className="p-3 border-b bg-card flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Gatilhos da Escola
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 text-xs gap-1 font-semibold"
                  onClick={() => loadTriggerIntoEditor(null)}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo</span>
                </Button>
              </div>

              <ScrollArea className="flex-1 p-2">
                <div className="space-y-1">
                  {triggersList.map((trig) => {
                    const isEditing = editingTriggerId === trig.id;
                    return (
                      <div
                        key={trig.id}
                        onClick={() => loadTriggerIntoEditor(trig)}
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                          isEditing
                            ? 'bg-amber-500/10 border-amber-500/60 shadow-2xs font-semibold ring-1 ring-amber-500/30'
                            : 'bg-card border-border/70 hover:bg-muted/60'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-foreground leading-tight flex items-center gap-1.5">
                            <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                            {safeTriggerName(trig)}
                          </p>
                          <span className="text-[10px] text-muted-foreground">
                            {safeTriggerKeywords(trig).length} palavras-chave
                          </span>
                        </div>
                        <Edit3 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Formulário de Alteração de Gatilho */}
            <form onSubmit={handleSaveTriggerDefinition} className="flex-1 flex flex-col min-h-0">
              <ScrollArea className="flex-1 p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between border-b pb-3 mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-amber-500" />
                      {editingTriggerId === 'new' ? 'Cadastrar Novo Gatilho' : `Alterar: ${editFormName || 'Gatilho'}`}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      As alterações serão salvas nas configurações de automação da escola.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="trigger-active" className="text-xs font-medium cursor-pointer">
                      {editFormActive ? '🟢 Ativo' : '⚪ Pausado'}
                    </Label>
                    <Switch
                      id="trigger-active"
                      checked={editFormActive}
                      onCheckedChange={setEditFormActive}
                    />
                  </div>
                </div>

                {/* Nome do Gatilho */}
                <div className="space-y-1.5 mb-3">
                  <Label className="text-xs font-semibold">Nome do Gatilho *</Label>
                  <Input
                    value={editFormName}
                    onChange={(e) => setEditFormName(e.target.value)}
                    placeholder="Ex: Matrículas & Mensalidades, Segunda Via, Secretaria..."
                    className="h-8 text-xs bg-background"
                    required
                  />
                </div>

                {/* Palavras-chave / Keywords */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Palavras-chave (Separadas por vírgula) *</Label>
                    <span className="text-[11px] text-muted-foreground">Detectadas na mensagem do responsável</span>
                  </div>
                  <Input
                    value={editFormKeywords}
                    onChange={(e) => setEditFormKeywords(e.target.value)}
                    placeholder="Ex: matricula, valor, preco, vaga, inscricao"
                    className="h-8 text-xs bg-background font-mono"
                    required
                  />
                </div>

                {/* Setor de Destino e Status Padrão */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Transferir Automaticamente para Setor</Label>
                    <Select value={editFormSectorId} onValueChange={setEditFormSectorId}>
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue placeholder="Nenhum setor (manter)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum (Permanecer no setor atual)</SelectItem>
                        {allSectors.map((sec) => (
                          <SelectItem key={sec.id} value={sec.id}>
                            {sec.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Alterar Status do Ticket</Label>
                    <Select value={editFormStatus} onValueChange={(val) => setEditFormStatus(val as any)}>
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue placeholder="Nenhum status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Não alterar status</SelectItem>
                        <SelectItem value="open">Em Aberto (Atendimento)</SelectItem>
                        <SelectItem value="pending">Pendente (Aguardando)</SelectItem>
                        <SelectItem value="resolved">Resolvido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Mensagem Padrão de Resposta */}
                <div className="space-y-1.5 mb-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Mensagem Padrão do Gatilho *</Label>
                    <span className="text-[10px] text-muted-foreground">
                      Suporta: {'{{nome}}'}, {'{{aluno}}'}, {'{{escola}}'}, {'{{setor}}'}
                    </span>
                  </div>
                  <Textarea
                    value={editFormResponse}
                    onChange={(e) => setEditFormResponse(e.target.value)}
                    placeholder="Digite a mensagem padrão que será enviada aos responsáveis..."
                    rows={5}
                    className="resize-none text-xs leading-relaxed bg-background"
                    required
                  />
                </div>
              </ScrollArea>

              {/* Rodapé de Salvar Alterações */}
              <DialogFooter className="p-3 sm:p-4 border-t bg-muted/20 flex-shrink-0 flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setModalTab('dispatch')}
                  className="text-xs"
                >
                  Voltar ao Disparo
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    Fechar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-amber-600 hover:bg-amber-700 text-white font-medium gap-1.5 shadow-2xs"
                  >
                    <Save className="w-4 h-4" />
                    Salvar Alterações no Gatilho
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </div>
        )}

        {/* ---------------- ABA 3: EDITAR MENSAGEM DE SAUDAÇÃO & MENU ---------------- */}
        {modalTab === 'greeting' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-muted/10">
            {/* Faixa Superior: Status Ativo & Ações Rápidas */}
            <div className="px-4 sm:px-6 py-3 border-b bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center space-x-2.5 bg-muted/40 px-3 py-1.5 rounded-lg border">
                  <Switch
                    id="modal-greeting-active"
                    checked={greetingDraft.enabled}
                    onCheckedChange={(checked) =>
                      setGreetingDraft((prev) => ({ ...prev, enabled: checked }))
                    }
                  />
                  <Label htmlFor="modal-greeting-active" className="text-xs font-semibold cursor-pointer">
                    {greetingDraft.enabled ? 'Saudação Ativa na 1ª Mensagem' : 'Saudação Pausada'}
                  </Label>
                </div>
                <Badge
                  variant={greetingDraft.enabled ? 'default' : 'secondary'}
                  className="text-[10px] hidden sm:inline-flex"
                >
                  {greetingDraft.enabled ? 'Disparado na 1ª mensagem' : 'Desativado'}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setGreetingDraft(DEFAULT_GREETING_CONFIG);
                    toast.info('Restaurado para o modelo padrão.');
                  }}
                  className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  title="Restaurar padrão inicial"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restaurar Padrão
                </Button>
              </div>
            </div>

            {/* Corpo com Grid de 2 Colunas */}
            <ScrollArea className="flex-1 p-4 sm:p-5">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-5xl mx-auto">
                {/* COLUNA ESQUERDA: Editor da Mensagem & Variáveis (5 colunas) */}
                <div className="lg:col-span-5 space-y-4 flex flex-col">
                  {/* Card do Texto da Saudação */}
                  <div className="p-4 rounded-xl border bg-card shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-primary" />
                        Texto da Mensagem Inicial
                      </Label>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {greetingDraft.message.length} carac.
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Mensagem enviada no WhatsApp. A tag <code className="text-primary font-semibold bg-primary/10 px-1 py-0.5 rounded">{'{SECTORS_LIST}'}</code> será substituída pelas opções numeradas dos setores abaixo.
                    </p>

                    {/* Botões Rápidos de Tags */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setGreetingDraft((prev) => ({
                            ...prev,
                            message: prev.message.includes('{SECTORS_LIST}')
                              ? prev.message
                              : `${prev.message}\n\n{SECTORS_LIST}`,
                          }))
                        }
                        className="h-7 px-2.5 text-xs text-primary border-primary/30 bg-primary/5 hover:bg-primary/10 font-semibold"
                      >
                        + {'{SECTORS_LIST}'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setGreetingDraft((prev) => ({ ...prev, message: `${prev.message} {{nome}}` }))
                        }
                        className="h-7 px-2 text-xs hover:bg-muted/50"
                      >
                        + {'{{nome}}'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setGreetingDraft((prev) => ({ ...prev, message: `${prev.message} {{escola}}` }))
                        }
                        className="h-7 px-2 text-xs hover:bg-muted/50"
                      >
                        + {'{{escola}}'}
                      </Button>
                    </div>

                    {/* Textarea com padding e altura ideais (sem corte) */}
                    <Textarea
                      value={greetingDraft.message}
                      onChange={(e) => setGreetingDraft((prev) => ({ ...prev, message: e.target.value }))}
                      placeholder="Olá! Seja bem-vindo(a)..."
                      rows={7}
                      className="text-xs font-mono p-3 leading-relaxed resize-y bg-background min-h-[140px]"
                    />

                    {!greetingDraft.message.includes('{SECTORS_LIST}') && (
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                          Atenção: A tag <code className="font-semibold">{'{SECTORS_LIST}'}</code> não está no texto. Os setores abaixo não serão listados se ela não estiver incluída.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card de Mini-Prévia do Menu no Chat */}
                  <div className="p-3.5 rounded-xl border bg-card/60 shadow-2xs space-y-2">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Prévia das Opções no WhatsApp
                    </span>
                    <div className="bg-[#eef2f5] dark:bg-[#1a232a] p-3 rounded-lg border font-mono text-[11px] leading-relaxed text-foreground whitespace-pre-wrap">
                      {effectiveSectors
                        .filter((s) => isSectorEnabled(s.id, s.name))
                        .map((s) => `*${getOrderNumber(s.id, s.name)}* - ${s.name}`)
                        .join('\n') || '(Nenhum setor selecionado no momento)'}
                    </div>
                  </div>
                </div>

                {/* COLUNA DIREITA: Lista de Setores e Mensagens de Transferência (7 colunas) */}
                <div className="lg:col-span-7 space-y-3 flex flex-col">
                  <div className="p-4 rounded-xl border bg-card shadow-2xs space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-primary" />
                          Setores no Menu Interativo
                        </Label>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Selecione os setores, ordene a numeração e personalize a resposta ao encaminhar.
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs font-semibold bg-muted/30">
                        {effectiveSectors.filter((s) => isSectorEnabled(s.id, s.name)).length} de {effectiveSectors.length} ativos
                      </Badge>
                    </div>

                    {/* Campo Rápido para Criar Novo Setor */}
                    <div className="flex items-center gap-2 pt-1 pb-1">
                      <Input
                        value={newSectorName}
                        onChange={(e) => setNewSectorName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddNewSector())}
                        placeholder="Nome de outro setor (ex: Biblioteca, Cantina, Eventos...)"
                        className="h-8 text-xs bg-background"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddNewSector}
                        disabled={!newSectorName.trim()}
                        className="h-8 text-xs px-3 gap-1 shrink-0 font-medium"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar</span>
                      </Button>
                    </div>

                    {/* Lista dos Setores em Cards Individuais */}
                    <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                      {effectiveSectors.map((sector) => {
                        const isEnabled = isSectorEnabled(sector.id, sector.name);
                        const orderNumber = getOrderNumber(sector.id, sector.name);
                        const sectorGreeting = getSectorGreeting(sector.id, sector.name);

                        return (
                          <div
                            key={sector.id}
                            className={`p-3 rounded-lg border transition-all space-y-2.5 ${
                              isEnabled
                                ? 'bg-background border-border shadow-2xs ring-1 ring-primary/10'
                                : 'bg-muted/10 border-dashed border-border/60 opacity-60'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <Checkbox
                                  id={`modal-sec-${sector.id}`}
                                  checked={isEnabled}
                                  onCheckedChange={() => handleToggleGreetingSector(sector.id, sector.name)}
                                />
                                <Label
                                  htmlFor={`modal-sec-${sector.id}`}
                                  className="text-xs font-semibold cursor-pointer flex items-center gap-2 truncate"
                                >
                                  {isEnabled && orderNumber !== null && (
                                    <Badge className="h-5 w-5 p-0 flex items-center justify-center text-[10px] font-bold bg-primary text-primary-foreground shrink-0">
                                      {orderNumber}
                                    </Badge>
                                  )}
                                  <span className="truncate">{sector.name}</span>
                                </Label>
                              </div>

                              {isEnabled && (
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleMoveSectorUp(sector.id, sector.name)}
                                    disabled={orderNumber === 1}
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-20"
                                    title="Mover para cima"
                                  >
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleMoveSectorDown(sector.id, sector.name)}
                                    disabled={orderNumber === effectiveSectors.filter((s) => isSectorEnabled(s.id, s.name)).length}
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground disabled:opacity-20"
                                    title="Mover para baixo"
                                  >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              )}
                            </div>

                            {/* Campo de Mensagem de Transferência do Setor */}
                            {isEnabled && (
                              <div className="pl-6 space-y-1 pt-0.5 border-t border-border/40">
                                <Label className="text-[10px] text-muted-foreground font-medium">
                                  Resposta enviada ao transferir para {sector.name}:
                                </Label>
                                <Input
                                  value={sectorGreeting}
                                  onChange={(e) => handleUpdateSectorGreeting(sector.id, e.target.value)}
                                  placeholder={`Ex: Perfeito! Transferindo para o setor ${sector.name}. Em instantes um atendente irá te responder.`}
                                  className="h-8 text-xs bg-muted/20"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Rodapé Fixo */}
            <DialogFooter className="p-3 sm:p-4 border-t bg-card flex-shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalTab('dispatch')}
                className="text-xs w-full sm:w-auto"
              >
                Voltar aos Gatilhos
              </Button>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {conversation && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDispatchGreetingToCurrentChat}
                    className="text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5 h-8"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Enviar neste Chat Agora
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={handleSaveGreetingSettings}
                  disabled={isSavingGreeting}
                  className="bg-primary text-primary-foreground font-medium gap-1.5 text-xs h-8 shadow-2xs"
                >
                  {isSavingGreeting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      Salvar Mensagem de Saudação
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
