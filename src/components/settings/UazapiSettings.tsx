import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, QrCode, RefreshCw, Send, Power, Webhook, Server, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

interface StatusResponse {
  instance?: {
    name?: string;
    status?: string;
    profileName?: string;
    owner?: string;
    qrcode?: string;
    paircode?: string;
  };
  status?: { connected?: boolean; jid?: string | null };
}

async function callGateway<T>(functionName: 'wa-akg' | 'uazapi', action: string, data: Record<string, unknown> = {}) {
  const { data: result, error } = await supabase.functions.invoke(functionName, { body: { action, data } });
  if (error) throw error;
  if ((result as { error?: string })?.error) throw new Error((result as { error: string }).error);
  return result as T;
}

export function UazapiSettings() {
  const [activeProvider, setActiveProvider] = useState<'wa-akg' | 'uazapi'>('wa-akg');

  // WA-AKG Config State
  const [akgUrl, setAkgUrl] = useState('http://localhost:3000');
  const [akgApiKey, setAkgApiKey] = useState('');
  const [akgSessionId, setAkgSessionId] = useState('interagir');

  // Connection & Testing State
  const [qr, setQr] = useState<string | null>(null);
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('Teste de integração WhatsApp ✅');
  const [sending, setSending] = useState(false);
  const [configuringWebhook, setConfiguringWebhook] = useState(false);

  // Load saved credentials from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedProvider = (localStorage.getItem('whatsapp_gateway_active_provider') as 'wa-akg' | 'uazapi') || 'wa-akg';
      setActiveProvider(savedProvider);

      const savedUrl = localStorage.getItem('wa_akg_url');
      if (savedUrl) setAkgUrl(savedUrl);

      const savedApiKey = localStorage.getItem('wa_akg_api_key');
      if (savedApiKey) setAkgApiKey(savedApiKey);

      const savedSession = localStorage.getItem('wa_akg_session_id');
      if (savedSession) setAkgSessionId(savedSession);
    }
  }, []);

  const handleProviderChange = (provider: 'wa-akg' | 'uazapi') => {
    setActiveProvider(provider);
    if (typeof window !== 'undefined') {
      localStorage.setItem('whatsapp_gateway_active_provider', provider);
    }
    setQr(null);
    setPairCode(null);
    toast.info(`Provedor ativo alterado para ${provider === 'wa-akg' ? 'WA-AKG' : 'Uazapi'}`);
  };

  const handleSaveAkgConfig = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('wa_akg_url', akgUrl.trim());
      localStorage.setItem('wa_akg_api_key', akgApiKey.trim());
      localStorage.setItem('wa_akg_session_id', akgSessionId.trim());
    }
    toast.success('Configurações do WA-AKG salvas');
    refetch();
  };

  // Status Query based on active provider
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['whatsapp-gateway-admin-status', activeProvider, akgUrl, akgSessionId],
    queryFn: () => {
      if (activeProvider === 'wa-akg') {
        return callGateway<StatusResponse>('wa-akg', 'status', {
          waAkgUrl: akgUrl.trim(),
          waAkgApiKey: akgApiKey.trim(),
          sessionId: akgSessionId.trim(),
        });
      }
      return callGateway<StatusResponse>('uazapi', 'status');
    },
    staleTime: Infinity,
    retry: 1,
  });

  const connected = data?.status?.connected ?? false;

  const handleConnect = async () => {
    setConnecting(true);
    try {
      if (activeProvider === 'wa-akg') {
        const res = await callGateway<StatusResponse>('wa-akg', 'connect', {
          waAkgUrl: akgUrl.trim(),
          waAkgApiKey: akgApiKey.trim(),
          sessionId: akgSessionId.trim(),
        });
        const code = res.instance?.qrcode ?? null;
        setQr(code);
        setPairCode(res.instance?.paircode ?? null);
        if (!code && !res.instance?.paircode) {
          toast.info('Sessão iniciando no WA-AKG. Verifique o status.');
        } else {
          toast.success('Escaneie o QR Code no seu WhatsApp');
        }
      } else {
        const res = await callGateway<StatusResponse>('uazapi', 'connect');
        const code = res.instance?.qrcode ?? null;
        setQr(code);
        setPairCode(res.instance?.paircode ?? null);
        if (!code && !res.instance?.paircode) {
          toast.info('Instância já está conectando. Atualize o status.');
        } else {
          toast.success('Escaneie o QR Code no WhatsApp');
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao gerar QR Code');
    } finally {
      setConnecting(false);
    }
  };

  const handleConfigureWebhook = async () => {
    setConfiguringWebhook(true);
    try {
      if (activeProvider === 'wa-akg') {
        await callGateway('wa-akg', 'configure-webhook', {
          waAkgUrl: akgUrl.trim(),
          waAkgApiKey: akgApiKey.trim(),
          sessionId: akgSessionId.trim(),
        });
      } else {
        await callGateway('uazapi', 'configure-webhook');
      }
      toast.success('Webhook de recebimento configurado com sucesso');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao configurar webhook');
    } finally {
      setConfiguringWebhook(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      if (activeProvider === 'wa-akg') {
        await callGateway('wa-akg', 'disconnect', {
          waAkgUrl: akgUrl.trim(),
          waAkgApiKey: akgApiKey.trim(),
          sessionId: akgSessionId.trim(),
        });
      } else {
        await callGateway('uazapi', 'disconnect');
      }
      setQr(null);
      setPairCode(null);
      toast.success('Instância desconectada com sucesso');
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
      const formattedNumber = digits.startsWith('55') ? digits : `55${digits}`;
      if (activeProvider === 'wa-akg') {
        await callGateway('wa-akg', 'send-text', {
          waAkgUrl: akgUrl.trim(),
          waAkgApiKey: akgApiKey.trim(),
          sessionId: akgSessionId.trim(),
          phone: formattedNumber,
          message,
        });
      } else {
        await callGateway('uazapi', 'send-text', {
          phone: formattedNumber,
          message,
        });
      }
      toast.success('Mensagem de teste enviada!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Seletor de Provedor */}
      <Card className="border-purple-200 dark:border-purple-900 bg-purple-50/30 dark:bg-purple-950/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <CardTitle className="text-base font-semibold">Provedor de Gateway WhatsApp</CardTitle>
            </div>
            <Badge variant="outline" className="border-purple-300 text-purple-700 dark:text-purple-300">
              {activeProvider === 'wa-akg' ? 'WA-AKG Ativo' : 'Uazapi Ativa'}
            </Badge>
          </div>
          <CardDescription>
            Escolha o gateway que processará as conexões, disparos e recebimento de mensagens da escola.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeProvider}
            onValueChange={(val) => handleProviderChange(val as 'wa-akg' | 'uazapi')}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="wa-akg" className="font-semibold">
                🚀 WA-AKG (Self-Hosted)
              </TabsTrigger>
              <TabsTrigger value="uazapi">
                ⚡ Uazapi
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Configurações Específicas do WA-AKG */}
      {activeProvider === 'wa-akg' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Parâmetros de Conexão do WA-AKG
            </CardTitle>
            <CardDescription>
              Aponte para o seu servidor WA-AKG em execução (Next.js 15 + Baileys).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="akgUrl">URL do Servidor WA-AKG</Label>
                <Input
                  id="akgUrl"
                  placeholder="http://localhost:3000 ou https://wa.seudominio.com"
                  value={akgUrl}
                  onChange={(e) => setAkgUrl(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">Endereço da API REST do WA-AKG.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="akgSessionId">ID da Sessão (Session ID)</Label>
                <Input
                  id="akgSessionId"
                  placeholder="interagir"
                  value={akgSessionId}
                  onChange={(e) => setAkgSessionId(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">Identificador único do número/instância.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="akgApiKey">Chave de API / Token (Opcional)</Label>
                <Input
                  id="akgApiKey"
                  type="password"
                  placeholder="Deixe em branco se não configurado"
                  value={akgApiKey}
                  onChange={(e) => setAkgApiKey(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">Bearer token caso configurado no .env do WA-AKG.</p>
              </div>
            </div>

            <Button onClick={handleSaveAkgConfig} className="bg-purple-600 hover:bg-purple-700 text-white">
              Salvar Parâmetros do WA-AKG
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Status da Instância & Painel de Conexão */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            WhatsApp Conexão: {activeProvider === 'wa-akg' ? 'WA-AKG' : 'Uazapi'}
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Badge variant={connected ? 'default' : 'secondary'} className={connected ? 'bg-emerald-600' : ''}>
                {connected ? (
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3" /> Conectado
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="h-3 w-3" /> Desconectado
                  </span>
                )}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {activeProvider === 'wa-akg' ? (
              <>Sessão <strong>{akgSessionId}</strong> no servidor <strong>{akgUrl}</strong>.</>
            ) : (
              <>Instância <strong>{data?.instance?.name ?? '—'}</strong> via Uazapi.</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => refetch()} disabled={isRefetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
              Atualizar status
            </Button>
            <Button variant="outline" onClick={handleConfigureWebhook} disabled={configuringWebhook}>
              {configuringWebhook ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Webhook className="mr-2 h-4 w-4 text-purple-600" />
              )}
              Configurar recebimento (Webhook)
            </Button>
            {!connected && (
              <Button onClick={handleConnect} disabled={connecting} className="bg-purple-600 hover:bg-purple-700 text-white">
                {connecting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <QrCode className="mr-2 h-4 w-4" />
                )}
                Conectar / Gerar QR Code
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
            <div className="flex flex-col items-center gap-3 rounded-xl border border-purple-200 bg-purple-50/40 dark:bg-purple-950/20 p-6 max-w-sm mx-auto shadow-sm">
              <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                Escaneie com seu WhatsApp
              </span>
              <img
                src={qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`}
                alt="QR Code WhatsApp"
                className="h-56 w-56 rounded-lg bg-white p-2 shadow-xs"
              />
              <p className="text-xs text-center text-muted-foreground">
                No celular: abra o <strong>WhatsApp</strong> → <strong>Aparelhos conectados</strong> → <strong>Conectar um aparelho</strong>
              </p>
            </div>
          )}

          {pairCode && !connected && (
            <div className="rounded-lg border p-3 bg-muted/40 max-w-sm">
              <p className="text-xs text-muted-foreground mb-1">Código de Pareamento:</p>
              <p className="font-mono font-bold text-lg text-foreground tracking-wider">{pairCode}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enviar Mensagem de Teste */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="h-4 w-4 text-purple-600" />
            Enviar Mensagem de Teste
          </CardTitle>
          <CardDescription>
            Valide a conexão enviando uma mensagem direta para um número de teste usando o gateway ativo ({activeProvider.toUpperCase()}).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="testPhone">Número de Destino (com DDD)</Label>
            <Input
              id="testPhone"
              placeholder="(75) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="testMsg">Mensagem</Label>
            <Textarea
              id="testMsg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
          <Button onClick={handleSend} disabled={sending || !connected} className="bg-purple-600 hover:bg-purple-700 text-white">
            {sending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Enviar teste via {activeProvider.toUpperCase()}
          </Button>
          {!connected && (
            <p className="text-xs text-muted-foreground">
              Conecte a instância antes de enviar mensagens de teste.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
