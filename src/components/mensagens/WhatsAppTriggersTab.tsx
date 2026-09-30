import React, { useState, useMemo, useRef } from 'react';
import {
  Sparkles,
  Plus,
  Zap,
  Edit,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Bot,
  RotateCcw,
  ArrowRight,
  Info,
  Layers,
  HelpCircle,
  Search,
  Filter,
  Copy,
  Download,
  Upload,
  Play,
  Check,
  BookOpen,
  Bus,
  Coffee,
  HeartPulse,
  DollarSign,
  Clock,
  GraduationCap,
  X,
  Phone,
  Send,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWhatsAppTriggers } from '@/hooks/useWhatsAppTriggers';
import { useWhatsAppInbox } from '@/hooks/useWhatsAppInbox';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { WhatsAppTrigger, TipoCorrespondenciaTrigger } from '@/types/mensagens';
import { toast } from 'sonner';

/* --------------------------------------------------------------------------
   FUNÇÕES AUXILIARES SEGURAS (SUPORTA CAMPOS EM PT E EN SEM CRASH)
   -------------------------------------------------------------------------- */
const safeTriggerName = (t: any): string => t?.nome || t?.name || 'Gatilho sem nome';
const safeTriggerKeywords = (t: any): string[] => {
  if (Array.isArray(t?.palavrasChave)) return t.palavrasChave.filter((k: any) => typeof k === 'string');
  if (Array.isArray(t?.keywords)) return t.keywords.filter((k: any) => typeof k === 'string');
  if (typeof t?.palavrasChave === 'string') return t.palavrasChave.split(',').map((k: string) => k.trim()).filter(Boolean);
  if (typeof t?.keywords === 'string') return t.keywords.split(',').map((k: string) => k.trim()).filter(Boolean);
  return [];
};
const safeTriggerResponse = (t: any): string => t?.respostaTexto || t?.message_template || t?.text || '';
const safeTriggerSector = (t: any): string | null => t?.setorDestinoId || t?.target_sector_id || null;
const safeTriggerStatus = (t: any): 'open' | 'pending' | 'resolved' | 'closed' | null =>
  t?.alterarStatus || t?.target_status || null;
const safeTriggerPriority = (t: any): number => Number(t?.prioridade || t?.priority) || 1;
const safeTriggerActive = (t: any): boolean => t?.ativo !== false && t?.active !== false;

/* --------------------------------------------------------------------------
   BIBLIOTECA DE MODELOS ESCOLARES PRONTOS
   -------------------------------------------------------------------------- */
interface SchoolTriggerTemplate {
  id: string;
  category: string;
  nome: string;
  descricao: string;
  tipoCorrespondencia: TipoCorrespondenciaTrigger;
  palavrasChave: string[];
  respostaTexto: string;
  setorSugeridoSlug: string;
  prioridade: number;
}

const SCHOOL_TRIGGER_TEMPLATES: SchoolTriggerTemplate[] = [
  {
    id: 'tpl-rematricula',
    category: 'Matrículas & Vendas',
    nome: '🎒 Rematrícula com Desconto de Pontualidade',
    descricao: 'Orienta pais sobre o período de renovação de matrícula e vagas prioritárias.',
    tipoCorrespondencia: 'contem',
    palavrasChave: ['rematricula', 'rematrícula', 'renovacao', 'renovação', 'desconto antecipado', 'garantia de vaga'],
    respostaTexto: 'Olá {{nome}}! 🎒 O período de renovação de matrícula para {{aluno}} na {{escola}} já está aberto com condições especiais de pontualidade! Estou transferindo seu atendimento para nossa equipe de Matrículas para garantir sua vaga.',
    setorSugeridoSlug: 'comercial',
    prioridade: 1,
  },
  {
    id: 'tpl-transporte',
    category: 'Logística & Transporte',
    nome: '🚌 Transporte Escolar & Rotas',
    descricao: 'Responde dúvidas sobre itinerários, vans parceiras e horários de embarque.',
    tipoCorrespondencia: 'contem',
    palavrasChave: ['transporte', 'van', 'onibus', 'ônibus', 'rota', 'motorista', 'itinerario', 'itinerário', 'embarque'],
    respostaTexto: 'Olá {{nome}}! 🚌 Para informações sobre trajetos, horários de embarque/desembarque e contato com condutores parceiros para {{aluno}}, estamos encaminhando sua mensagem para a Coordenação de Transporte.',
    setorSugeridoSlug: 'administrativo',
    prioridade: 4,
  },
  {
    id: 'tpl-cantina',
    category: 'Cantina & Alimentação',
    nome: '🥪 Cantina Escolar & Saldo de Lanche',
    descricao: 'Auxilia na consulta ao cardápio nutricional e recarga de créditos na cantina.',
    tipoCorrespondencia: 'contem',
    palavrasChave: ['cantina', 'lanche', 'cardapio', 'cardápio', 'almoco', 'almoço', 'credito cantina', 'recarregar cantina'],
    respostaTexto: 'Olá {{nome}}! 🥪 O cardápio balanceado da {{escola}} é elaborado por nutricionistas. Para recarga de créditos ou informações sobre o lanche de {{aluno}}, nosso time de Nutrição e Cantina irá te responder em breve!',
    setorSugeridoSlug: 'administrativo',
    prioridade: 5,
  },
  {
    id: 'tpl-atestado',
    category: 'Secretaria & Saúde',
    nome: '🩺 Atestado Médico & Justificativa de Faltas',
    descricao: 'Informa o procedimento para envio de atestados e abono de faltas escolares.',
    tipoCorrespondencia: 'contem',
    palavrasChave: ['atestado', 'doente', 'falta', 'faltou', 'repouso', 'declaracao medica', 'abonar falta', 'consulta medica'],
    respostaTexto: 'Olá {{nome}}! 🩺 Desejamos rápida recuperação para {{aluno}}. Para protocolar o atestado médico e abonar faltas ou agendar segunda chamada de provas, transferi seu chamado para a Secretaria Escolar.',
    setorSugeridoSlug: 'secretaria',
    prioridade: 2,
  },
  {
    id: 'tpl-material',
    category: 'Pedagógico & Livros',
    nome: '📚 Lista de Materiais & Uniformes',
    descricao: 'Facilita o acesso à lista de livros didáticos, papelaria e pontos de uniforme.',
    tipoCorrespondencia: 'contem',
    palavrasChave: ['material', 'material escolar', 'livros', 'apostilas', 'uniforme', 'lista de compras', 'papelaria'],
    respostaTexto: 'Olá {{nome}}! 📚 A lista oficial de livros didáticos, uniformes e materiais da turma de {{aluno}} pode ser consultada online. Conectando você com a Secretaria / Loja da {{escola}} para esclarecimentos!',
    setorSugeridoSlug: 'secretaria',
    prioridade: 3,
  },
  {
    id: 'tpl-provas',
    category: 'Pedagógico & Avaliações',
    nome: '📅 Calendário de Provas & Recuperação',
    descricao: 'Informa sobre cronograma avaliativo, simulados e apoio pedagógico.',
    tipoCorrespondencia: 'contem',
    palavrasChave: ['prova', 'provas', 'recuperacao', 'recuperação', 'simulado', 'teste', 'calendario de provas', 'data da prova'],
    respostaTexto: 'Olá {{nome}}! 📅 O cronograma de avaliações, simulados e recuperação da turma de {{aluno}} já foi liberado no mural da {{escola}}. A Coordenação Pedagógica está à disposição para dúvidas!',
    setorSugeridoSlug: 'pedagogico',
    prioridade: 3,
  },
  {
    id: 'tpl-pix-boleto',
    category: 'Financeiro',
    nome: '💳 PIX Rápido & 2ª Via de Mensalidade',
    descricao: 'Direciona pedidos de segunda via de boletos, carnês e comprovantes de quitação.',
    tipoCorrespondencia: 'contem',
    palavrasChave: ['chave pix', 'codigo de barras', 'boleto vencido', 'segunda via boleto', 'pagar mensalidade', 'quitar', 'carne'],
    respostaTexto: 'Olá {{nome}}! 💳 Para emitir a 2ª via com código de barras atualizado ou efetuar pagamento via PIX para o aluno(a) {{aluno}}, nosso setor Financeiro já recebeu seu pedido e vai te enviar os dados!',
    setorSugeridoSlug: 'financeiro',
    prioridade: 2,
  },
  {
    id: 'tpl-portaria',
    category: 'Segurança & Recepção',
    nome: '⏰ Portaria, Atrasos & Saída Antecipada',
    descricao: 'Comunica a recepção sobre liberações extraordinárias ou atrasos de alunos.',
    tipoCorrespondencia: 'contem',
    palavrasChave: ['portaria', 'horario de entrada', 'horario de saida', 'atraso', 'liberar aluno', 'buscar mais cedo', 'pegar na escola'],
    respostaTexto: 'Olá {{nome}}! ⏰ Notificação de segurança recebida. Para autorização de saída antecipada ou tolerância de atraso para {{aluno}}, nossa equipe de Portaria e Recepção da {{escola}} foi avisada.',
    setorSugeridoSlug: 'secretaria',
    prioridade: 2,
  },
];

export function WhatsAppTriggersTab() {
  const {
    triggers = [],
    addTrigger,
    updateTrigger,
    deleteTrigger,
    toggleTrigger,
    resetDefaultTriggers,
    importTriggers,
    evaluateMessage,
  } = useWhatsAppTriggers();

  const { allAvailableSectors = [] } = useWhatsAppInbox();
  const { school, profile } = useAuth();

  // Test bench state
  const [testInput, setTestInput] = useState('olá, gostaria de saber como faço a matrícula e qual o valor');
  const [testPhoneNumber, setTestPhoneNumber] = useState(profile?.phone || '');
  const [isSendingWhatsAppTest, setIsSendingWhatsAppTest] = useState(false);
  const testBenchRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSector, setFilterSector] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'paused'>('all');

  // Trigger edit/create modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTriggerId, setEditingTriggerId] = useState<string | null>(null);
  const [libraryModalOpen, setLibraryModalOpen] = useState(false);

  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<TipoCorrespondenciaTrigger>('contem');
  const [formKeywords, setFormKeywords] = useState('');
  const [formResponse, setFormResponse] = useState('');
  const [formSector, setFormSector] = useState<string>('none');
  const [formStatus, setFormStatus] = useState<string>('open');
  const [formPriority, setFormPriority] = useState<number>(1);

  // Safe sector name resolution with slug and fuzzy matching
  const getSectorName = (sectorId?: string | null) => {
    if (!sectorId || sectorId === 'none') return null;
    const target = String(sectorId).toLowerCase();
    const sector = (allAvailableSectors || []).find(
      (s) =>
        s &&
        (s.id === sectorId ||
          (s.name && s.name.toLowerCase() === target) ||
          (s.name && s.name.toLowerCase().includes(target)) ||
          (s.id && s.id.toLowerCase().includes(target)))
    );
    return sector ? sector.name : sectorId;
  };

  // Resolve best sector ID from slug
  const resolveSectorIdFromSlug = (slug: string): string | null => {
    if (!slug) return null;
    const cleanSlug = slug.toLowerCase();
    const match = (allAvailableSectors || []).find(
      (s) =>
        s &&
        ((s.name && s.name.toLowerCase().includes(cleanSlug)) ||
         (s.id && s.id.toLowerCase().includes(cleanSlug)))
    );
    return match ? match.id : null;
  };

  // Evaluate test bench live with current school branding
  const testResult = evaluateMessage(testInput, {
    contactName: profile?.full_name || 'Carlos Silva (Responsável)',
    studentName: 'Lucas Silva (Aluno)',
    schoolName: school?.name || 'Purple Edu',
    currentSectorName: 'Secretaria',
  });

  // Filter triggers with complete null safety
  const safeList = useMemo(() => (Array.isArray(triggers) ? triggers.filter(Boolean) : []), [triggers]);

  const filteredTriggers = useMemo(() => {
    return safeList
      .filter((trigger) => {
        const active = safeTriggerActive(trigger);
        if (filterStatus === 'active' && !active) return false;
        if (filterStatus === 'paused' && active) return false;

        const secId = safeTriggerSector(trigger);
        if (filterSector !== 'all') {
          if (filterSector === 'none') {
            if (secId) return false;
          } else if (secId !== filterSector) {
            return false;
          }
        }

        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          const name = safeTriggerName(trigger).toLowerCase();
          const keywords = safeTriggerKeywords(trigger);
          const matchKeywords = keywords.some((kw) => kw.toLowerCase().includes(query));
          const responseText = safeTriggerResponse(trigger).toLowerCase();
          return name.includes(query) || matchKeywords || responseText.includes(query);
        }

        return true;
      })
      .sort((a, b) => safeTriggerPriority(a) - safeTriggerPriority(b));
  }, [safeList, filterStatus, filterSector, searchQuery]);

  // Metrics summary
  const metrics = useMemo(() => {
    const total = safeList.length;
    const active = safeList.filter((t) => safeTriggerActive(t)).length;
    const totalAcionamentos = safeList.reduce(
      (acc, t) => acc + (t.totalAcionamentos || 0),
      0
    );
    const sectorsWithTriggers = new Set(
      safeList.map((t) => safeTriggerSector(t)).filter(Boolean)
    ).size;

    return {
      total,
      active,
      paused: total - active,
      totalAcionamentos,
      sectorsWithTriggers,
    };
  }, [safeList]);

  const openCreateModal = () => {
    setEditingTriggerId(null);
    setFormName('');
    setFormType('contem');
    setFormKeywords('');
    setFormResponse(
      'Olá {{nome}}! Recebemos sua mensagem sobre {{aluno}}. Estamos direcionando para o setor responsável.'
    );
    setFormSector('none');
    setFormStatus('open');
    setFormPriority(safeList.length + 1);
    setModalOpen(true);
  };

  const openEditModal = (trigger: WhatsAppTrigger) => {
    setEditingTriggerId(trigger.id);
    setFormName(safeTriggerName(trigger));
    setFormType(trigger.tipoCorrespondencia || 'contem');
    setFormKeywords(safeTriggerKeywords(trigger).join(', '));
    setFormResponse(safeTriggerResponse(trigger));
    setFormSector(safeTriggerSector(trigger) || 'none');
    setFormStatus(safeTriggerStatus(trigger) || 'none');
    setFormPriority(safeTriggerPriority(trigger));
    setModalOpen(true);
  };

  const handleDuplicateTrigger = (trigger: WhatsAppTrigger) => {
    const keywords = safeTriggerKeywords(trigger);
    addTrigger({
      nome: `${safeTriggerName(trigger)} (Cópia)`,
      ativo: safeTriggerActive(trigger),
      tipoCorrespondencia: trigger.tipoCorrespondencia || 'contem',
      palavrasChave: [...keywords],
      respostaTexto: safeTriggerResponse(trigger),
      setorDestinoId: safeTriggerSector(trigger),
      alterarStatus: safeTriggerStatus(trigger),
      prioridade: safeTriggerPriority(trigger) + 1,
    });
    toast.success(`Gatilho duplicado como "${safeTriggerName(trigger)} (Cópia)"`);
  };

  const handleTestInBench = (trigger: WhatsAppTrigger) => {
    const keywords = safeTriggerKeywords(trigger);
    const sampleKeyword = keywords[0] || 'olá gostaria de atendimento';
    setTestInput(sampleKeyword);
    testBenchRef.current?.scrollIntoView({ behavior: 'smooth' });
    toast.info(`Testando no simulador com a palavra-chave "${sampleKeyword}"`);
  };

  const handleAddTemplate = (template: SchoolTriggerTemplate) => {
    const targetSector = resolveSectorIdFromSlug(template.setorSugeridoSlug);
    addTrigger({
      nome: template.nome,
      ativo: true,
      tipoCorrespondencia: template.tipoCorrespondencia,
      palavrasChave: template.palavrasChave,
      respostaTexto: template.respostaTexto,
      setorDestinoId: targetSector,
      alterarStatus: 'open',
      prioridade: safeList.length + 1,
    });
    toast.success(`Modelo "${template.nome}" adicionado aos seus gatilhos!`);
  };

  const handleSaveTrigger = () => {
    if (!formName.trim()) {
      toast.error('Informe o nome identificador do gatilho.');
      return;
    }
    if (!formResponse.trim()) {
      toast.error('Informe a mensagem de resposta automática.');
      return;
    }

    const keywordsArray = formKeywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    if (formType !== 'qualquer_primeira' && keywordsArray.length === 0) {
      toast.error('Informe ao menos uma palavra-chave para o gatilho.');
      return;
    }

    const sectorId = formSector === 'none' ? null : formSector;
    const ticketStatus =
      formStatus === 'none'
        ? null
        : (formStatus as 'open' | 'pending' | 'resolved' | 'closed');

    if (editingTriggerId) {
      updateTrigger(editingTriggerId, {
        nome: formName.trim(),
        tipoCorrespondencia: formType,
        palavrasChave: keywordsArray,
        respostaTexto: formResponse.trim(),
        setorDestinoId: sectorId,
        alterarStatus: ticketStatus,
        prioridade: Number(formPriority) || 1,
      });
    } else {
      addTrigger({
        nome: formName.trim(),
        ativo: true,
        tipoCorrespondencia: formType,
        palavrasChave: keywordsArray,
        respostaTexto: formResponse.trim(),
        setorDestinoId: sectorId,
        alterarStatus: ticketStatus,
        prioridade: Number(formPriority) || 1,
      });
    }

    setModalOpen(false);
  };

  const appendVariable = (variable: string) => {
    setFormResponse((prev) => `${prev} {{${variable}}}`);
  };

  // Disparo real de teste para o WhatsApp informado
  const handleDispatchRealWhatsAppTest = async () => {
    if (!testResult.matched || !testResult.formattedResponse) {
      toast.error('Digite uma frase no simulador que ative um gatilho antes de enviar.');
      return;
    }

    const cleanPhone = testPhoneNumber.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error('Digite seu número de WhatsApp com DDD (ex: 11999998888).');
      return;
    }

    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

    try {
      setIsSendingWhatsAppTest(true);
      const res = await supabase.functions.invoke('uazapi', {
        body: {
          action: 'send-text',
          data: {
            phone: formattedPhone,
            message: `🤖 *[TESTE DE GATILHO: ${safeTriggerName(testResult.trigger)}]*\n\n${testResult.formattedResponse}`,
          },
        },
      });

      if (res.error) {
        toast.error(`Falha no envio: ${res.error.message || 'Verifique se a instância do WhatsApp está conectada'}`);
      } else {
        toast.success(`Mensagem de teste enviada com sucesso para +${formattedPhone}!`);
        if (testResult.trigger?.id) {
          updateTrigger(testResult.trigger.id, {
            totalAcionamentos: (testResult.trigger.totalAcionamentos || 0) + 1,
          });
        }
      }
    } catch (err: any) {
      toast.error(`Erro ao disparar teste: ${err?.message || 'Tente novamente'}`);
    } finally {
      setIsSendingWhatsAppTest(false);
    }
  };

  // Export triggers to JSON
  const handleExportTriggers = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(safeList, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `gatilhos-whatsapp-escola-${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success('Backup de gatilhos exportado com sucesso!');
  };

  // Import triggers from JSON
  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (Array.isArray(parsed)) {
          importTriggers(parsed);
        } else {
          toast.error('Formato de arquivo JSON inválido.');
        }
      } catch (err) {
        toast.error('Erro ao ler arquivo de gatilhos.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* ---------------- CABEÇALHO DA ABA ---------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
            Gatilhos & Respostas Automáticas
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Automatize o atendimento escolar com triagem inteligente por palavras-chave e direcionamento instantâneo para os setores certos.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json"
            className="hidden"
          />

          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8"
            title="Importar gatilhos de backup JSON"
          >
            <Upload className="w-3.5 h-3.5" />
            Importar JSON
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportTriggers}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8"
            title="Exportar cópia de segurança em JSON"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setLibraryModalOpen(true)}
            className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/5 h-8 font-medium"
          >
            <BookOpen className="w-3.5 h-3.5 text-primary" />
            Modelos Prontos
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={resetDefaultTriggers}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar Padrões
          </Button>

          <Button size="sm" onClick={openCreateModal} className="gap-1.5 text-xs h-8">
            <Plus className="w-4 h-4" />
            Novo Gatilho
          </Button>
        </div>
      </div>

      {/* ---------------- CARDS DE MÉTRICAS RÁPIDAS ---------------- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Card 1: Gatilhos Ativos */}
        <Card className="border border-border/70 shadow-2xs">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium text-muted-foreground">Gatilhos Ativos</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-foreground">{metrics.active}</span>
                <span className="text-xs text-muted-foreground">de {metrics.total} cadastrados</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Total de Disparos */}
        <Card className="border border-border/70 shadow-2xs">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium text-muted-foreground">Total de Disparos</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-foreground">{metrics.totalAcionamentos}</span>
                <span className="text-xs text-muted-foreground">interações</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Zap className="w-4 h-4 fill-amber-500 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Setores Integrados */}
        <Card className="border border-border/70 shadow-2xs">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium text-muted-foreground">Setores Integrados</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-foreground">{metrics.sectorsWithTriggers}</span>
                <span className="text-xs text-muted-foreground">setores com triagem</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Building2 className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Status do Motor */}
        <Card className="border border-border/70 shadow-2xs">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium text-muted-foreground">Motor de Automação</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-600">Ativo 24/7</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
              <Bot className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ---------------- SIMULADOR DE REGRAS EM TEMPO REAL ---------------- */}
      <div ref={testBenchRef}>
        <Card className="border-amber-500/20 bg-gradient-to-r from-amber-500/5 via-card to-card shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Bancada de Testes de Gatilhos em Tempo Real
            </CardTitle>
            <CardDescription className="text-xs">
              Digite qualquer frase que um pai, responsável ou aluno enviaria para testar qual regra será ativada e qual resposta será emitida.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="Ex: preciso do boleto da mensalidade do mês de outubro"
                className="text-xs h-9 bg-background"
              />
              <Button
                variant="secondary"
                size="sm"
                className="text-xs flex-shrink-0"
                onClick={() => setTestInput('gostaria de agendar uma reunião com a coordenação')}
              >
                Exemplo Pedagógico
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="text-xs flex-shrink-0"
                onClick={() => setTestInput('qual o horário de funcionamento da escola?')}
              >
                Exemplo Horário
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="text-xs flex-shrink-0"
                onClick={() => setTestInput('preciso justificar a falta com o atestado médico')}
              >
                Exemplo Atestado
              </Button>
            </div>

            {/* Resultado do Teste */}
            <div className="p-3.5 rounded-lg border bg-background/80 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                <span className="font-semibold flex items-center gap-1.5 text-muted-foreground">
                  <Bot className="w-4 h-4 text-primary" />
                  Diagnóstico de Disparo:
                </span>

                {testResult.matched ? (
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 gap-1 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Gatilho Ativado: &quot;{safeTriggerName(testResult.trigger)}&quot; (Palavra-chave: &quot;{testResult.matchedKeyword}&quot;)
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground gap-1 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    Nenhum gatilho ativado (Atendimento segue para a fila geral sem automação)
                  </Badge>
                )}
              </div>

              {testResult.matched && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t text-xs">
                  <div className="space-y-1">
                    <span className="font-medium text-muted-foreground">Resposta Automática Formatada:</span>
                    <div className="p-2.5 rounded-md bg-muted/40 text-foreground border text-xs leading-relaxed italic">
                      &quot;{testResult.formattedResponse}&quot;
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="font-medium text-muted-foreground">Ações de Roteamento:</span>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Roteamento de Setor:</span>
                        {testResult.targetSectorId ? (
                          <Badge variant="secondary" className="gap-1 font-semibold text-primary">
                            <Building2 className="w-3 h-3" />
                            {getSectorName(testResult.targetSectorId)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">Mantém no setor atual</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Status do Ticket:</span>
                        <span className="font-semibold text-foreground">
                          {testResult.newStatus ? `Alterado para "${testResult.newStatus}"` : 'Sem alteração'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Disparo de Teste Real no WhatsApp */}
              <div className="pt-3 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-semibold text-foreground">Testar disparo no seu WhatsApp:</span>
                </div>
                <div className="flex items-center gap-2 flex-1 sm:max-w-md">
                  <Input
                    value={testPhoneNumber}
                    onChange={(e) => setTestPhoneNumber(e.target.value)}
                    placeholder="Seu número com DDD (ex: 11999998888)"
                    className="h-8 text-xs bg-background"
                  />
                  <Button
                    size="sm"
                    onClick={handleDispatchRealWhatsAppTest}
                    disabled={isSendingWhatsAppTest || !testResult.matched}
                    className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex-shrink-0"
                    title={testResult.matched ? "Enviar resposta simulada para o WhatsApp informado" : "Digite uma frase que ative um gatilho"}
                  >
                    {isSendingWhatsAppTest ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Enviar no meu WhatsApp
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ---------------- BARRA DE FILTROS & BUSCA ---------------- */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/30 p-2.5 rounded-lg border">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, palavra-chave ou texto de resposta..."
            className="pl-8 text-xs h-8 bg-background"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtro por Setor */}
          <Select value={filterSector} onValueChange={setFilterSector}>
            <SelectTrigger className="h-8 text-xs min-w-[140px] bg-background">
              <SelectValue placeholder="Setor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">🏢 Todos os Setores</SelectItem>
              <SelectItem value="none">🚫 Sem transferência</SelectItem>
              {(allAvailableSectors || []).map((sec) => (
                <SelectItem key={sec.id} value={sec.id}>
                  {sec.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro por Status */}
          <Select value={filterStatus} onValueChange={(val: any) => setFilterStatus(val)}>
            <SelectTrigger className="h-8 text-xs min-w-[110px] bg-background">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="active">🟢 Apenas Ativos</SelectItem>
              <SelectItem value="paused">⚪ Apenas Pausados</SelectItem>
            </SelectContent>
          </Select>

          {(searchQuery || filterSector !== 'all' || filterStatus !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setFilterSector('all');
                setFilterStatus('all');
              }}
              className="text-xs h-8 text-muted-foreground hover:text-foreground px-2"
            >
              Limpar Filtros
            </Button>
          )}
        </div>
      </div>

      {/* ---------------- LISTAGEM DE GATILHOS CADASTRADOS ---------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Gatilhos Cadastrados ({filteredTriggers.length}
            {filteredTriggers.length !== safeList.length && ` de ${safeList.length}`})
          </h3>
          <span className="text-xs text-muted-foreground">
            Avaliados em tempo real por ordem de prioridade
          </span>
        </div>

        {filteredTriggers.length === 0 ? (
          <div className="p-8 text-center rounded-lg border border-dashed bg-muted/20 space-y-3">
            <Zap className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Nenhum gatilho encontrado</p>
              <p className="text-xs text-muted-foreground">
                Tente ajustar os termos de busca ou filtros aplicados acima.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setFilterSector('all');
                setFilterStatus('all');
              }}
              className="text-xs gap-1.5"
            >
              Restaurar visualização
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredTriggers.map((trigger) => {
              const targetSectorName = getSectorName(safeTriggerSector(trigger));
              const keywords = safeTriggerKeywords(trigger);
              const triggerName = safeTriggerName(trigger);
              const triggerResponse = safeTriggerResponse(trigger);
              const priority = safeTriggerPriority(trigger);
              const active = safeTriggerActive(trigger);

              return (
                <Card
                  key={trigger.id}
                  className={`transition-all duration-200 ${
                    active ? 'border-border' : 'opacity-65 bg-muted/30 border-dashed'
                  }`}
                >
                  <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    {/* Informações Principais */}
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-bold text-sm text-foreground">{triggerName}</span>

                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase tracking-wider font-semibold"
                        >
                          {trigger.tipoCorrespondencia === 'contem'
                            ? 'Contém palavra'
                            : trigger.tipoCorrespondencia === 'exata'
                            ? 'Mensagem Exata'
                            : trigger.tipoCorrespondencia === 'inicio'
                            ? 'Começa com'
                            : 'Qualquer 1ª Mensagem'}
                        </Badge>

                        {targetSectorName && (
                          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs gap-1 font-medium">
                            <Building2 className="w-3 h-3" />
                            Transfere para: {targetSectorName}
                          </Badge>
                        )}

                        <span className="text-[11px] text-muted-foreground">
                          Prioridade: #{priority}
                        </span>

                        {trigger.totalAcionamentos !== undefined && (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            ⚡ {trigger.totalAcionamentos} disparos
                          </span>
                        )}
                      </div>

                      {/* Palavras-Chave */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] text-muted-foreground font-medium">
                          Palavras-chave:
                        </span>
                        {keywords.length > 0 ? (
                          keywords.map((kw, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-mono text-foreground border"
                            >
                              {kw}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">
                            Nenhuma cadastrada
                          </span>
                        )}
                      </div>

                      {/* Resposta Mensagem Preview */}
                      <div className="text-xs text-muted-foreground line-clamp-2 italic bg-muted/20 p-2 rounded border border-border/50">
                        &quot;{triggerResponse}&quot;
                      </div>
                    </div>

                    {/* Ações e Toggle Ativo */}
                    <div className="flex items-center gap-2.5 self-end md:self-center flex-shrink-0 pt-2 md:pt-0 border-t md:border-t-0 w-full md:w-auto justify-between md:justify-end">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={active}
                          onCheckedChange={() => toggleTrigger(trigger.id)}
                          aria-label="Ativar ou desativar gatilho"
                        />
                        <span className="text-xs text-muted-foreground">
                          {active ? 'Ativo' : 'Pausado'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Botão de Testar no Simulador */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground px-2"
                          onClick={() => handleTestInBench(trigger)}
                          title="Carregar palavra-chave no simulador de testes"
                        >
                          <Play className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span className="hidden sm:inline">Testar</span>
                        </Button>

                        {/* Botão de Duplicar Gatilho */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => handleDuplicateTrigger(trigger)}
                          title="Duplicar gatilho"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>

                        {/* Botão de Editar */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => openEditModal(trigger)}
                          title="Editar gatilho"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>

                        {/* Botão de Excluir */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          onClick={() => deleteTrigger(trigger.id)}
                          title="Excluir gatilho"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ---------------- MODAL DE MODELOS PRONTOS ESCOLARES ---------------- */}
      <Dialog open={libraryModalOpen} onOpenChange={setLibraryModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <BookOpen className="w-5 h-5 text-primary" />
              Biblioteca de Gatilhos Escolares Prontos
            </DialogTitle>
            <DialogDescription className="text-xs">
              Selecione automações pré-configuradas para o dia a dia pedagógico, financeiro e administrativo da escola.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 py-2">
            {SCHOOL_TRIGGER_TEMPLATES.map((template) => {
              const isAlreadyAdded = safeList.some((t) => {
                const name = safeTriggerName(t).toLowerCase();
                const keywords = safeTriggerKeywords(t);
                return (
                  name === template.nome.toLowerCase() ||
                  template.palavrasChave.some((kw) => keywords.includes(kw))
                );
              });

              return (
                <div
                  key={template.id}
                  className="p-3 rounded-lg border bg-card hover:bg-muted/10 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground">
                        {template.nome}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {template.category}
                      </Badge>
                    </div>

                    <p className="text-xs text-muted-foreground">{template.descricao}</p>

                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                      <span className="text-[10px] text-muted-foreground">Palavras-chave:</span>
                      {template.palavrasChave.slice(0, 4).map((kw, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.2 rounded bg-muted text-[10px] font-mono border"
                        >
                          {kw}
                        </span>
                      ))}
                      {template.palavrasChave.length > 4 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{template.palavrasChave.length - 4} mais
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={isAlreadyAdded ? 'outline' : 'default'}
                    className="flex-shrink-0 text-xs gap-1.5"
                    onClick={() => {
                      handleAddTemplate(template);
                      setLibraryModalOpen(false);
                    }}
                  >
                    {isAlreadyAdded ? (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar Cópia
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Adicionar à Escola
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLibraryModalOpen(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- MODAL DE CRIAÇÃO E EDIÇÃO DE GATILHO ---------------- */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
              {editingTriggerId ? 'Editar Gatilho Automático' : 'Criar Novo Gatilho Automático'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure as palavras-chave que ativarão a resposta automática e para qual setor a conversa será transferida.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Nome do Gatilho */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Nome Identificador da Regra</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Matrículas e Valores 2026"
                className="h-8 text-xs"
              />
            </div>

            {/* Tipo de Correspondência */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Regra de Correspondência</label>
                <Select
                  value={formType}
                  onValueChange={(val) => setFormType(val as TipoCorrespondenciaTrigger)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contem">Contém a palavra (Recomendado)</SelectItem>
                    <SelectItem value="exata">Mensagem Exata</SelectItem>
                    <SelectItem value="inicio">Começa com a palavra</SelectItem>
                    <SelectItem value="qualquer_primeira">Qualquer 1ª mensagem do contato</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Prioridade de Execução</label>
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={formPriority}
                  onChange={(e) => setFormPriority(Number(e.target.value))}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Palavras-Chave */}
            {formType !== 'qualquer_primeira' && (
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">
                  Palavras-Chave (separadas por vírgula)
                </label>
                <Input
                  value={formKeywords}
                  onChange={(e) => setFormKeywords(e.target.value)}
                  placeholder="Ex: matricula, valor, preco, mensalidade, vaga"
                  className="h-8 text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Dica: acentos e maiúsculas são desconsiderados automaticamente pelo sistema.
                </p>
              </div>
            )}

            {/* Setor de Destino e Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">
                  Transferir Automaticamente para o Setor
                </label>
                <Select value={formSector} onValueChange={setFormSector}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecione o setor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">🚫 Não transferir (manter atual)</SelectItem>
                    {(allAvailableSectors || []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Definir Status do Atendimento</label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não alterar status</SelectItem>
                    <SelectItem value="open">🟢 Em Aberto</SelectItem>
                    <SelectItem value="pending">🟡 Pendente (Aguardando)</SelectItem>
                    <SelectItem value="resolved">🔵 Resolvido</SelectItem>
                    <SelectItem value="closed">⚪ Encerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Mensagem de Resposta */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <label className="font-semibold text-foreground">Texto da Resposta Automática</label>
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] text-muted-foreground">Variáveis:</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-5 text-[10px] px-1.5"
                    onClick={() => appendVariable('nome')}
                  >
                    + Nome
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-5 text-[10px] px-1.5"
                    onClick={() => appendVariable('aluno')}
                  >
                    + Aluno
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-5 text-[10px] px-1.5"
                    onClick={() => appendVariable('escola')}
                  >
                    + Escola
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-5 text-[10px] px-1.5"
                    onClick={() => appendVariable('setor')}
                  >
                    + Setor
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-5 text-[10px] px-1.5"
                    onClick={() => appendVariable('chave_pix')}
                  >
                    + Chave PIX
                  </Button>
                </div>
              </div>

              <Textarea
                rows={4}
                value={formResponse}
                onChange={(e) => setFormResponse(e.target.value)}
                placeholder="Olá {{nome}}! Que alegria receber seu contato..."
                className="text-xs leading-relaxed"
              />
              <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-0.5">
                <span>Total de caracteres: {formResponse.length}</span>
                <span>As variáveis são preenchidas dinamicamente ao disparar</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSaveTrigger}>
              Salvar Gatilho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
