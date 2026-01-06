import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Wifi, WifiOff, QrCode, RefreshCw, Trash2, Phone, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  useEvolutionInstances,
  useDeleteEvolutionInstance,
  useUpdateEvolutionInstance,
  EvolutionInstance,
} from '@/hooks/useEvolutionInstances';
import { useQueryClient } from '@tanstack/react-query';

export function WhatsAppInstancesManager() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { data: instances = [], isLoading } = useEvolutionInstances();
  const deleteInstanceDb = useDeleteEvolutionInstance();
  const updateInstance = useUpdateEvolutionInstance();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<EvolutionInstance | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [instanceName, setInstanceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const handleCreate = async () => {
    if (!instanceName.trim()) {
      toast.error('Digite um nome para a instância');
      return;
    }

    if (!profile?.school_id) {
      toast.error('Usuário não vinculado a uma escola');
      return;
    }

    setIsCreating(true);
    try {
      // 1. Create instance in Evolution API
      const { data: evolutionResult, error: evolutionError } = await supabase.functions.invoke('evolution-api', {
        body: {
          action: 'create-instance',
          data: { instanceName: instanceName.trim() },
        },
      });

      if (evolutionError) throw evolutionError;

      // 2. Save to database
      const { data: dbInstance, error: dbError } = await supabase
        .from('evolution_instances')
        .insert({
          school_id: profile.school_id,
          instance_name: instanceName.trim(),
          status: 'disconnected',
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // 3. Show QR Code if returned
      if (evolutionResult?.qrcode?.base64) {
        setQrCode(evolutionResult.qrcode.base64);
        setSelectedInstance(dbInstance as EvolutionInstance);
        setIsCreateOpen(false);
        setIsQrOpen(true);
        startPollingStatus(dbInstance as EvolutionInstance);
      } else {
        toast.success('Instância criada! Clique em "Conectar" para gerar o QR Code.');
        setIsCreateOpen(false);
      }

      setInstanceName('');
      queryClient.invalidateQueries({ queryKey: ['evolution-instances'] });
    } catch (error: any) {
      console.error('Create instance error:', error);
      toast.error(error?.message || 'Erro ao criar instância');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (instance: EvolutionInstance) => {
    try {
      // Delete from Evolution API
      await supabase.functions.invoke('evolution-api', {
        body: {
          action: 'delete-instance',
          data: { instanceName: instance.instance_name },
        },
      });

      // Delete from database
      await deleteInstanceDb.mutateAsync(instance.id);
      toast.success('Instância removida');
    } catch (error) {
      toast.error('Erro ao remover instância');
    }
  };

  const handleConnect = async (instance: EvolutionInstance) => {
    setIsConnecting(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('evolution-api', {
        body: {
          action: 'get-qrcode',
          data: { instanceName: instance.instance_name },
        },
      });

      if (error) throw error;

      if (result?.base64 || result?.qrcode?.base64) {
        setQrCode(result.base64 || result.qrcode.base64);
        setSelectedInstance(instance);
        setIsQrOpen(true);
        startPollingStatus(instance);
      } else if (result?.instance?.state === 'open') {
        toast.success('WhatsApp já está conectado!');
        await updateInstance.mutateAsync({
          id: instance.id,
          status: 'connected',
          connected_phone: result.instance?.wuid || null,
        });
      } else {
        toast.info('Gerando QR Code...');
      }
    } catch (error: any) {
      console.error('Connect error:', error);
      toast.error('Erro ao conectar. Verifique a configuração.');
    } finally {
      setIsConnecting(false);
    }
  };

  const startPollingStatus = (instance: EvolutionInstance) => {
    // Clear existing interval
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    // Poll every 3 seconds
    const interval = setInterval(async () => {
      try {
        const { data: result } = await supabase.functions.invoke('evolution-api', {
          body: {
            action: 'get-instance-status',
            data: { instanceName: instance.instance_name },
          },
        });

        const state = result?.instance?.state || result?.state;
        
        if (state === 'open') {
          clearInterval(interval);
          setPollingInterval(null);
          setIsQrOpen(false);
          setQrCode(null);
          
          await updateInstance.mutateAsync({
            id: instance.id,
            status: 'connected',
            connected_phone: result?.instance?.wuid || null,
            qr_code: null,
          });
          
          toast.success('WhatsApp conectado com sucesso!');
          queryClient.invalidateQueries({ queryKey: ['evolution-instances'] });
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 3000);

    setPollingInterval(interval);

    // Stop polling after 2 minutes
    setTimeout(() => {
      clearInterval(interval);
      setPollingInterval(null);
    }, 120000);
  };

  const handleCheckStatus = async (instance: EvolutionInstance) => {
    setIsCheckingStatus(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('evolution-api', {
        body: {
          action: 'get-instance-status',
          data: { instanceName: instance.instance_name },
        },
      });

      if (error) throw error;

      const state = result?.instance?.state || result?.state;
      
      await updateInstance.mutateAsync({
        id: instance.id,
        status: state === 'open' ? 'connected' : 'disconnected',
        connected_phone: result?.instance?.wuid || null,
      });

      toast.success(`Status: ${state === 'open' ? 'Conectado' : 'Desconectado'}`);
    } catch (error) {
      toast.error('Erro ao verificar status');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleCloseQrDialog = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    setIsQrOpen(false);
    setQrCode(null);
    setSelectedInstance(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Instâncias WhatsApp
              </CardTitle>
              <CardDescription>Conecte números do WhatsApp para atendimento</CardDescription>
            </div>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Instância
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : instances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma instância configurada. Crie uma e escaneie o QR Code para conectar.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Telefone Conectado</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instances.map((instance) => (
                  <TableRow key={instance.id}>
                    <TableCell className="font-medium">{instance.instance_name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={instance.status === 'connected' ? 'default' : 'secondary'}
                        className={instance.status === 'connected' ? 'bg-green-500' : ''}
                      >
                        {instance.status === 'connected' ? (
                          <><Wifi className="h-3 w-3 mr-1" /> Conectado</>
                        ) : (
                          <><WifiOff className="h-3 w-3 mr-1" /> Desconectado</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {instance.connected_phone || '-'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => handleConnect(instance)}
                            disabled={isConnecting}
                          >
                            <QrCode className="h-4 w-4 mr-2" />
                            {instance.status === 'connected' ? 'Reconectar' : 'Conectar via QR Code'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleCheckStatus(instance)}
                            disabled={isCheckingStatus}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Verificar Status
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(instance)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Instance Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Instância WhatsApp</DialogTitle>
            <DialogDescription>
              Digite um nome para identificar esta conexão. Após criar, escaneie o QR Code com seu WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instance_name">Nome da Instância</Label>
              <Input
                id="instance_name"
                placeholder="Ex: Secretaria, Financeiro, Atendimento..."
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={isCreating || !instanceName.trim()}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar e Conectar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={isQrOpen} onOpenChange={handleCloseQrDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escaneie o QR Code</DialogTitle>
            <DialogDescription>
              Abra o WhatsApp no seu celular, vá em Dispositivos Vinculados e escaneie este código.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center py-4 space-y-4">
            {qrCode ? (
              <>
                <img
                  src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                  alt="QR Code"
                  className="w-64 h-64 rounded-lg border"
                />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Aguardando conexão...
                </div>
              </>
            ) : (
              <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseQrDialog}>
              Fechar
            </Button>
            {selectedInstance && (
              <Button
                onClick={() => handleConnect(selectedInstance)}
                disabled={isConnecting}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Gerar Novo QR Code
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
