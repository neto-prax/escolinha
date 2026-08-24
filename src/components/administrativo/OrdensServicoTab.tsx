import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plus, CheckCircle, Clock, Trash2, Edit, AlertCircle, Wrench } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from 'sonner';

export interface OSEtapa {
  id: string;
  descricao: string;
  dataPrevista: string;
  dataConclusaoReal?: string;
  status: 'Pendente' | 'Concluída';
  valorPagamento: number;
  statusPagamento: 'Aguardando' | 'Em Aberto' | 'Quitado';
}

export interface OrdemServico {
  id: string;
  titulo: string;
  prestador: string;
  dataInicio: string;
  dataConclusaoEstimada: string;
  observacao?: string;
  status: 'Em Andamento' | 'Concluída' | 'Cancelada';
  etapas: OSEtapa[];
}

export function OrdensServicoTab() {
  const [ordens, setOrdens] = useLocalStorage<OrdemServico[]>('escolinha_ordens_servico', []);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOsId, setEditingOsId] = useState<string | null>(null);
  
  // Form state
  const [titulo, setTitulo] = useState('');
  const [prestador, setPrestador] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataConclusaoEstimada, setDataConclusaoEstimada] = useState('');
  const [observacao, setObservacao] = useState('');
  const [etapas, setEtapas] = useState<OSEtapa[]>([]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const handleOpenForm = (os?: OrdemServico) => {
    if (os) {
      setEditingOsId(os.id);
      setTitulo(os.titulo);
      setPrestador(os.prestador);
      setDataInicio(os.dataInicio);
      setDataConclusaoEstimada(os.dataConclusaoEstimada);
      setObservacao(os.observacao || '');
      setEtapas(os.etapas || []);
    } else {
      setEditingOsId(null);
      setTitulo('');
      setPrestador('');
      setDataInicio(new Date().toISOString().split('T')[0]);
      setDataConclusaoEstimada('');
      setObservacao('');
      setEtapas([]);
    }
    setIsFormOpen(true);
  };

  const handleSaveOS = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo || !prestador || !dataInicio) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }

    const newOS: OrdemServico = {
      id: editingOsId || crypto.randomUUID(),
      titulo,
      prestador,
      dataInicio,
      dataConclusaoEstimada,
      observacao,
      status: etapas.length > 0 && etapas.every(e => e.status === 'Concluída') ? 'Concluída' : 'Em Andamento',
      etapas
    };

    if (editingOsId) {
      setOrdens(ordens.map(o => o.id === editingOsId ? newOS : o));
      toast.success('Ordem de serviço atualizada!');
    } else {
      setOrdens([...ordens, newOS]);
      toast.success('Ordem de serviço criada!');
    }
    setIsFormOpen(false);
  };

  const addEtapa = () => {
    setEtapas([...etapas, {
      id: crypto.randomUUID(),
      descricao: '',
      dataPrevista: '',
      status: 'Pendente',
      valorPagamento: 0,
      statusPagamento: 'Aguardando'
    }]);
  };

  const updateEtapa = (index: number, field: keyof OSEtapa, value: any) => {
    const newEtapas = [...etapas];
    newEtapas[index] = { ...newEtapas[index], [field]: value };
    
    // Auto-update payment status logic
    if (field === 'status' && value === 'Pendente') {
      newEtapas[index].statusPagamento = 'Aguardando';
      newEtapas[index].dataConclusaoReal = undefined;
    } else if (field === 'status' && value === 'Concluída') {
      if (newEtapas[index].statusPagamento === 'Aguardando') {
        newEtapas[index].statusPagamento = 'Em Aberto';
      }
      if (!newEtapas[index].dataConclusaoReal) {
        newEtapas[index].dataConclusaoReal = new Date().toISOString().split('T')[0];
      }
    }
    
    setEtapas(newEtapas);
  };

  const removeEtapa = (index: number) => {
    setEtapas(etapas.filter((_, i) => i !== index));
  };

  const handleToggleEtapaStatus = (osId: string, etapaId: string) => {
    setOrdens(ordens.map(os => {
      if (os.id === osId) {
        const newEtapas = os.etapas.map(et => {
          if (et.id === etapaId) {
            const isCompleted = et.status === 'Pendente';
            return {
              ...et,
              status: isCompleted ? 'Concluída' : 'Pendente',
              dataConclusaoReal: isCompleted ? new Date().toISOString().split('T')[0] : undefined,
              statusPagamento: isCompleted ? (et.statusPagamento === 'Aguardando' ? 'Em Aberto' : et.statusPagamento) : 'Aguardando'
            };
          }
          return et;
        });
        
        return {
          ...os,
          etapas: newEtapas,
          status: newEtapas.every(e => e.status === 'Concluída') ? 'Concluída' : 'Em Andamento'
        };
      }
      return os;
    }));
  };

  const handlePagamentoAction = (osId: string, etapaId: string, action: 'quitar' | 'reabrir') => {
    setOrdens(ordens.map(os => {
      if (os.id === osId) {
        return {
          ...os,
          etapas: os.etapas.map(et => {
            if (et.id === etapaId) {
              return {
                ...et,
                statusPagamento: action === 'quitar' ? 'Quitado' : 'Em Aberto'
              };
            }
            return et;
          })
        };
      }
      return os;
    }));
    toast.success(action === 'quitar' ? 'Pagamento quitado!' : 'Pagamento reaberto!');
  };

  const handleDeleteOS = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta OS?')) {
      setOrdens(ordens.filter(o => o.id !== id));
      toast.success('OS excluída.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Ordens de Serviço</CardTitle>
            <CardDescription>Gerencie serviços de colaboradores ou terceiros por etapas.</CardDescription>
          </div>
          <Button onClick={() => handleOpenForm()}>
            <Plus className="mr-2 h-4 w-4" />
            Nova OS
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {ordens.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma Ordem de Serviço cadastrada.
          </div>
        ) : (
          <div className="space-y-6">
            {ordens.map(os => (
              <div key={os.id} className="border rounded-lg overflow-hidden bg-card shadow-sm">
                <div className="bg-muted/50 p-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-primary" />
                      <h3 className="font-bold text-lg">{os.titulo}</h3>
                      <Badge variant={os.status === 'Concluída' ? 'default' : 'secondary'} className={os.status === 'Concluída' ? 'bg-green-500 hover:bg-green-600' : ''}>
                        {os.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Prestador: <span className="font-medium text-foreground">{os.prestador}</span> | 
                      Início: {formatDate(os.dataInicio)} | 
                      Previsão: {formatDate(os.dataConclusaoEstimada)}
                    </div>
                    {os.observacao && (
                      <div className="text-sm text-muted-foreground mt-2 bg-muted/30 p-2 rounded border border-dashed">
                        <strong>Observação:</strong> {os.observacao}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenForm(os)}>
                      <Edit className="h-4 w-4 mr-1" /> Editar
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteOS(os.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="p-4">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    Etapas e Pagamentos ({os.etapas.filter(e => e.status === 'Concluída').length}/{os.etapas.length})
                  </h4>
                  {os.etapas.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Etapa</TableHead>
                          <TableHead>Previsto para</TableHead>
                          <TableHead>Status Etapa</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Pagamento</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {os.etapas.map(etapa => (
                          <TableRow key={etapa.id} className={etapa.status === 'Concluída' ? 'bg-muted/30' : ''}>
                            <TableCell className="font-medium">{etapa.descricao}</TableCell>
                            <TableCell>{formatDate(etapa.dataPrevista)}</TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className={`cursor-pointer hover:bg-muted transition-colors ${etapa.status === 'Concluída' ? 'text-green-600 border-green-200 bg-green-50' : 'text-amber-600 border-amber-200 bg-amber-50'}`}
                                onClick={() => handleToggleEtapaStatus(os.id, etapa.id)}
                              >
                                {etapa.status === 'Concluída' ? <CheckCircle className="mr-1 h-3 w-3" /> : <Clock className="mr-1 h-3 w-3" />}
                                {etapa.status}
                              </Badge>
                              {etapa.dataConclusaoReal && (
                                <div className="text-[10px] text-muted-foreground mt-1">Concluído em: {formatDate(etapa.dataConclusaoReal)}</div>
                              )}
                            </TableCell>
                            <TableCell>{formatCurrency(etapa.valorPagamento)}</TableCell>
                            <TableCell>
                              {etapa.statusPagamento === 'Aguardando' && <Badge variant="secondary" className="bg-slate-100 text-slate-500">Bloqueado</Badge>}
                              {etapa.statusPagamento === 'Em Aberto' && <Badge variant="default" className="bg-blue-500">Em Aberto</Badge>}
                              {etapa.statusPagamento === 'Quitado' && <Badge variant="default" className="bg-green-500">Quitado</Badge>}
                            </TableCell>
                            <TableCell className="text-right">
                              {etapa.statusPagamento === 'Em Aberto' && (
                                <Button size="sm" className="bg-green-600 hover:bg-green-700 h-7 text-xs" onClick={() => handlePagamentoAction(os.id, etapa.id, 'quitar')}>
                                  Já Quitar
                                </Button>
                              )}
                              {etapa.statusPagamento === 'Quitado' && (
                                <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={() => handlePagamentoAction(os.id, etapa.id, 'reabrir')}>
                                  Reabrir pgto
                                </Button>
                              )}
                              {etapa.statusPagamento === 'Aguardando' && (
                                <span className="text-xs text-muted-foreground italic flex items-center justify-end gap-1">
                                  <AlertCircle className="h-3 w-3" /> Conclua a etapa
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">Nenhuma etapa definida para esta OS.</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOsId ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}</DialogTitle>
            <DialogDescription>Cadastre os dados gerais e as etapas financeiras atreladas à conclusão.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveOS} className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Título da OS *</label>
                <Input required value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Reforma da quadra, Consultoria XYZ" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Prestador (Colaborador/Empresa) *</label>
                <Input required value={prestador} onChange={e => setPrestador(e.target.value)} placeholder="Nome do responsável" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Data de Início *</label>
                <Input type="date" required value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Previsão de Conclusão Final</label>
                <Input type="date" value={dataConclusaoEstimada} onChange={e => setDataConclusaoEstimada(e.target.value)} />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Observação</label>
              <Input value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Detalhes adicionais sobre a ordem de serviço..." />
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Etapas e Marcos de Pagamento</h3>
                <Button type="button" variant="outline" size="sm" onClick={addEtapa}>
                  <Plus className="mr-2 h-4 w-4" /> Adicionar Etapa
                </Button>
              </div>
              
              <div className="space-y-4">
                {etapas.map((etapa, index) => (
                  <div key={etapa.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 border rounded-md bg-muted/20 items-end">
                    <div className="md:col-span-4 space-y-1">
                      <label className="text-xs font-medium">Descrição da Etapa</label>
                      <Input required value={etapa.descricao} onChange={e => updateEtapa(index, 'descricao', e.target.value)} placeholder="Ex: Compra de materiais" className="h-8 text-sm" />
                    </div>
                    <div className="md:col-span-3 space-y-1">
                      <label className="text-xs font-medium">Data Prevista</label>
                      <Input type="date" required value={etapa.dataPrevista} onChange={e => updateEtapa(index, 'dataPrevista', e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="md:col-span-3 space-y-1">
                      <label className="text-xs font-medium">Valor do Pgto (R$)</label>
                      <Input type="number" step="0.01" min="0" required value={etapa.valorPagamento} onChange={e => updateEtapa(index, 'valorPagamento', parseFloat(e.target.value) || 0)} className="h-8 text-sm" />
                    </div>
                    <div className="md:col-span-1 flex items-center justify-center">
                       <Badge variant="outline" className="text-[10px] w-full justify-center">
                         {etapa.status}
                       </Badge>
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                      <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => removeEtapa(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {etapas.length === 0 && (
                  <div className="text-sm text-center text-muted-foreground p-4 bg-muted/30 rounded-md border border-dashed">
                    Nenhuma etapa cadastrada. Adicione etapas para criar os marcos de pagamento desta OS.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
              <Button type="submit">Salvar Ordem de Serviço</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
