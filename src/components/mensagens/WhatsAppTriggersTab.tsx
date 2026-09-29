import React, { useState } from 'react';
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
import { WhatsAppTrigger, TipoCorrespondenciaTrigger } from '@/types/mensagens';

export function WhatsAppTriggersTab() {
  const {
    triggers,
    addTrigger,
    updateTrigger,
    deleteTrigger,
    toggleTrigger,
    resetDefaultTriggers,
    evaluateMessage,
  } = useWhatsAppTriggers();

  const { allAvailableSectors } = useWhatsAppInbox();

  // Test bench state
  const [testInput, setTestInput] = useState('olá, gostaria de saber como faço a matrícula e qual o valor');

  // Trigger modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTriggerId, setEditingTriggerId] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<TipoCorrespondenciaTrigger>('contem');
  const [formKeywords, setFormKeywords] = useState('');
  const [formResponse, setFormResponse] = useState('');
  const [formSector, setFormSector] = useState<string>('none');
  const [formStatus, setFormStatus] = useState<string>('open');
  const [formPriority, setFormPriority] = useState<number>(1);

  // Evaluate test bench live
  const testResult = evaluateMessage(testInput, {
    contactName: 'Carlos Silva',
    studentName: 'Lucas Silva',
    schoolName: 'Purple Edu',
    currentSectorName: 'Secretaria',
  });

  const openCreateModal = () => {
    setEditingTriggerId(null);
    setFormName('');
    setFormType('contem');
    setFormKeywords('');
    setFormResponse('Olá {{nome}}! Recebemos sua mensagem sobre {{aluno}}. Estamos direcionando para o setor responsável.');
    setFormSector('none');
    setFormStatus('open');
    setFormPriority(triggers.length + 1);
    setModalOpen(true);
  };

  const openEditModal = (trigger: WhatsAppTrigger) => {
    setEditingTriggerId(trigger.id);
    setFormName(trigger.nome);
    setFormType(trigger.tipoCorrespondencia);
    setFormKeywords(trigger.palavrasChave.join(', '));
    setFormResponse(trigger.respostaTexto);
    setFormSector(trigger.setorDestinoId || 'none');
    setFormStatus(trigger.alterarStatus || 'none');
    setFormPriority(trigger.prioridade);
    setModalOpen(true);
  };

  const handleSaveTrigger = () => {
    if (!formName.trim() || !formResponse.trim()) return;

    const keywordsArray = formKeywords
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

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
    setFormResponse((prev) => prev + ` {{${variable}}}`);
  };

  const getSectorName = (sectorId?: string | null) => {
    if (!sectorId || sectorId === 'none') return null;
    const sector = allAvailableSectors.find((s) => s.id === sectorId);
    return sector ? sector.name : sectorId;
  };

  return (
    <div className="space-y-6">
      {/* ---------------- CABEÇALHO DA ABA ---------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Triggers & Respostas Automáticas
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Automatize o atendimento escolar com triagem por palavras-chave e direcionamento instantâneo para os setores certos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetDefaultTriggers}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar Padrões
          </Button>

          <Button size="sm" onClick={openCreateModal} className="gap-1.5 text-xs">
            <Plus className="w-4 h-4" />
            Novo Trigger
          </Button>
        </div>
      </div>

      {/* ---------------- SIMULADOR DE REGRAS EM TEMPO REAL ---------------- */}
      <Card className="border-amber-500/20 bg-gradient-to-r from-amber-500/5 via-card to-card shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Bancada de Testes de Triggers em Tempo Real
          </CardTitle>
          <CardDescription className="text-xs">
            Digite qualquer frase que um pai ou aluno enviaria para testar qual regra será ativada e qual resposta será emitida.
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
              onClick={() => setTestInput('gostaria de agendar uma reunião com o professor')}
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
                  Gatilho Ativado: &quot;{testResult.trigger?.nome}&quot; (Palavra-chave: &quot;{testResult.matchedKeyword}&quot;)
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground gap-1 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  Nenhum gatilho ativado (Atendimento segue para a fila geral)
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
          </div>
        </CardContent>
      </Card>

      {/* ---------------- LISTAGEM DE TRIGGERS CADASTRADOS ---------------- */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            Gatilhos em Produção ({triggers.length})
          </h3>
          <span className="text-xs text-muted-foreground">
            Avaliados por ordem de prioridade
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {triggers
            .sort((a, b) => a.prioridade - b.prioridade)
            .map((trigger) => {
              const targetSectorName = getSectorName(trigger.setorDestinoId);

              return (
                <Card
                  key={trigger.id}
                  className={`transition-all duration-200 ${
                    trigger.ativo ? 'border-border' : 'opacity-60 bg-muted/30 border-dashed'
                  }`}
                >
                  <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    {/* Informações Principais */}
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-bold text-sm text-foreground">{trigger.nome}</span>

                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-semibold">
                          {trigger.tipoCorrespondencia === 'contem'
                            ? 'Contém'
                            : trigger.tipoCorrespondencia === 'exata'
                            ? 'Exata'
                            : trigger.tipoCorrespondencia === 'inicio'
                            ? 'Início'
                            : 'Qualquer 1ª Mensagem'}
                        </Badge>

                        {targetSectorName && (
                          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs gap-1">
                            <Building2 className="w-3 h-3" />
                            Transfere para: {targetSectorName}
                          </Badge>
                        )}

                        {trigger.totalAcionamentos !== undefined && (
                          <span className="text-[11px] text-muted-foreground">
                            ⚡ {trigger.totalAcionamentos} disparos
                          </span>
                        )}
                      </div>

                      {/* Palavras-Chave */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] text-muted-foreground font-medium">Gatilhos:</span>
                        {trigger.palavrasChave.map((kw, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-mono text-foreground border"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>

                      {/* Resposta Mensagem Preview */}
                      <div className="text-xs text-muted-foreground line-clamp-2 italic bg-muted/20 p-2 rounded border border-border/50">
                        &quot;{trigger.respostaTexto}&quot;
                      </div>
                    </div>

                    {/* Ações e Toggle Ativo */}
                    <div className="flex items-center gap-3 self-end md:self-center flex-shrink-0 pt-2 md:pt-0 border-t md:border-t-0 w-full md:w-auto justify-between md:justify-end">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={trigger.ativo}
                          onCheckedChange={() => toggleTrigger(trigger.id)}
                          aria-label="Ativar ou desativar gatilho"
                        />
                        <span className="text-xs text-muted-foreground">
                          {trigger.ativo ? 'Ativo' : 'Pausado'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => openEditModal(trigger)}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                          onClick={() => deleteTrigger(trigger.id)}
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
      </div>

      {/* ---------------- MODAL DE CRIAÇÃO E EDIÇÃO DE TRIGGER ---------------- */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Zap className="w-5 h-5 text-amber-500" />
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
                <label className="font-semibold text-foreground">Transferir Automaticamente para o Setor</label>
                <Select value={formSector} onValueChange={setFormSector}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecione o setor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">🚫 Não transferir (manter atual)</SelectItem>
                    {allAvailableSectors.map((s) => (
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
              <div className="flex items-center justify-between">
                <label className="font-semibold text-foreground">Texto da Resposta Automática</label>
                <div className="flex items-center gap-1">
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
                </div>
              </div>

              <Textarea
                rows={4}
                value={formResponse}
                onChange={(e) => setFormResponse(e.target.value)}
                placeholder="Olá {{nome}}! Que alegria receber seu contato..."
                className="text-xs leading-relaxed"
              />
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
