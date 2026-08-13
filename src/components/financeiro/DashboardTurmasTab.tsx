import React, { useMemo } from 'react';
import { Lancamento } from '../../types/finance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { TurmaConfig } from '@/types/finance';

interface DashboardTurmasTabProps {
  lancamentos: Lancamento[];
}

export function DashboardTurmasTab({ lancamentos }: DashboardTurmasTabProps) {
  
  const [turmas] = useLocalStorage<TurmaConfig[]>('escolinha_turmas_v3', []);

  const turmasData = useMemo(() => {
    const map = new Map<string, { entradas: number, saidas: number }>();

    // Inicializar com TODAS as turmas do sistema, para a tabela exibir mesmo zeradas
    turmas.forEach(t => {
      if (t.letras.length > 0) {
        t.letras.forEach(letra => {
          map.set(`${t.nome} ${letra}`, { entradas: 0, saidas: 0 });
        });
      } else {
        map.set(`${t.nome}`, { entradas: 0, saidas: 0 });
      }
    });

    lancamentos.forEach(l => {
      if (l.status !== 'Pago') return;
      if (!l.turmas || l.turmas.length === 0) return;

      const valorPorTurma = l.valor / l.turmas.length;

      l.turmas.forEach(t => {
        // Formato deve bater com o de inicialização (nome + letra ou só nome se não tiver letra)
        // No lançamento, 't.nome' costuma ser a classe. O banco de dados do lançamento salva a turma inteira no objeto 't'
        // Mas a propriedade 't.letras' não diz a letra exata do aluno, e sim as letras da configuração!
        // No lancamento, a "turma" do aluno era salva em t.letra? Não, o lançamento salva o objeto TurmaConfig.
        // Vamos usar a chave como o t.nome para compatibilidade caso a estrutura do lancamento seja apenas a classe
        const nomeTurma = `${t.nome}`; 
        
        const curr = map.get(nomeTurma) || { entradas: 0, saidas: 0 };
        if (l.tipo === 'Entrada') {
          curr.entradas += valorPorTurma;
        } else {
          curr.saidas += valorPorTurma;
        }
        map.set(nomeTurma, curr);
      });
    });

    return Array.from(map.entries())
      .map(([name, valores]) => ({
        name,
        entradas: valores.entradas,
        saidas: valores.saidas,
        saldo: valores.entradas - valores.saidas
      }))
      .sort((a, b) => b.saldo - a.saldo);
  }, [lancamentos]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Entradas vs Saídas por Turma/Classe</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="pb-3 font-medium">Turma / Classe</th>
                  <th className="pb-3 font-medium text-right text-green-600">Entradas</th>
                  <th className="pb-3 font-medium text-right text-red-600">Saídas</th>
                  <th className="pb-3 font-medium text-right">Saldo Líquido</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {turmasData.map((t) => (
                  <tr key={t.name} className="hover:bg-muted/50 transition-colors">
                    <td className="py-3 font-medium">{t.name}</td>
                    <td className="py-3 text-right font-medium text-green-600">
                      {formatCurrency(t.entradas)}
                    </td>
                    <td className="py-3 text-right font-medium text-red-600">
                      {formatCurrency(t.saidas)}
                    </td>
                    <td className={`py-3 text-right font-bold ${t.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {t.saldo > 0 ? '+' : ''}{formatCurrency(t.saldo)}
                    </td>
                  </tr>
                ))}
                {turmasData.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-muted-foreground">Nenhuma turma configurada no sistema.</td>
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
