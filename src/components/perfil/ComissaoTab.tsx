import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Users, TrendingUp, Link as LinkIcon, Copy, Plus, Star, Gem, Ticket, Award, Map as MapIcon, User as UserIcon, CheckCircle2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export const ComissaoTab: React.FC = () => {
  const { profile, school } = useAuth();
  
  // Dados de comissões e indicações
  const [indicacoes] = useState([
    { id: 1, escola: 'Escola Caminho Feliz', status: 'Ativo', data: '10/08/2026', valor: 450.00, comissao: 90.00, alunos: 120 },
    { id: 2, escola: 'Colégio Futuro', status: 'Em negociação', data: '12/08/2026', valor: 0, comissao: 0, alunos: 0 },
    { id: 3, escola: 'Instituto Educar', status: 'Ativo', data: '15/08/2026', valor: 850.00, comissao: 170.00, alunos: 155 },
  ]);

  const totalComissoes = indicacoes.reduce((acc, curr) => acc + curr.comissao, 0);
  const indicacoesAtivas = indicacoes.filter(i => i.status === 'Ativo').length;
  const totalAlunos = indicacoes.filter(i => i.status === 'Ativo').reduce((acc, curr) => acc + (curr.alunos || 0), 0);
  
  const baseName = school?.name ? school.name : (profile?.full_name ? profile.full_name : 'ESCOLA');
  const words = baseName.trim().split(' ');
  const couponName = words.length > 1 ? words.slice(1).join('') : words[0];
  const couponCode = `${couponName.toUpperCase()}10`;
  
  const isDiamond = totalAlunos >= 1000;
  const nextGoal = Math.floor(totalAlunos / 50) * 50 + 50;

  // Lógica de estrelas atuais
  const reachedNodes = Math.floor(totalAlunos / 50);
  const goldStarsCount = Math.floor(reachedNodes / 3);
  const remainderNodes = reachedNodes % 3;
  const hasBronze = remainderNodes === 1;
  const hasSilver = remainderNodes === 2;

  // Gerar nós do mapa
  const mapNodes = Array.from({ length: 20 }).map((_, i) => {
    const level = i + 1;
    const studentsReq = level * 50;
    
    let type = 'bronze';
    if (level === 20) type = 'diamante';
    else if (level % 3 === 1) type = 'bronze';
    else if (level % 3 === 2) type = 'prata';
    else if (level % 3 === 0) type = 'ouro';
    
    const isReached = totalAlunos >= studentsReq;
    const isCurrentTarget = (totalAlunos >= (level - 1) * 50) && (totalAlunos < studentsReq);
    
    const yPos = 1600 - (level * 75);
    const xPos = 160 + Math.sin(level * 0.9) * 80;
    
    return { level, studentsReq, type, isReached, isCurrentTarget, yPos, xPos };
  });
  
  // Caminho da estrada
  let simplePath = `M ${mapNodes[0].xPos} 1580 `;
  mapNodes.forEach(node => {
    simplePath += `L ${node.xPos} ${node.yPos} `;
  });

  const handleCopyLink = () => {
    const link = `${window.location.origin}/cadastro?ref=${profile?.id || 'diretor123'}`;
    navigator.clipboard.writeText(link);
    toast.success('Link de indicação copiado!');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Exclusivo Direção */}
      <div className="w-full rounded-2xl bg-gradient-to-r from-purple-800 via-indigo-900 to-slate-900 p-6 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <Badge className="bg-purple-500/30 text-purple-200 border-purple-400/40 text-xs">
              Visão de Diretor(a)
            </Badge>
            <span className="text-xs text-purple-200/80">• Programa de Parceiros & Indicações</span>
          </div>
          <h3 className="text-xl md:text-2xl font-bold">Painel de Comissões e Benefícios</h3>
          <p className="text-sm text-purple-200/90">
            Acompanhe a economia mensal e os benefícios adquiridos por cada escola parceira indicada.
          </p>
        </div>
        <Button onClick={handleCopyLink} className="bg-white text-purple-950 hover:bg-purple-50 gap-2 font-bold shadow-xs whitespace-nowrap">
          <LinkIcon className="h-4 w-4 text-purple-700" /> Copiar Link de Indicação
        </Button>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Esquerda: Cupom, Cards e Indicações */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cupom Promocional */}
          <Card className="bg-primary/5 border-primary/20 shadow-xs relative overflow-hidden rounded-xl">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-primary/10 rounded-full blur-xl"></div>
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                    <Ticket className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-foreground">Seu Cupom de Diretor(a)</h3>
                    <p className="text-xs text-muted-foreground">Novas escolas indicadas recebem 10% de desconto e geram créditos mensais para sua unidade.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-background border px-4 py-2 rounded-lg font-mono font-bold text-lg tracking-widest text-primary shadow-xs">
                  {couponCode}
                  <Button variant="ghost" size="icon" className="h-8 w-8 ml-1 text-muted-foreground hover:text-primary" onClick={() => {
                    navigator.clipboard.writeText(couponCode);
                    toast.success('Cupom copiado com sucesso!');
                  }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cards Resumo */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="shadow-xs rounded-xl border-emerald-200/80 bg-gradient-to-br from-emerald-50/40 to-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Economia no Mês</CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalComissoes)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Crédito abatido na mensalidade</p>
              </CardContent>
            </Card>

            <Card className="shadow-xs rounded-xl border-blue-200/80 bg-gradient-to-br from-blue-50/40 to-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Escolas Parceiras</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{indicacoesAtivas}</div>
                <p className="text-[11px] text-muted-foreground mt-1">Instituições ativas no ecossistema</p>
              </CardContent>
            </Card>

            <Card className="shadow-xs rounded-xl border-purple-200/80 bg-gradient-to-br from-purple-50/40 to-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">Total de Alunos</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalAlunos}</div>
                <p className="text-[11px] text-muted-foreground mt-1">Estudantes nas escolas indicadas</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabela de Indicações */}
          <Card className="shadow-xs rounded-xl">
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">Escolas Indicadas</CardTitle>
                  <CardDescription className="text-xs">Acompanhamento e status de ativação das escolas parceiras.</CardDescription>
                </div>
                <Button size="sm" onClick={handleCopyLink} className="gap-1 text-xs">
                  <Plus className="h-3.5 w-3.5" />
                  Nova Indicação
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Escola Parceira</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Alunos</TableHead>
                    <TableHead>Comissão / Crédito</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {indicacoes.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-semibold text-sm">
                        {item.escola}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.data}
                      </TableCell>
                      <TableCell className="text-xs">
                        {item.alunos > 0 ? `${item.alunos} alunos` : '-'}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {item.comissao > 0 
                          ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.comissao)
                          : 'Em validação'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={item.status === 'Ativo' ? 'secondary' : 'outline'}
                          className={item.status === 'Ativo' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300' : ''}
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita: Mapa de Fases */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-amber-100/60 to-orange-50/50 border-orange-200/60 shadow-md overflow-hidden h-[600px] flex flex-col relative rounded-xl">
            <CardHeader className="pb-3 bg-white/70 backdrop-blur-sm border-b border-orange-200/60 z-10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-orange-950">
                  <MapIcon className="h-4 w-4 text-orange-600" />
                  Mapa de Conquistas
                </CardTitle>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1 min-h-[16px]">
                    {isDiamond ? (
                      <Gem className="h-4 w-4 text-cyan-500 fill-cyan-400" />
                    ) : (
                      <>
                        {Array.from({ length: goldStarsCount }).map((_, i) => (
                          <Star key={`g-${i}`} className="h-4 w-4 text-amber-500 fill-amber-400 drop-shadow-xs" />
                        ))}
                        {hasSilver && <Star className="h-4 w-4 text-slate-400 fill-slate-300 drop-shadow-xs" />}
                        {hasBronze && <Star className="h-4 w-4 text-amber-700 fill-amber-700 drop-shadow-xs" />}
                        {reachedNodes === 0 && <span className="text-[10px] text-orange-700/70 font-bold uppercase tracking-wider">0 Estrelas</span>}
                      </>
                    )}
                  </div>
                  <Badge className="bg-orange-600 hover:bg-orange-700 text-white shadow-xs text-xs font-semibold">{totalAlunos} Alunos</Badge>
                </div>
              </div>
              <p className="text-[11px] text-orange-800/80 mt-1">Próximo nível em {isDiamond ? 'Nível Máximo' : `${nextGoal} alunos`}</p>
            </CardHeader>
            
            <CardContent className="flex-1 p-0 relative overflow-y-auto overflow-x-hidden bg-[#fef3c7]/60">
              <div className="relative mx-auto w-[320px]" style={{ height: '1600px' }}>
                <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" viewBox="0 0 320 1600">
                  <path d={simplePath} fill="none" stroke="#fb923c" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" opacity="0.35" />
                  <path d={simplePath} fill="none" stroke="#fff" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="18 10" className="animate-pulse" />
                </svg>

                {mapNodes.map((node) => {
                  return (
                    <div 
                      key={node.level} 
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                      style={{ 
                        left: `${node.xPos}px`, 
                        top: `${node.yPos}px`,
                        zIndex: node.isCurrentTarget ? 20 : 10
                      }}
                    >
                      {node.isCurrentTarget && (
                        <div className="absolute -top-11 animate-bounce bg-white p-1 rounded-full shadow-lg border-2 border-primary z-30">
                          <div className="bg-primary/10 rounded-full p-1">
                            <UserIcon className="h-5 w-5 text-primary" />
                          </div>
                        </div>
                      )}

                      <div className={`relative flex items-center justify-center w-12 h-12 rounded-full shadow-md border-3 transition-all duration-300 ${
                        node.isReached ? 'border-white bg-white scale-110 shadow-orange-300/40' : 'border-white/60 bg-white/60 grayscale opacity-65'
                      } ${node.isCurrentTarget ? 'ring-3 ring-primary ring-offset-2 scale-110' : ''}`}>
                        
                        {node.type === 'bronze' && <Star className="h-6 w-6 text-amber-700 fill-amber-700 drop-shadow-xs" />}
                        {node.type === 'prata' && <Star className="h-6 w-6 text-slate-400 fill-slate-300 drop-shadow-xs" />}
                        {node.type === 'ouro' && <Star className="h-6 w-6 text-amber-500 fill-amber-400 drop-shadow-xs" />}
                        {node.type === 'diamante' && <Gem className="h-7 w-7 text-cyan-500 fill-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />}
                        
                        <div className="absolute -bottom-5 bg-black/75 text-white text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                          {node.studentsReq}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="absolute bottom-[20px] left-1/2 transform -translate-x-1/2 flex flex-col items-center">
                  <div className="w-14 h-14 bg-emerald-600 rounded-full border-3 border-white shadow-lg flex items-center justify-center">
                    <span className="text-white font-bold text-[11px]">INÍCIO</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
