import React, { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Users, TrendingUp, Link as LinkIcon, Copy, Plus, Star, Gem, Ticket, Award, Map as MapIcon, User as UserIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function PainelVendedor() {
  const { profile, school } = useAuth();
  
  // Dados mockados para demonstração
  const [indicacoes] = useState([
    { id: 1, escola: 'Escola Caminho Feliz', status: 'Ativo', data: '10/08/2026', valor: 450.00, comissao: 90.00, alunos: 120 },
    { id: 2, escola: 'Colégio Futuro', status: 'Em negociação', data: '12/08/2026', valor: 0, comissao: 0, alunos: 0 },
    { id: 3, escola: 'Instituto Educar', status: 'Ativo', data: '15/08/2026', valor: 850.00, comissao: 170.00, alunos: 155 },
  ]);

  const totalComissoes = indicacoes.reduce((acc, curr) => acc + curr.comissao, 0);
  const indicacoesAtivas = indicacoes.filter(i => i.status === 'Ativo').length;
  
  const totalAlunos = indicacoes.filter(i => i.status === 'Ativo').reduce((acc, curr) => acc + (curr.alunos || 0), 0);
  
  const baseName = school?.name ? school.name : (profile?.name ? profile.name : 'ESCOLA');
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
    const level = i + 1; // 1 to 20
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
    // Simulando link de afiliado/vendedor
    const link = `${window.location.origin}/cadastro?ref=${profile?.id || 'vendedor123'}`;
    navigator.clipboard.writeText(link);
    toast.success('Link de indicação copiado!');
  };

  return (
    <div className="space-y-6">
      {/* Banner Promocional */}
      <div className="w-full h-32 md:h-40 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="z-10 text-center px-4">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Espaço para Banner</h2>
          <p className="text-sm md:text-base opacity-90">Adicione aqui suas campanhas e avisos importantes</p>
        </div>
      </div>

      <PageHeader 
        title="Comissão" 
        description="Acompanhe suas indicações e comissões" 
      >
        <Button onClick={handleCopyLink} variant="outline" className="flex items-center gap-2">
          <LinkIcon size={16} /> Copiar Link de Indicação
        </Button>
      </PageHeader>

      {/* Duas Colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Coluna Esquerda: Cupom, Cards e Indicações */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Cupom Promocional */}
          <Card className="bg-primary/5 border-primary/20 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-primary/10 rounded-full blur-xl"></div>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <Ticket className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Seu Cupom de Indicação</h3>
                    <p className="text-sm text-muted-foreground">Compartilhe e ganhe comissões sobre novas escolas.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-background border px-4 py-2 rounded-lg font-mono font-bold text-xl tracking-widest text-primary shadow-inner">
                  {couponCode}
                  <Button variant="ghost" size="icon" className="h-8 w-8 ml-2 text-muted-foreground hover:text-primary" onClick={() => {
                    navigator.clipboard.writeText(couponCode);
                    toast.success('Cupom copiado!');
                  }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cards Resumo */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Economizados no mês</CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalComissoes)}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 leading-tight">Total de desconto que você terá no mês</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Escolas Ativas</CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{indicacoesAtivas}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Alunos Ativos</CardTitle>
                <TrendingUp className="h-4 w-4 text-indigo-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-600">{totalAlunos}</div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela de Indicações */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Minhas Indicações</CardTitle>
                  <CardDescription>Status e acompanhamento das escolas.</CardDescription>
                </div>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Indicação
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Escola</TableHead>
                    <TableHead>Estrelas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {indicacoes.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.escola}
                      </TableCell>
                      <TableCell>
                        <Star className={`h-5 w-5 ${item.status === 'Ativo' ? 'fill-green-500 text-green-500' : 'fill-red-500 text-red-500'}`} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita: Mapa de Fases (Candy Crush style) */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-orange-100 to-amber-50 border-none shadow-lg overflow-hidden h-[600px] flex flex-col relative">
            <CardHeader className="pb-4 bg-white/50 backdrop-blur-sm border-b border-orange-200 z-10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2 text-orange-800">
                  <MapIcon className="h-5 w-5 text-orange-600" />
                  Mapa de Conquistas
                </CardTitle>
                <div className="flex flex-col items-end gap-1.5">
                  <div className="flex items-center gap-1 min-h-[16px]">
                    {isDiamond ? (
                      <Gem className="h-4 w-4 text-cyan-400 fill-cyan-300" />
                    ) : (
                      <>
                        {Array.from({ length: goldStarsCount }).map((_, i) => (
                          <Star key={`g-${i}`} className="h-4 w-4 text-yellow-500 fill-yellow-400 drop-shadow-sm" />
                        ))}
                        {hasSilver && <Star className="h-4 w-4 text-slate-400 fill-slate-300 drop-shadow-sm" />}
                        {hasBronze && <Star className="h-4 w-4 text-amber-700 fill-amber-700 drop-shadow-sm" />}
                        {reachedNodes === 0 && <span className="text-[10px] text-orange-600/50 uppercase font-bold tracking-wider">0 Estrelas</span>}
                      </>
                    )}
                  </div>
                  <Badge className="bg-orange-500 hover:bg-orange-600 text-white shadow-sm">{totalAlunos} Alunos</Badge>
                </div>
              </div>
              <p className="text-xs text-orange-700/80 mt-1">Próxima fase em {isDiamond ? '-' : nextGoal} alunos</p>
            </CardHeader>
            
            <CardContent className="flex-1 p-0 relative overflow-y-auto overflow-x-hidden map-scroll-container bg-[#fde68a]">
              {/* O mapa vertical */}
              <div className="relative mx-auto w-[320px]" style={{ height: '1600px' }}>
                
                {/* Linha do caminho */}
                <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" viewBox="0 0 320 1600">
                  {/* Estrada mais grossa embaixo */}
                  <path d={simplePath} fill="none" stroke="#fb923c" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
                  {/* Estrada principal */}
                  <path d={simplePath} fill="none" stroke="#fff" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="20 10" className="animate-pulse" />
                </svg>

                {/* Nós (Fases) */}
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
                      {/* Avatar no Target Atual */}
                      {node.isCurrentTarget && (
                        <div className="absolute -top-12 animate-bounce bg-white p-1 rounded-full shadow-lg border-2 border-primary z-30">
                          <div className="bg-primary/10 rounded-full p-1">
                            <UserIcon className="h-6 w-6 text-primary" />
                          </div>
                        </div>
                      )}

                      {/* Ícone da Fase */}
                      <div className={`relative flex items-center justify-center w-14 h-14 rounded-full shadow-md border-4 transition-all duration-300 ${
                        node.isReached ? 'border-white bg-white scale-110' : 'border-white/50 bg-white/50 grayscale opacity-60'
                      } ${node.isCurrentTarget ? 'ring-4 ring-primary ring-offset-2 scale-110' : ''}`}>
                        
                        {node.type === 'bronze' && <Star className="h-7 w-7 text-amber-700 fill-amber-700 drop-shadow-sm" />}
                        {node.type === 'prata' && <Star className="h-7 w-7 text-slate-400 fill-slate-300 drop-shadow-sm" />}
                        {node.type === 'ouro' && <Star className="h-7 w-7 text-yellow-500 fill-yellow-400 drop-shadow-sm" />}
                        {node.type === 'diamante' && <Gem className="h-8 w-8 text-cyan-400 fill-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />}
                        
                        {/* Tooltip com quantidade de alunos */}
                        <div className="absolute -bottom-6 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                          {node.studentsReq} alunos
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Início (Base) */}
                <div className="absolute bottom-[20px] left-1/2 transform -translate-x-1/2 flex flex-col items-center">
                  <div className="w-16 h-16 bg-green-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xs">INÍCIO</span>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
