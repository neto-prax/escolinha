import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { driveAction } from '@/lib/googleDrive';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HardDrive, ExternalLink, Loader2, Unplug } from 'lucide-react';
import { toast } from 'sonner';

export const useGoogleDriveStatus = () => {
  const { user, profile } = useAuth();
  return useQuery({
    queryKey: ['google-drive-status', profile?.school_id, user?.id],
    enabled: !!profile?.school_id && !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      return driveAction<{ connected: boolean; email: string | null; folder_url: string | null; can_manage: boolean }>({ action: 'status' });
    },
  });
};

export const GoogleDriveSettings = () => {
  const qc = useQueryClient();
  const { data, isLoading, error: statusError, refetch } = useGoogleDriveStatus();

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
      const data = await driveAction<{ url: string }>({ action: 'auth-url', return_url });
      window.location.assign(data.url);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      await driveAction({ action: 'disconnect' });
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
      </CardHeader>
      <CardContent>
        {statusError ? <div className="space-y-2"><p className="text-sm text-destructive">{statusError.message}</p><Button variant="outline" onClick={() => refetch()}>Tentar novamente</Button></div> : isLoading ? (
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
              {data.can_manage && <Button variant="destructive" size="sm" onClick={() => { if (window.confirm('Desconectar o Drive? Os arquivos existentes serão preservados.')) disconnect.mutate(); }} disabled={disconnect.isPending}>
                <Unplug size={14} className="mr-1" /> Desconectar
              </Button>}
            </div>
          </div>
        ) : (
          <Button onClick={() => connect.mutate()} disabled={connect.isPending || !data?.can_manage}>
            {connect.isPending && <Loader2 className="mr-2 animate-spin" size={16} />}
            Conectar com Google
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
