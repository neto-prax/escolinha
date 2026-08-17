import React, { useMemo } from 'react';
import { Lancamento } from '../../types/finance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { TurmaConfig } from '@/types/finance';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface DashboardTurmasTabProps {
  lancamentos: Lancamento[];
}

export function DashboardTurmasTab({ lancamentos }: DashboardTurmasTabProps) {
  
  const [turmas] = useLocalStorage<TurmaConfig[]>('escolinha_turmas_v3', []);

  const treeData = useMemo(() => {
    // Structure: { setorName: { nomeTurma: { entradas, saidas } } }
    const tree = new Map<string, Map<string, { entradas: number, saidas: number }>>();

    // Helper to get or create nodes
    const getSetor = (setorName: string) => {
      let s = tree.get(setorName);
      if (!s) {
        s = new Map<string, { entradas: number, saidas: number }>();
        tree.set(setorName, s);
      }
      return s;
    };

    const getTurma = (setorName: string, turmaName: string) => {
      const s = getSetor(setorName);
      let t = s.get(turmaName);
      if (!t) {
        t = { entradas: 0, saidas: 0 };
        s.set(turmaName, t);
      }
      return t;
    };

    // 1. Initialize all registered turmas so they appear even if empty
    turmas.forEach(t => {
      getTurma(t.setor || 'Sem Setor', t.nome);
    });

    // 2. Add values from lancamentos
    lancamentos.forEach(l => {
      if (l.status !== 'Pago') return;
      if (!l.turmas || l.turmas.length === 0) return;

      const valorPorTurma = l.valor / l.turmas.length;

      l.turmas.forEach(t => {
        const setor = t.setor || 'Sem Setor';
        const turmaNode = getTurma(setor, t.nome);
        
        if (l.tipo === 'Entrada') {
          turmaNode.entradas += valorPorTurma;
        } else {
          turmaNode.saidas += valorPorTurma;
        }
      });
    });

    // 3. Format as array for rendering
    return Array.from(tree.entries()).map(([setorName, turmasMap]) => {
      const turmasArray = Array.from(turmasMap.entries()).map(([turmaName, valores]) => ({
        name: turmaName,
        entradas: valores.entradas,
        saidas: valores.saidas,
        saldo: valores.entradas - valores.saidas
      })).sort((a, b) => a.name.localeCompare(b.name));

      const setorEntradas = turmasArray.reduce((acc, curr) => acc + curr.entradas, 0);
      const setorSaidas = turmasArray.reduce((acc, curr) => acc + curr.saidas, 0);

      return {
        name: setorName,
        entradas: setorEntradas,
        saidas: setorSaidas,
        saldo: setorEntradas - setorSaidas,
        children: turmasArray
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [lancamentos, turmas]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // State to track expanded sectors
  const [expandedSetores, setExpandedSetores] = React.useState<Set<string>>(new Set());

  const toggleSetor = (setorName: string) => {
    setExpandedSetores(prev => {
      const newSet = new Set(prev);
      if (newSet.has(setorName)) {
        newSet.delete(setorName);
      } else {
        newSet.add(setorName);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Entradas vs Saídas por Setor e Turma</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="pb-3 font-medium">Setor / Turma</th>
                  <th className="pb-3 font-medium text-right text-green-600">Entradas</th>
                  <th className="pb-3 font-medium text-right text-red-600">Saídas</th>
                  <th className="pb-3 font-medium text-right">Saldo Líquido</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {treeData.map((setor) => (
                  <React.Fragment key={setor.name}>
                    {/* Linha do Setor */}
                    <tr 
                      className="hover:bg-muted/50 transition-colors cursor-pointer bg-slate-50"
                      onClick={() => toggleSetor(setor.name)}
                    >
                      <td className="py-3 font-semibold flex items-center gap-1 text-slate-800">
                        {expandedSetores.has(setor.name) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        {setor.name}
                      </td>
                      <td className="py-3 text-right font-medium text-green-600">
                        {formatCurrency(setor.entradas)}
                      </td>
                      <td className="py-3 text-right font-medium text-red-600">
                        {formatCurrency(setor.saidas)}
                      </td>
                      <td className={`py-3 text-right font-bold ${setor.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {setor.saldo > 0 ? '+' : ''}{formatCurrency(setor.saldo)}
                      </td>
                    </tr>
                    
                    {/* Linhas das Turmas filhas */}
                    {expandedSetores.has(setor.name) && setor.children.map((turma) => (
                      <tr key={`${setor.name}-${turma.name}`} className="hover:bg-muted/50 transition-colors">
                        <td className="py-2 pl-10 font-medium text-muted-foreground border-l-2 border-slate-200 ml-4 relative">
                           <div className="absolute left-4 top-1/2 w-4 h-px bg-slate-200"></div>
                           {turma.name}
                        </td>
                        <td className="py-2 text-right text-green-600">
                          {formatCurrency(turma.entradas)}
                        </td>
                        <td className="py-2 text-right text-red-600">
                          {formatCurrency(turma.saidas)}
                        </td>
                        <td className={`py-2 text-right font-medium ${turma.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {turma.saldo > 0 ? '+' : ''}{formatCurrency(turma.saldo)}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}

                {treeData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-muted-foreground">
                      Nenhuma turma configurada no sistema.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
