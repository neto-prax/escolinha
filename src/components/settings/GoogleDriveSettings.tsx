import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HardDrive, ExternalLink, Loader2, Unplug } from 'lucide-react';
import { toast } from 'sonner';

export const useGoogleDriveStatus = () =>
  useQuery({
    queryKey: ['google-drive-status'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('google-drive', { body: { action: 'status' } });
      if (error) throw error;
      return data as { connected: boolean; email: string | null; folder_url: string | null };
    },
  });

export const GoogleDriveSettings = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useGoogleDriveStatus();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('drive');
    if (!result) return;
    if (result === 'connected') toast.success('Google Drive conectado com sucesso!');
    else if (result === 'cancelled') toast.info('Conexão cancelada.');
    else toast.error('Não foi possível conectar o Google Drive.');
    params.delete('drive');
    window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
    qc.invalidateQueries({ queryKey: ['google-drive-status'] });
  }, [qc]);

  const connect = useMutation({
    mutationFn: async () => {
      const return_url = `${window.location.origin}/app/configuracoes?tab=pedagogico&sub=drive`;
      const { data, error } = await supabase.functions.invoke('google-drive', { body: { action: 'auth-url', return_url } });
      if (error) throw new Error((await (error as any).context?.json?.().catch(() => null))?.error || error.message);
      window.top ? (window.top.location.href = data.url) : (window.location.href = data.url);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('google-drive', { body: { action: 'disconnect' } });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Google Drive desconectado.');
      qc.invalidateQueries({ queryKey: ['google-drive-status'] });
    },
    onError: () => toast.error('Erro ao desconectar.'),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HardDrive className="text-primary" size={20} /> Google Drive da escola
        </CardTitle>
        <CardDescription>
          Fotos e vídeos lançados na aba Registros são enviados para o Google Drive da escola, em uma pasta por turma.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="animate-spin text-muted-foreground" />
        ) : data?.connected ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <Badge>Conectado</Badge>
              <p className="text-sm text-muted-foreground">{data.email}</p>
            </div>
            <div className="flex gap-2">
              {data.folder_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={data.folder_url} target="_blank" rel="noreferrer">
                    <ExternalLink size={14} className="mr-1" /> Abrir pasta
                  </a>
                </Button>
              )}
              <Button variant="destructive" size="sm" onClick={() => disconnect.mutate()} disabled={disconnect.isPending}>
                <Unplug size={14} className="mr-1" /> Desconectar
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => connect.mutate()} disabled={connect.isPending}>
            {connect.isPending && <Loader2 className="mr-2 animate-spin" size={16} />}
            Conectar com Google
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
