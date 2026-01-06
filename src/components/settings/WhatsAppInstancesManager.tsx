import { useState } from 'react';
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
import { Plus, MoreHorizontal, Wifi, WifiOff, QrCode, RefreshCw, Trash2, Settings, Phone } from 'lucide-react';
import { toast } from 'sonner';
import {
  useEvolutionInstances,
  useCreateEvolutionInstance,
  useDeleteEvolutionInstance,
  useConnectInstance,
  useCheckInstanceStatus,
  useUpdateEvolutionInstance,
  EvolutionInstance,
} from '@/hooks/useEvolutionInstances';

export function WhatsAppInstancesManager() {
  const { data: instances = [], isLoading } = useEvolutionInstances();
  const createInstance = useCreateEvolutionInstance();
  const deleteInstance = useDeleteEvolutionInstance();
  const connectInstance = useConnectInstance();
  const checkStatus = useCheckInstanceStatus();
  const updateInstance = useUpdateEvolutionInstance();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<EvolutionInstance | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    instance_name: '',
    api_url: '',
    api_key: '',
  });

  const handleCreate = async () => {
    try {
      await createInstance.mutateAsync(formData);
      toast.success('Instância criada com sucesso!');
      setIsCreateOpen(false);
      setFormData({ instance_name: '', api_url: '', api_key: '' });
    } catch (error) {
      toast.error('Erro ao criar instância');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteInstance.mutateAsync(id);
      toast.success('Instância removida');
    } catch (error) {
      toast.error('Erro ao remover instância');
    }
  };

  const handleConnect = async (instance: EvolutionInstance) => {
    try {
      const result = await connectInstance.mutateAsync(instance);
      if (result.base64) {
        setQrCode(result.base64);
        setSelectedInstance(instance);
        setIsQrOpen(true);
      } else if (result.instance?.state === 'open') {
        toast.success('WhatsApp já está conectado!');
        await updateInstance.mutateAsync({
          id: instance.id,
          status: 'connected',
          connected_phone: result.instance?.wuid || null,
        });
      }
    } catch (error) {
      toast.error('Erro ao conectar. Verifique as credenciais.');
    }
  };

  const handleCheckStatus = async (instance: EvolutionInstance) => {
    try {
      const result = await checkStatus.mutateAsync(instance);
      const state = result.instance?.state || result.state;
      
      await updateInstance.mutateAsync({
        id: instance.id,
        status: state === 'open' ? 'connected' : 'disconnected',
        connected_phone: result.instance?.wuid || null,
      });

      toast.success(`Status: ${state === 'open' ? 'Conectado' : 'Desconectado'}`);
    } catch (error) {
      toast.error('Erro ao verificar status');
    }
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
              <CardDescription>Gerencie as conexões do Evolution API</CardDescription>
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
              Nenhuma instância configurada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>URL da API</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instances.map((instance) => (
                  <TableRow key={instance.id}>
                    <TableCell className="font-medium">{instance.instance_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {instance.api_url}
                    </TableCell>
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
                          <DropdownMenuItem onClick={() => handleConnect(instance)}>
                            <QrCode className="h-4 w-4 mr-2" />
                            Conectar / QR Code
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCheckStatus(instance)}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Verificar Status
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(instance.id)}
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
              Configure uma nova conexão com o Evolution API
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instance_name">Nome da Instância</Label>
              <Input
                id="instance_name"
                placeholder="Ex: Secretaria"
                value={formData.instance_name}
                onChange={(e) => setFormData({ ...formData, instance_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api_url">URL da API</Label>
              <Input
                id="api_url"
                placeholder="https://evolution.example.com"
                value={formData.api_url}
                onChange={(e) => setFormData({ ...formData, api_url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="api_key">API Key</Label>
              <Input
                id="api_key"
                type="password"
                placeholder="Sua chave de API"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createInstance.isPending}>
              {createInstance.isPending ? 'Criando...' : 'Criar Instância'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={isQrOpen} onOpenChange={setIsQrOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escaneie o QR Code</DialogTitle>
            <DialogDescription>
              Use o WhatsApp no celular para escanear este código
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-center py-4">
            {qrCode ? (
              <img
                src={`data:image/png;base64,${qrCode}`}
                alt="QR Code"
                className="w-64 h-64 rounded-lg"
              />
            ) : (
              <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQrOpen(false)}>
              Fechar
            </Button>
            <Button
              onClick={() => selectedInstance && handleCheckStatus(selectedInstance)}
              disabled={checkStatus.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Verificar Conexão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
