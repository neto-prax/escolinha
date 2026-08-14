import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, QrCode, RefreshCw, Send, Power } from 'lucide-react';

interface StatusResponse {
  instance?: { name?: string; status?: string; profileName?: string; owner?: string; qrcode?: string; paircode?: string };
  status?: { connected?: boolean; jid?: string | null };
}

async function callUazapi<T>(action: string, data: Record<string, unknown> = {}) {
  const { data: result, error } = await supabase.functions.invoke('uazapi', { body: { action, data } });
  if (error) throw error;
  if ((result as { error?: string })?.error) throw new Error((result as { error: string }).error);
  return result as T;
}

export function UazapiSettings() {
  const [qr, setQr] = useState<string | null>(null);
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('Teste de integração Uazapi ✅');
  const [sending, setSending] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['uazapi-status'],
    queryFn: () => callUazapi<StatusResponse>('status'),
    refetchInterval: 15000,
  });

  const connected = data?.status?.connected ?? false;

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await callUazapi<StatusResponse>('connect');
      const code = res.instance?.qrcode ?? null;
      setQr(code);
      setPairCode(res.instance?.paircode ?? null);
      if (!code && !res.instance?.paircode) toast.info('Instância já está conectando. Atualize o status.');
      else toast.success('Escaneie o QR Code no WhatsApp');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao gerar QR Code');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await callUazapi('disconnect');
      setQr(null);
      setPairCode(null);
      toast.success('Instância desconectada');
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao desconectar');
    }
  };

  const handleSend = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      toast.error('Informe um número válido com DDD');
      return;
    }
    setSending(true);
    try {
      await callUazapi('send-text', {
        phone: digits.startsWith('55') ? digits : `55${digits}`,
        message,
      });
      toast.success('Mensagem enviada');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            WhatsApp via Uazapi
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Badge variant={connected ? 'default' : 'secondary'}>
                {connected ? 'Conectado' : 'Desconectado'}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Instância {data?.instance?.name ?? '—'}
            {data?.instance?.owner ? ` · ${data.instance.owner}` : ''} — conecte lendo o QR Code no
            WhatsApp do celular da escola.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => refetch()} disabled={isRefetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              Atualizar status
            </Button>
            {!connected && (
              <Button onClick={handleConnect} disabled={connecting}>
                {connecting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <QrCode className="mr-2 h-4 w-4" />
                )}
                Gerar QR Code
              </Button>
            )}
            {connected && (
              <Button variant="destructive" onClick={handleDisconnect}>
                <Power className="mr-2 h-4 w-4" />
                Desconectar
              </Button>
            )}
          </div>

          {qr && !connected && (
            <div className="flex flex-col items-center gap-2 rounded-lg border p-4">
              <img src={qr} alt="QR Code para conectar o WhatsApp" className="h-56 w-56" />
              <p className="text-sm text-muted-foreground">
                WhatsApp → Dispositivos conectados → Conectar dispositivo
              </p>
            </div>
          )}

          {pairCode && !connected && (
            <p className="text-sm">
              Código de pareamento: <span className="font-mono font-semibold">{pairCode}</span>
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Enviar mensagem de teste</CardTitle>
          <CardDescription>Valide a conexão enviando uma mensagem para um número.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-xs">
            <Label>Número (com DDD)</Label>
            <Input
              placeholder="(71) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Mensagem</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
          </div>
          <Button onClick={handleSend} disabled={sending || !connected}>
            {sending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Enviar teste
          </Button>
          {!connected && (
            <p className="text-sm text-muted-foreground">
              Conecte a instância antes de enviar mensagens.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
