import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useWhatsAppChatSettings } from '@/hooks/useWhatsAppChatSettings';
import { useWhatsAppTriggers } from '@/hooks/useWhatsAppTriggers';
import {
  MessageSquare,
  Clock,
  CheckCircle2,
  Users,
  Bot,
  UserCheck,
  Ban,
  PenTool,
  RotateCcw,
  Sparkles,
  Power
} from 'lucide-react';
import { WhatsAppChatSettings } from '@/types/mensagens';

export function WhatsAppChatSettingsCard() {
  const { settings, updateSettings, setAllModules, resetSettings } = useWhatsAppChatSettings();
  const { triggers } = useWhatsAppTriggers();

  const [tempoMinutos, setTempoMinutos] = useState<number>(settings.tempoEsperaAvaliacaoMinutos || 60);

  const activeModulesCount = [
    settings.naoVisualizarTicketsOutrosUsuarios,
    settings.naoVisualizarTicketsChatBot,
    settings.forcarAtendimentoViaResponsaveis,
    settings.ignorarMensagensGrupo,
    settings.habilitarAssinatura,
  ].filter(Boolean).length;

  const handleToggle = (key: keyof WhatsAppChatSettings, value: boolean) => {
    updateSettings({ [key]: value });
    if (value) {
      toast.success('Módulo ativado!', { description: 'A regra está ativa no atendimento de conversas.' });
    } else {
      toast.info('Módulo desativado.', { description: 'A regra foi suspensa.' });
    }
  };

  const handleSelectFluxo = (val: string) => {
    const target = val === 'none' ? null : val;
    updateSettings({ fluxoPadraoBotId: target });
    toast.success('Fluxo padrão do bot atualizado!');
  };

  const handleSaveTempo = () => {
    updateSettings({ tempoEsperaAvaliacaoMinutos: tempoMinutos });
    toast.success('Tempo de espera da avaliação atualizado para ' + tempoMinutos + ' minutos!');
  };

  const handleActivateAll = () => {
    setAllModules(true);
    toast.success('Todos os módulos de atendimento foram ativados com sucesso! 🚀');
  };

  const handleDeactivateAll = () => {
    setAllModules(false);
    toast.info('Todos os módulos foram desativados.');
  };

  const handleReset = () => {
    resetSettings();
    setTempoMinutos(60);
    toast.info('Configurações restauradas para os padrões.');
  };

  return (
    <div className="space-y-6">
      {/* ---------------- 1. MÓDULO ATENDIMENTO ---------------- */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-xs">
        <CardHeader className="pb-4 border-b bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Módulo Atendimento
                  </CardTitle>
                  <Badge
                    variant={activeModulesCount > 0 ? 'default' : 'secondary'}
                    className={
                      activeModulesCount > 0
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] h-5 px-1.5'
                        : 'text-slate-500 text-[10px] h-5 px-1.5'
                    }
                  >
                    {activeModulesCount > 0 ? `${activeModulesCount}/5 Regras Ativas` : 'Todos Desativados'}
                  </Badge>
                </div>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Regras de roteamento, visibilidade de tickets para a equipe e comportamento do autoatendimento.
                </CardDescription>
              </div>
            </div>

            {/* Ações Rápidas do Módulo */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleActivateAll}
                className="h-8 text-xs gap-1.5 border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ativar Todos</span>
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDeactivateAll}
                className="h-8 text-xs text-slate-500 hover:text-slate-800"
              >
                Desativar Todos
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="divide-y divide-slate-100 dark:divide-slate-800/80 p-0">
          {/* Item 1: Não visualizar Tickets já atribuídos à outros usuários */}
          <div
            onClick={() => handleToggle('naoVisualizarTicketsOutrosUsuarios', !settings.naoVisualizarTicketsOutrosUsuarios)}
            className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-900/30 transition-colors cursor-pointer select-none"
          >
            <div className="space-y-1 pr-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                <Label htmlFor="toggle-outros-usuarios" className="text-sm font-semibold cursor-pointer">
                  Não visualizar Tickets já atribuídos à outros usuários
                </Label>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                Se habilitado, um atendente não poderá visualizar o ticket que já está atribuído a outro atendente.
              </p>
            </div>
            <div
              className="flex items-center gap-3 pl-6 sm:pl-0 flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${
                  settings.naoVisualizarTicketsOutrosUsuarios
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                }`}
              >
                {settings.naoVisualizarTicketsOutrosUsuarios ? 'Ativado' : 'Desativado'}
              </span>
              <Switch
                id="toggle-outros-usuarios"
                checked={settings.naoVisualizarTicketsOutrosUsuarios}
                onCheckedChange={(checked) => handleToggle('naoVisualizarTicketsOutrosUsuarios', checked)}
              />
            </div>
          </div>

          {/* Item 2: Não visualizar Tickets no ChatBot */}
          <div
            onClick={() => handleToggle('naoVisualizarTicketsChatBot', !settings.naoVisualizarTicketsChatBot)}
            className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-900/30 transition-colors cursor-pointer select-none"
          >
            <div className="space-y-1 pr-2">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-slate-500" />
                <Label htmlFor="toggle-chatbot" className="text-sm font-semibold cursor-pointer">
                  Não visualizar Tickets no ChatBot
                </Label>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                Se habilitado, um atendente não poderá visualizar o ticket que está em atendimento pelo chatbot.
              </p>
            </div>
            <div
              className="flex items-center gap-3 pl-6 sm:pl-0 flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${
                  settings.naoVisualizarTicketsChatBot
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                }`}
              >
                {settings.naoVisualizarTicketsChatBot ? 'Ativado' : 'Desativado'}
              </span>
              <Switch
                id="toggle-chatbot"
                checked={settings.naoVisualizarTicketsChatBot}
                onCheckedChange={(checked) => handleToggle('naoVisualizarTicketsChatBot', checked)}
              />
            </div>
          </div>

          {/* Item 3: Forçar atendimento via Responsáveis */}
          <div
            onClick={() => handleToggle('forcarAtendimentoViaResponsaveis', !settings.forcarAtendimentoViaResponsaveis)}
            className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-900/30 transition-colors cursor-pointer select-none"
          >
            <div className="space-y-1 pr-2">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-slate-500" />
                <Label htmlFor="toggle-responsaveis" className="text-sm font-semibold cursor-pointer">
                  Forçar atendimento via Responsáveis
                </Label>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                Se habilitado, caso o contato tenha um responsável associado, o ticket será direcionado para o mesmo.
              </p>
            </div>
            <div
              className="flex items-center gap-3 pl-6 sm:pl-0 flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${
                  settings.forcarAtendimentoViaResponsaveis
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                }`}
              >
                {settings.forcarAtendimentoViaResponsaveis ? 'Ativado' : 'Desativado'}
              </span>
              <Switch
                id="toggle-responsaveis"
                checked={settings.forcarAtendimentoViaResponsaveis}
                onCheckedChange={(checked) => handleToggle('forcarAtendimentoViaResponsaveis', checked)}
              />
            </div>
          </div>

          {/* Item 4: Fluxo padrão para o Bot de atendimento */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-900/30 transition-colors">
            <div className="space-y-1 pr-2 max-w-xl">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-slate-500" />
                <Label htmlFor="select-fluxo-padrao" className="text-sm font-semibold">
                  Fluxo padrão para o Bot de atendimento
                </Label>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                Define qual fluxo de chatbot será acionado como padrão para a conexão do WhatsApp.
              </p>
            </div>
            <div className="w-full sm:w-72 pl-6 sm:pl-0 flex-shrink-0">
              <Select
                value={settings.fluxoPadraoBotId || 'none'}
                onValueChange={handleSelectFluxo}
              >
                <SelectTrigger id="select-fluxo-padrao" className="w-full text-xs h-9 bg-background">
                  <SelectValue placeholder="Selecione um fluxo padrão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs">
                    Sem fluxo configurado
                  </SelectItem>
                  {triggers.map((trigger) => (
                    <SelectItem key={trigger.id} value={trigger.id} className="text-xs">
                      {trigger.nome} {!trigger.ativo && '(Inativo)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Item 5: Ignorar Mensagens de Grupo */}
          <div
            onClick={() => handleToggle('ignorarMensagensGrupo', !settings.ignorarMensagensGrupo)}
            className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-900/30 transition-colors cursor-pointer select-none"
          >
            <div className="space-y-1 pr-2">
              <div className="flex items-center gap-2">
                <Ban className="w-4 h-4 text-slate-500" />
                <Label htmlFor="toggle-grupos" className="text-sm font-semibold cursor-pointer">
                  Ignorar Mensagens de Grupo
                </Label>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                Se habilitado, mensagens de grupos não abrirão novos tickets nem serão processadas na visualização de atendimento.
              </p>
            </div>
            <div
              className="flex items-center gap-3 pl-6 sm:pl-0 flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${
                  settings.ignorarMensagensGrupo
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                }`}
              >
                {settings.ignorarMensagensGrupo ? 'Ativado' : 'Desativado'}
              </span>
              <Switch
                id="toggle-grupos"
                checked={settings.ignorarMensagensGrupo}
                onCheckedChange={(checked) => handleToggle('ignorarMensagensGrupo', checked)}
              />
            </div>
          </div>

          {/* Item 6: Assinatura */}
          <div
            onClick={() => handleToggle('habilitarAssinatura', !settings.habilitarAssinatura)}
            className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-900/30 transition-colors cursor-pointer select-none"
          >
            <div className="space-y-1 pr-2">
              <div className="flex items-center gap-2">
                <PenTool className="w-4 h-4 text-slate-500" />
                <Label htmlFor="toggle-assinatura" className="text-sm font-semibold cursor-pointer">
                  Assinatura
                </Label>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                Se habilitado, ao enviar uma mensagem será adicionada a assinatura com o nome do atendente logado no final da mensagem.
              </p>
            </div>
            <div
              className="flex items-center gap-3 pl-6 sm:pl-0 flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${
                  settings.habilitarAssinatura
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                }`}
              >
                {settings.habilitarAssinatura ? 'Ativado' : 'Desativado'}
              </span>
              <Switch
                id="toggle-assinatura"
                checked={settings.habilitarAssinatura}
                onCheckedChange={(checked) => handleToggle('habilitarAssinatura', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ---------------- 2. MÓDULO AVALIAÇÃO ---------------- */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-xs">
        <CardHeader className="pb-4 border-b bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100">
                Módulo Avaliação
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Critérios de timeout para encerramento de tickets e pesquisa de satisfação do cliente.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 pr-2 max-w-xl">
              <Label htmlFor="input-tempo-espera" className="text-sm font-semibold">
                Tempo de espera da avaliação
              </Label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tempo em minutos que o sistema aguarda a resposta do cliente após enviar o fluxo de avaliação. Após esse tempo, o ticket é fechado automaticamente.
              </p>
            </div>

            <div className="flex items-center gap-2 pl-0 flex-shrink-0 w-full sm:w-56">
              <Input
                id="input-tempo-espera"
                type="number"
                min={1}
                max={1440}
                value={tempoMinutos}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setTempoMinutos(isNaN(val) ? 60 : Math.max(1, val));
                }}
                onBlur={handleSaveTempo}
                className="text-right text-sm font-semibold h-9 bg-background"
              />
              <span className="text-xs text-muted-foreground font-medium">minutos</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSaveTempo}
                className="h-9 text-xs px-3"
              >
                Salvar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ---------------- BARRA DE ESTADO / RESTAURAÇÃO ---------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-500/20 w-fit">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Todas as alterações são salvas e sincronizadas automaticamente no sistema.</span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="gap-2 text-xs text-slate-600 hover:text-slate-900 border-slate-300 w-fit"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restaurar Padrões
        </Button>
      </div>
    </div>
  );
}
