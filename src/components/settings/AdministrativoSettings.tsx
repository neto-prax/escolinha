import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Users, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { supabase } from '@/integrations/supabase/client';
import { TurmaConfig, Lancamento } from '@/types/finance';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/utils';
export function AdministrativoSettings() {
  const { profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // States moved from Administrativo.tsx
  const [employees] = useLocalStorage<any[]>('escolinha_employees_v2', []);
  const [alunos, setAlunos] = useLocalStorage<any[]>('escolinha_alunos', []);
  const [lancamentosStorage] = useLocalStorage<Lancamento[]>('escolinha_lancamentos', []);
  
  const defaultTurmas: TurmaConfig[] = [
    { setor: 'Educação Infantil', nome: 'Maternal', letras: ['A', 'B'] },
    { setor: 'Ensino Fundamental 1', nome: '1º Ano', letras: ['A', 'B'] },
    { setor: 'Ensino Fundamental 2', nome: '6º Ano', letras: ['A'] },
    { setor: 'Ensino Médio', nome: '1º Ano EM', letras: [] }
  ];
  
  const [turmas, setTurmas] = useLocalStorage<TurmaConfig[]>('escolinha_turmas_v3', defaultTurmas);
  
  const [novaTurma, setNovaTurma] = useState('');
  const [novoValorPadrao, setNovoValorPadrao] = useState('');
  const [selectedLetters, setSelectedLetters] = useState<string[]>([]);
  const [editingTurmaId, setEditingTurmaId] = useState<string | null>(null);
  const [selectedSetor, setSelectedSetor] = useState('Educação Infantil');
  const [sortAlphabetically, setSortAlphabetically] = useState(false);

  const [isRelatoriosOpen, setIsRelatoriosOpen] = useState(false);
  const [isCargosOpen, setIsCargosOpen] = useState(false);
  
  const defaultMensagem = `*Relatório Administrativo Diário*
Data: {{data}}

👥 *Quadro de Funcionários*
Total: {{total_funcionarios}}
Ativos: {{ativos}}

⚠️ *Ocorrências Hoje*: {{ocorrencias}}

{{caixa}}

_Acesse o painel para mais detalhes: {{link_caixa}}_`;

  const [mensagemRelatorio, setMensagemRelatorio] = useLocalStorage<string>('escolinha_admin_relatorio_template', defaultMensagem);
  const [responsaveisRelatorio, setResponsaveisRelatorio] = useLocalStorage<{nome: string, telefone: string}[]>('escolinha_admin_responsaveis', []);
  const [novoResponsavel, setNovoResponsavel] = useState({ nome: '', telefone: '' });

  const setoresOpcoes = [
    'Educação Infantil',
    'Ensino Fundamental 1',
    'Ensino Fundamental 2',
    'Ensino Médio',
    'Administrativo',
    'Apoio'
  ];

  const handleAddTurma = () => {
    if (!novaTurma.trim()) return;
    const baseName = novaTurma.trim();
    let novasTurmas = [...turmas];
    const index = novasTurmas.findIndex(t => t.nome === baseName && t.setor === selectedSetor);
    
    if (index !== -1) {
      const existingLetters = [...novasTurmas[index].letras];
      selectedLetters.forEach(l => {
        if (!existingLetters.includes(l)) existingLetters.push(l);
      });
      novasTurmas[index].letras = existingLetters.sort();
      novasTurmas[index].valorPadrao = novoValorPadrao ? parseFloat(novoValorPadrao) : undefined;
    } else {
      novasTurmas.push({ setor: selectedSetor, nome: baseName, letras: [...selectedLetters].sort(), valorPadrao: novoValorPadrao ? parseFloat(novoValorPadrao) : undefined });
    }
    
    setTurmas(novasTurmas);
    setNovaTurma('');
    setNovoValorPadrao('');
    setSelectedLetters([]);
  };

  const getLocalFinancialData = () => {
    const today = new Date().toISOString().split('T')[0];
    const month = today.substring(0, 7);
    const dia = (l: Lancamento) => new Date(l.data).toISOString().split('T')[0];

    const receivedToday = lancamentosStorage.filter(l => dia(l) === today && l.tipo === 'Entrada' && l.status === 'Pago').reduce((acc, curr) => acc + curr.valor, 0);
    const spentToday = lancamentosStorage.filter(l => dia(l) === today && l.tipo === 'Saída' && l.status === 'Pago').reduce((acc, curr) => acc + curr.valor, 0);
    const dueToday = lancamentosStorage.filter(l => dia(l) === today && l.status === 'Em Aberto');
    const overdue = lancamentosStorage.filter(l => dia(l) < today && l.status === 'Em Aberto');
    const receivedMonth = lancamentosStorage.filter(l => dia(l).startsWith(month) && l.tipo === 'Entrada' && l.status === 'Pago').reduce((acc, curr) => acc + curr.valor, 0);
    const openMonth = lancamentosStorage.filter(l => dia(l).startsWith(month) && l.tipo === 'Entrada' && l.status === 'Em Aberto').reduce((acc, curr) => acc + curr.valor, 0);

    return {
      schoolName: profile?.full_name || 'Sua Escola',
      label: 'Caixa Local',
      receivedToday,
      spentToday,
      dueToday: { sum: dueToday.reduce((a,c) => a + c.valor, 0), count: dueToday.length },
      overdue: { sum: overdue.reduce((a,c) => a + c.valor, 0), count: overdue.length },
      receivedMonth,
      openMonth
    };
  };

  const handleSendRelatorio = async () => {
    if (responsaveisRelatorio.length === 0) {
      toast.error('Adicione pelo menos um responsável em Configurar antes de enviar.');
      return;
    }

    const activeEmployees = employees.filter(e => e.status === 'active').length;
    const totalEmployees = employees.length;
    const ocorrenciasHoje = employees.flatMap(e => e.ocorrencias || []).filter(o => o.data === new Date().toISOString().split('T')[0]).length;
    
    const dataFormatada = formatDate(new Date());
    const formatMoney = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    
    const financialData = getLocalFinancialData();
    const formattedCaixa = financialData ? `📊 Relatório Financeiro — ${dataFormatada}
${financialData.schoolName} | ${financialData.label}
✅ Recebido hoje: ${formatMoney(financialData.receivedToday || 0)}
🔻 Gastos hoje: ${formatMoney(financialData.spentToday || 0)}
📅 Vencendo hoje: ${formatMoney(financialData.dueToday?.sum || 0)} (${financialData.dueToday?.count || 0} cobranças)
⚠️ Em atraso: ${formatMoney(financialData.overdue?.sum || 0)} (${financialData.overdue?.count || 0} cobranças)
📈 Recebido no mês: ${formatMoney(financialData.receivedMonth || 0)}
🕓 A receber ainda no mês: ${formatMoney(financialData.openMonth || 0)}` : `📊 Relatório Financeiro — ${dataFormatada}
Nenhum lançamento financeiro cadastrado.`;

    const baseUrl = window.location.origin;
    const linkCaixa = `${baseUrl}/app/financeiro`;

    let finalMessage = mensagemRelatorio
      .replace(/{{data}}/g, formatDate(new Date()))
      .replace(/{{total_funcionarios}}/g, String(totalEmployees))
      .replace(/{{ativos}}/g, String(activeEmployees))
      .replace(/{{ocorrencias}}/g, String(ocorrenciasHoje))
      .replace(/{{caixa}}/g, formattedCaixa)
      .replace(/{{link_caixa}}/g, linkCaixa);

    if (!mensagemRelatorio.includes('{{')) {
      finalMessage = `*Relatório Administrativo Diário*
Data: ${formatDate(new Date())}

👥 *Quadro de Funcionários*
Total: ${totalEmployees}
Ativos: ${activeEmployees}

⚠️ *Ocorrências Hoje*: ${ocorrenciasHoje}

${formattedCaixa}

${mensagemRelatorio}`;
    } else if (!mensagemRelatorio.includes('{{caixa}}')) {
      finalMessage += `\n\n${formattedCaixa}`;
    }

    setIsLoading(true);
    
    try {
      let sentCount = 0;
      for (const resp of responsaveisRelatorio) {
        let phoneNumber = resp.telefone.replace(/\D/g, '');
        if (!phoneNumber.startsWith('55')) {
          phoneNumber = '55' + phoneNumber;
        }

        const { data, error } = await supabase.functions.invoke('uazapi-send', {
          body: {
            phone: phoneNumber,
            message: finalMessage,
            instanceName: 'Escolinha',
            connectionType: 'waba'
          },
        });

        if (error) throw error;
        sentCount++;
      }
      
      toast.success(`Relatório diário enviado com sucesso para ${sentCount} responsável(is)!`);
    } catch (error: any) {
      console.error('Error sending report:', error);
      toast.error('Ocorreu um erro ao enviar o relatório. Tentando via WhatsApp Web...');
      
      const phone = responsaveisRelatorio[0].telefone.replace(/\D/g, '');
      const encodedMsg = encodeURIComponent(finalMessage);
      window.open(`https://wa.me/55${phone}?text=${encodedMsg}`, '_blank');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddResponsavel = () => {
    if (!novoResponsavel.nome || !novoResponsavel.telefone) {
      toast.error('Preencha nome e telefone');
      return;
    }
    setResponsaveisRelatorio([...responsaveisRelatorio, novoResponsavel]);
    setNovoResponsavel({ nome: '', telefone: '' });
  };

  return (
    <>
      <Tabs defaultValue="geral">
        <TabsList className="mb-4">
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="turmas">Turmas e Classes</TabsTrigger>
        </TabsList>
        
        <TabsContent value="geral">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="card-interactive">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                  <FileText className="h-6 w-6" />
                </div>
                <CardTitle>Relatório Diário</CardTitle>
                <CardDescription>Gerenciar configurações do relatório diário</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <Button 
                    className="w-full" 
                    variant="default" 
                    onClick={handleSendRelatorio}
                    disabled={isLoading}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enviar Agora
                  </Button>
                  <Button className="w-full" variant="outline" onClick={() => setIsRelatoriosOpen(true)}>Configurar</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="card-interactive">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                  <Users className="h-6 w-6" />
                </div>
                <CardTitle>Setores</CardTitle>
                <CardDescription>Gerenciar os setores da instituição</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline" onClick={() => setIsCargosOpen(true)}>Configurar</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="turmas">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Turmas e Classes</CardTitle>
                <CardDescription>Gerencie as turmas disponíveis para marcação de lançamentos no sistema</CardDescription>
              </div>
              <Button 
                variant={sortAlphabetically ? "default" : "outline"}
                size="sm"
                onClick={() => setSortAlphabetically(!sortAlphabetically)}
                title="Ordenar de A a Z"
              >
                A-Z
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 max-w-lg">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Select value={selectedSetor} onValueChange={setSelectedSetor}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecione o setor" />
                      </SelectTrigger>
                      <SelectContent>
                        {setoresOpcoes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Nova classe... Ex: Sub-20" 
                        value={novaTurma}
                        onChange={(e) => setNovaTurma(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddTurma();
                        }}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Valor Padrão (R$)"
                        type="number"
                        min="0"
                        step="0.01"
                        value={novoValorPadrao}
                        onChange={(e) => setNovoValorPadrao(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddTurma();
                        }}
                        className="w-32"
                      />
                      <Button onClick={handleAddTurma}>Adicionar</Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-muted-foreground">Turmas associadas a esta classe (letras):</span>
                    <div className="flex flex-wrap gap-2">
                      {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'].map(letter => (
                        <label 
                          key={letter} 
                          className={`flex items-center justify-center w-8 h-8 rounded border cursor-pointer select-none transition-colors ${
                            selectedLetters.includes(letter) 
                              ? 'bg-primary text-primary-foreground border-primary' 
                              : 'bg-background hover:bg-muted'
                          }`}
                        >
                          <input 
                            type="checkbox" 
                            className="hidden" 
                            checked={selectedLetters.includes(letter)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedLetters([...selectedLetters, letter]);
                              else setSelectedLetters(selectedLetters.filter(l => l !== letter));
                            }}
                          />
                          <span className="text-sm font-medium">{letter}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-md p-4 space-y-4">
                  {setoresOpcoes.map(setor => {
                    let turmasDoSetor = turmas.filter(t => t.setor === setor);
                    if (sortAlphabetically) {
                      turmasDoSetor = [...turmasDoSetor].sort((a, b) => a.nome.localeCompare(b.nome));
                    }
                    if (turmasDoSetor.length === 0) return null;
                    
                    return (
                      <div key={setor} className="space-y-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{setor}</h4>
                        <div className="space-y-3">
                          {turmasDoSetor.map((turma, i) => {
                            const isEditing = editingTurmaId === `${setor}-${turma.nome}`;
                            return (
                            <div key={`${setor}-${turma.nome}-${i}`} className="flex flex-col gap-2 bg-muted/30 p-3 rounded border border-muted">
                              <div className="flex justify-between items-center gap-2">
                                {isEditing ? (
                                  <div className="flex items-center gap-2 flex-1">
                                    <Input 
                                      defaultValue={turma.nome}
                                      id={`edit-nome-${setor}-${turma.nome}`}
                                      className="h-8 text-sm font-bold text-primary flex-1"
                                      placeholder="Nome da Classe"
                                    />
                                    <Button 
                                      size="sm" 
                                      className="h-8 px-2"
                                      onClick={() => {
                                        const nomeInput = document.getElementById(`edit-nome-${setor}-${turma.nome}`) as HTMLInputElement;
                                        const letrasInput = document.getElementById(`edit-letras-${setor}-${turma.nome}`) as HTMLInputElement;
                                        const valorPadraoInput = document.getElementById(`edit-valor-${setor}-${turma.nome}`) as HTMLInputElement;
                                        const newName = nomeInput?.value.trim() || turma.nome;
                                        const newLetras = letrasInput?.value.split(',').map(l => l.trim()).filter(Boolean).sort() || turma.letras;
                                        const newValorPadrao = valorPadraoInput?.value ? parseFloat(valorPadraoInput.value) : undefined;
                                        
                                        setTurmas(turmas.map(t => {
                                          if (t.nome === turma.nome && t.setor === setor) {
                                            return { ...t, nome: newName, letras: newLetras, valorPadrao: newValorPadrao };
                                          }
                                          return t;
                                        }));
                                        if (newName !== turma.nome) {
                                          setAlunos(alunos.map(a => {
                                            if (a.classe === turma.nome && a.setor === setor) {
                                              return { ...a, classe: newName };
                                            }
                                            return a;
                                          }));
                                        }
                                        setEditingTurmaId(null);
                                      }}
                                    >
                                      Salvar
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground" onClick={() => setEditingTurmaId(null)}>
                                      Cancelar
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <span className="text-sm font-bold text-primary flex-1">{turma.nome}</span> 
                                    <div className="flex items-center gap-1">
                                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditingTurmaId(`${setor}-${turma.nome}`)} title="Editar classe">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                                      </Button>
                                      <Select value={turma.setor} onValueChange={(newSetor) => {
                                        setTurmas(turmas.map(t => {
                                          if (t.nome === turma.nome && t.setor === setor) {
                                            return { ...t, setor: newSetor };
                                          }
                                          return t;
                                        }));
                                        setAlunos(alunos.map(a => {
                                          if (a.classe === turma.nome && a.setor === setor) {
                                            return { ...a, setor: newSetor };
                                          }
                                          return a;
                                        }));
                                      }}>
                                        <SelectTrigger className="h-7 text-xs border-0 bg-transparent hover:bg-muted/50 w-32 px-1 shadow-none focus:ring-0" title="Mover para outro setor">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {setoresOpcoes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                        </SelectContent>
                                      </Select>
                                      <Button variant="ghost" size="sm" className="text-destructive h-7 w-7 p-0 hover:bg-destructive/10" onClick={() => {
                                        setTurmas(turmas.filter(t => !(t.nome === turma.nome && t.setor === setor)));
                                      }} title="Excluir classe">
                                        X
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </div>
                              
                              {isEditing ? (
                                <div className="mt-1 border-t border-muted/50 pt-2 flex flex-col gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Turmas (letras):</span>
                                    <Input 
                                      defaultValue={turma.letras.join(', ')}
                                      id={`edit-letras-${setor}-${turma.nome}`}
                                      placeholder="Ex: A, B, C"
                                      className="h-7 text-xs bg-white dark:bg-slate-900 border-input px-2 flex-1"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Valor Padrão (R$):</span>
                                    <Input 
                                      defaultValue={turma.valorPadrao || ''}
                                      id={`edit-valor-${setor}-${turma.nome}`}
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      placeholder="Ex: 500.00"
                                      className="h-7 text-xs bg-white dark:bg-slate-900 border-input px-2 w-32"
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-1 mt-1 border-t border-muted/50 pt-2">
                                  {turma.valorPadrao !== undefined && (
                                    <span className="text-xs font-medium text-muted-foreground">Valor Padrão: {(turma.valorPadrao).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                  )}
                                  {turma.letras.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                      {turma.letras.map(l => (
                                        <span key={l} className="text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full font-medium shadow-sm">
                                          {turma.nome} {l}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {turmas.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-4">Nenhuma classe cadastrada.</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Relatórios Modal */}
      <Dialog open={isRelatoriosOpen} onOpenChange={setIsRelatoriosOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configuração do Relatório Diário</DialogTitle>
            <DialogDescription>
              Configure quem receberá os relatórios e como a mensagem será formatada.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div className="space-y-4">
              <h3 className="font-medium text-sm">Responsáveis por receber</h3>
              <div className="space-y-3">
                {responsaveisRelatorio.map((resp, i) => (
                  <div key={i} className="flex items-center justify-between bg-muted/30 p-2 rounded border">
                    <div>
                      <div className="text-sm font-medium">{resp.nome}</div>
                      <div className="text-xs text-muted-foreground">{resp.telefone}</div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => setResponsaveisRelatorio(responsaveisRelatorio.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {responsaveisRelatorio.length === 0 && (
                  <div className="text-sm text-muted-foreground italic text-center p-4 border border-dashed rounded">Nenhum responsável cadastrado.</div>
                )}
              </div>

              <div className="border-t pt-4 space-y-3">
                <h4 className="text-xs font-semibold">Adicionar Responsável</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Input 
                    placeholder="Nome" 
                    value={novoResponsavel.nome} 
                    onChange={e => setNovoResponsavel({...novoResponsavel, nome: e.target.value})}
                    className="h-8 text-sm"
                  />
                  <Input 
                    placeholder="WhatsApp (ex: 11999999999)" 
                    value={novoResponsavel.telefone} 
                    onChange={e => setNovoResponsavel({...novoResponsavel, telefone: e.target.value})}
                    className="h-8 text-sm"
                  />
                </div>
                <Button className="w-full h-8 text-sm" onClick={handleAddResponsavel}>Salvar Responsável</Button>
              </div>
            </div>

            <div className="space-y-4 border-l pl-0 md:pl-6">
              <h3 className="font-medium text-sm flex items-center justify-between">
                Modelo da Mensagem
                <Button variant="ghost" size="sm" className="h-6 text-xs text-primary" onClick={() => setMensagemRelatorio(defaultMensagem)}>Restaurar Padrão</Button>
              </h3>
              <div className="space-y-2">
                <Textarea 
                  className="min-h-[300px] text-xs font-mono bg-muted/20"
                  value={mensagemRelatorio}
                  onChange={(e) => setMensagemRelatorio(e.target.value)}
                />
                <div className="text-[10px] text-muted-foreground space-y-1 mt-2">
                  <p><strong>Variáveis disponíveis:</strong></p>
                  <p><code>{`{{data}}`}</code> - Data atual</p>
                  <p><code>{`{{total_funcionarios}}`}</code> - Total de empregados</p>
                  <p><code>{`{{ativos}}`}</code> - Empregados ativos</p>
                  <p><code>{`{{ocorrencias}}`}</code> - Faltas/Ocorrências do dia</p>
                  <p><code>{`{{caixa}}`}</code> - Resumo financeiro automático (Entradas/Saídas)</p>
                  <p><code>{`{{link_caixa}}`}</code> - Link direto para a tela do financeiro</p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Setores Modal */}
      <Dialog open={isCargosOpen} onOpenChange={setIsCargosOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Setores</DialogTitle>
            <DialogDescription>Esta configuração é fixa nesta versão.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="border rounded-md divide-y">
              {setoresOpcoes.map(setor => (
                <div key={setor} className="p-3 text-sm flex justify-between items-center hover:bg-muted/50">
                  {setor}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
