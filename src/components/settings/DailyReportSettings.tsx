import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Send, Trash2, Loader2, MessageCircle, Eye, Bot } from 'lucide-react';

export function DailyReportSettings() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const schoolId = profile?.school_id;

  const [recipients, setRecipients] = useState<string[]>([]);
  const [newPhone, setNewPhone] = useState('');
  const [sendHour, setSendHour] = useState('18');
  const [isActive, setIsActive] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['daily-report-settings', schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_report_settings')
        .select('*')
        .eq('school_id', schoolId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!schoolId,
  });

  useEffect(() => {
    if (settings) {
      setRecipients(settings.recipients ?? []);
      setSendHour(String(settings.send_hour ?? 18));
      setIsActive(settings.is_active ?? false);
    }
  }, [settings]);

  const addPhone = () => {
    const digits = newPhone.replace(/\D/g, '');
    if (digits.length < 10) {
      toast.error('Informe um número válido com DDD');
      return;
    }
    const normalized = digits.startsWith('55') ? digits : `55${digits}`;
    if (recipients.includes(normalized)) {
      toast.error('Número já adicionado');
      return;
    }
    setRecipients([...recipients, normalized]);
    setNewPhone('');
  };

  const handleSave = async () => {
    if (!schoolId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('daily_report_settings')
        .upsert(
          {
            school_id: schoolId,
            recipients,
            send_hour: Number(sendHour),
            is_active: isActive,
          },
          { onConflict: 'school_id' }
        );
      if (error) throw error;
      toast.success('Configurações salvas');
      queryClient.invalidateQueries({ queryKey: ['daily-report-settings', schoolId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleSendNow = async () => {
    if (recipients.length === 0) {
      toast.error('Adicione ao menos um número antes de enviar');
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('daily-financial-report', {
        body: { action: 'send-now', recipients },
      });
      if (error) throw new Error(data?.error ?? error.message);
      if (data?.error) throw new Error(data.error);
      const results: Array<{ ok: boolean; error?: string }> = data?.results ?? [];
      const ok = results.filter((r) => r.ok).length;
      if (ok === 0) {
        throw new Error(results[0]?.error ?? 'Nenhuma mensagem foi enviada');
      }
      toast.success(`Relatório enviado para ${ok} número(s)`);
      queryClient.invalidateQueries({ queryKey: ['daily-report-settings', schoolId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao enviar relatório');
    } finally {
      setSending(false);
    }
  };

  const formatPhone = (p: string) => {
    const n = p.replace(/^55/, '');
    return n.length === 11
      ? `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
      : `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  };

  const handlePreview = async () => {
    setLoadingPreview(true);
    try {
      const { data, error } = await supabase.functions.invoke('daily-financial-report', {
        body: { action: 'preview' },
      });
      if (error) throw new Error(data?.error ?? error.message);
      if (data?.error) throw new Error(data.error);
      setPreviewMessage(data?.message || 'Erro ao gerar visualização.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao gerar visualização');
    } finally {
      setLoadingPreview(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <Card>
        <CardHeader>
          <CardTitle>Relatório diário por WhatsApp</CardTitle>
          <CardDescription>
            Envia automaticamente um resumo financeiro do dia (recebido, vencendo hoje, em atraso e
            totais do mês) para os números abaixo.
          </CardDescription>
        </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label className="text-base">Envio automático</Label>
            <p className="text-sm text-muted-foreground">
              Enviar o relatório todos os dias no horário escolhido.
            </p>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>

        <div className="space-y-2 max-w-[200px]">
          <Label>Horário do envio</Label>
          <Select value={sendHour} onValueChange={setSendHour}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 24 }, (_, i) => (
                <SelectItem key={i} value={String(i)}>
                  {String(i).padStart(2, '0')}:00
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label>Números que recebem o relatório</Label>
          <div className="flex gap-2">
            <Input
              placeholder="(71) 99999-9999"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPhone())}
            />
            <Button type="button" variant="secondary" onClick={addPhone}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {recipients.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum número adicionado.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {recipients.map((p) => (
                <Badge key={p} variant="secondary" className="gap-2 py-1.5">
                  {formatPhone(p)}
                  <button
                    type="button"
                    onClick={() => setRecipients(recipients.filter((r) => r !== p))}
                    aria-label={`Remover ${formatPhone(p)}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {settings?.last_sent_at && (
          <p className="text-sm text-muted-foreground">
            Último envio: {new Date(settings.last_sent_at).toLocaleString('pt-BR')}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSave} disabled={saving || isLoading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar configurações
          </Button>
          <Button variant="outline" onClick={handleSendNow} disabled={sending}>
            {sending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Enviar agora
          </Button>
          <Button variant="secondary" onClick={handlePreview} disabled={loadingPreview}>
            {loadingPreview ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Eye className="mr-2 h-4 w-4" />
            )}
            Atualizar Prévia
          </Button>
        </div>
      </CardContent>
    </Card>

    <Card className="border-0 shadow-none bg-transparent h-fit">
      <CardHeader className="px-0 pt-0 lg:px-6">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          Visualização Interna
        </CardTitle>
        <CardDescription>
          Como a mensagem aparecerá no WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 lg:px-6 flex justify-center">
        <div className="relative w-full max-w-[320px] border-[8px] border-gray-900 dark:border-gray-800 rounded-[2.5rem] overflow-hidden shadow-xl bg-[#E5DDD5] dark:bg-[#0b141a]">
          {/* Phone notch */}
          <div className="absolute top-0 inset-x-0 h-6 bg-gray-900 dark:bg-gray-800 rounded-b-3xl mx-16 z-10"></div>
          
          {/* WhatsApp Header */}
          <div className="bg-[#075E54] dark:bg-[#202c33] text-white p-3 pt-8 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="font-semibold text-sm truncate">Relatório Gestão Já</p>
              <p className="text-[11px] text-white/70">bot</p>
            </div>
          </div>

          {/* Chat Area */}
          <div 
            className="p-4 min-h-[450px] flex flex-col justify-end relative"
            style={{ 
              backgroundImage: `url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")`,
              backgroundSize: '300px',
              backgroundRepeat: 'repeat'
            }}
          >
            {/* Background overlay for dark mode to match standard whatsapp web dark background */}
            <div className="absolute inset-0 bg-black/40 dark:bg-[#0b141a]/80 pointer-events-none"></div>

            <div className="relative z-10 w-full flex flex-col">
              {!previewMessage ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-3 mb-auto mt-24">
                  <div className="bg-white/80 dark:bg-gray-800/80 p-4 rounded-xl shadow-sm backdrop-blur-sm">
                    <Bot className="h-10 w-10 text-[#075E54] dark:text-emerald-500 mx-auto mb-2" />
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Clique em "Atualizar Prévia"<br/>para gerar a mensagem.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-[#dcf8c6] dark:bg-[#005c4b] text-[#303030] dark:text-[#e9edef] rounded-lg p-3 text-[13px] shadow-sm ml-4 mb-2 relative self-end inline-block max-w-full">
                  <div className="absolute top-0 -right-2 w-0 h-0 border-t-[10px] border-t-[#dcf8c6] dark:border-t-[#005c4b] border-r-[10px] border-r-transparent"></div>
                  <div className="whitespace-pre-wrap leading-snug font-sans break-words">
                    {previewMessage}
                  </div>
                  <div className="text-[10px] text-right mt-1 opacity-60 flex justify-end items-center gap-1">
                    {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
  );
}
