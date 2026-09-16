import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Download, TrendingUp, TrendingDown, Landmark, Users, AlertCircle, PieChart, CheckCircle, Clock, GraduationCap } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { mockCaixas } from '@/data/mockData';
import { toast } from 'sonner';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Aluno, Mensalidade } from '@/types/aluno';
import { Lancamento, Caixa } from '@/types/finance';
import { formatDate } from '@/lib/utils';

const Relatorios = () => {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  
  const [alunos] = useLocalStorage<Aluno[]>('escolinha_alunos', []);
  const [mensalidades] = useLocalStorage<Mensalidade[]>('escolinha_mensalidades', []);
  const [lancamentosStorage] = useLocalStorage<any[]>('escolinha_lancamentos', []);
  const [caixas] = useLocalStorage<Caixa[]>('escolinha_caixas', mockCaixas);
  const [employees] = useLocalStorage<any[]>('escolinha_employees_v2', []);

  const lancamentos: Lancamento[] = lancamentosStorage.map((l) => ({
    ...l,
    data: typeof l.data === 'string' ? new Date(l.data) : l.data,
  }));

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const getFilteredData = (data: Lancamento[]) => {
    if (!dataInicio || !dataFim) return data;
    const inicio = new Date(`${dataInicio}T00:00:00`).getTime();
    const fim = new Date(`${dataFim}T23:59:59`).getTime();
    return data.filter((l) => {
      const t = new Date(l.data).getTime();
      return t >= inicio && t <= fim;
    });
  };


  const generatePDF = (title: string, head: string[][], body: any[][]) => {
    const doc = new jsPDF();
    doc.text(title, 14, 15);
    if (dataInicio && dataFim) {
      doc.setFontSize(10);
      doc.text(`Período: ${formatDate(dataInicio)} a ${formatDate(dataFim)}`, 14, 22);
    }
    
    autoTable(doc, {
      startY: (dataInicio && dataFim) ? 28 : 25,
      head,
      body,
    });

    doc.save(`${title.toLowerCase().replace(/ /g, '_')}.pdf`);
    toast.success(`${title} exportado com sucesso!`);
  };

  const exportEntradas = () => {
    const data = getFilteredData(lancamentos.filter(e => e.tipo === 'Entrada'));
    if(data.length === 0) return toast.error("Nenhuma entrada no período.");
    
    const body = data.map(e => [formatDate(e.data), e.descricao, e.categoria, formatCurrency(e.valor)]);
    generatePDF("Relatório de Entradas por Período", [['Data', 'Descrição', 'Categoria', 'Valor']], body);
  };

  const exportSaidas = () => {
    const data = getFilteredData(lancamentos.filter(e => e.tipo === 'Saída'));
    if(data.length === 0) return toast.error("Nenhuma saída no período.");
    
    const body = data.map(e => [formatDate(e.data), e.descricao, e.categoria, formatCurrency(e.valor)]);
    generatePDF("Relatório de Saídas por Período", [['Data', 'Descrição', 'Categoria', 'Valor']], body);
  };

  const exportCaixa = () => {
    const periodo = getFilteredData(lancamentos);
    if (periodo.length === 0) return toast.error("Nenhum lançamento no período.");

    const listaCaixas: Caixa[] = caixas.length ? caixas : mockCaixas;
    const body = listaCaixas.map(c => {
      const doCaixa = periodo.filter(e => e.caixaId === c.id);
      const entradas = doCaixa.filter(e => e.tipo === 'Entrada').reduce((acc, curr) => acc + Number(curr.valor || 0), 0);
      const saidas = doCaixa.filter(e => e.tipo === 'Saída').reduce((acc, curr) => acc + Number(curr.valor || 0), 0);
      return [c.nome, formatCurrency(entradas), formatCurrency(saidas), formatCurrency(Number(c.saldoInicial || 0) + entradas - saidas)];
    });

    // Lançamentos sem caixa vinculado
    const semCaixa = periodo.filter(e => !e.caixaId || !listaCaixas.some(c => c.id === e.caixaId));
    if (semCaixa.length > 0) {
      const entradas = semCaixa.filter(e => e.tipo === 'Entrada').reduce((acc, curr) => acc + Number(curr.valor || 0), 0);
      const saidas = semCaixa.filter(e => e.tipo === 'Saída').reduce((acc, curr) => acc + Number(curr.valor || 0), 0);
      body.push(['Sem caixa vinculado', formatCurrency(entradas), formatCurrency(saidas), formatCurrency(entradas - saidas)]);
    }

    generatePDF("Caixa Agrupado por Período", [['Caixa', 'Entradas', 'Saídas', 'Saldo Final']], body);
  };



  const exportFuncionarios = () => {
    if (employees.length === 0) {
      return toast.error("Nenhum funcionário cadastrado no sistema.");
    }
    const body = employees.map(emp => {
      const isHorista = emp.contract_type === 'horista' || (!emp.contract_type && Number(emp.hourly_rate) > 0);
      const remuneracao = isHorista 
        ? `${(Number(emp.hourly_rate) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/h-aula`
        : (Number(emp.salary) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

      return [
        emp.name,
        emp.role,
        emp.department,
        isHorista ? 'Horista' : 'Mensalista',
        remuneracao,
        emp.phone || '-',
        emp.status === 'active' ? 'Ativo' : emp.status === 'vacation' ? 'Férias' : 'Afastado'
      ];
    });
    generatePDF(
      "Quadro de Colaboradores e Funcionários", 
      [['Nome', 'Cargo', 'Departamento', 'Regime', 'Remuneração', 'Telefone', 'Status']], 
      body
    );
  };

  const exportOcorrencias = () => {
    const allOcorrencias = employees.flatMap(emp => 
      (emp.ocorrencias || []).map((oco: any) => [
        oco.data ? formatDate(oco.data) : '-',
        emp.name,
        oco.tipo || 'Ocorrência',
        oco.descricao || ''
      ])
    );
    if (allOcorrencias.length === 0) {
      return toast.error("Nenhuma ocorrência registrada no sistema.");
    }
    generatePDF("Ocorrências de Funcionários", [['Data', 'Funcionário', 'Tipo', 'Descrição']], allOcorrencias);
  };

  const exportOrcamentos = () => {
    const body = [
      ['Marketing', formatCurrency(5000), formatCurrency(1500), formatCurrency(3500)],
      ['Eventos Escolares', formatCurrency(10000), formatCurrency(8500), formatCurrency(1500)],
      ['Manutenção Predial', formatCurrency(15000), formatCurrency(2300), formatCurrency(12700)],
    ];
    generatePDF("Saídas Agrupadas por Orçamento", [['Orçamento', 'Valor Previsto', 'Valor Realizado', 'Saldo Restante']], body);
  };

  const exportMensalidadesRecebidas = () => {
    let data = mensalidades.filter(m => m.status === 'Pago' && m.dataPagamento);
    if (dataInicio && dataFim) {
      const inicio = new Date(dataInicio).setHours(0,0,0,0);
      const fim = new Date(dataFim).setHours(23,59,59,999);
      data = data.filter(m => {
        const d = new Date(m.dataPagamento!).getTime();
        return d >= inicio && d <= fim;
      });
    }
    
    if(data.length === 0) return toast.error("Nenhuma mensalidade recebida no período.");
    
    const body = data.map(m => {
      const aluno = alunos.find(a => a.id === m.alunoId);
      return [
        aluno?.nome || 'Desconhecido',
        m.mesReferencia,
        formatDate(m.dataPagamento),
        formatCurrency(m.valorFinal)
      ];
    });
    
    generatePDF("Relatório de Mensalidades Recebidas", [['Aluno', 'Mês Referência', 'Data Pagamento', 'Valor']], body);
  };

  const exportMensalidadesAtraso = () => {
    const today = new Date().setHours(0,0,0,0);
    let data = mensalidades.filter(m => m.status === 'Pendente' && new Date(m.dataVencimento).getTime() < today);
    if (dataInicio && dataFim) {
      const inicio = new Date(dataInicio).setHours(0,0,0,0);
      const fim = new Date(dataFim).setHours(23,59,59,999);
      data = data.filter(m => {
        const d = new Date(m.dataVencimento).getTime();
        return d >= inicio && d <= fim;
      });
    }
    
    if(data.length === 0) return toast.error("Nenhuma mensalidade em atraso no período.");
    
    const body = data.map(m => {
      const aluno = alunos.find(a => a.id === m.alunoId);
      return [
        aluno?.nome || 'Desconhecido',
        m.mesReferencia,
        formatDate(m.dataVencimento),
        formatCurrency(m.valorFinal)
      ];
    });
    
    generatePDF("Relatório de Mensalidades em Atraso", [['Aluno', 'Mês Referência', 'Data Vencimento', 'Valor']], body);
  };

  const exportRecebidasAgrupadas = () => {
    let data = mensalidades.filter(m => m.status === 'Pago' && m.dataPagamento);
    if (dataInicio && dataFim) {
      const inicio = new Date(dataInicio).setHours(0,0,0,0);
      const fim = new Date(dataFim).setHours(23,59,59,999);
      data = data.filter(m => {
        const d = new Date(m.dataPagamento!).getTime();
        return d >= inicio && d <= fim;
      });
    }

    const map = new Map<string, { qtd: number, valor: number }>();
    data.forEach(m => {
      const aluno = alunos.find(a => a.id === m.alunoId);
      if (!aluno) return;
      const key = `${aluno.setor || 'Sem Curso'}|${aluno.classe || ''} ${aluno.turma || ''}`.trim();
      const curr = map.get(key) || { qtd: 0, valor: 0 };
      curr.qtd++;
      curr.valor += m.valorFinal;
      map.set(key, curr);
    });

    const body = Array.from(map.entries()).map(([key, val]) => {
      const [curso, turma] = key.split('|');
      return [curso, turma, val.qtd.toString(), formatCurrency(val.valor)];
    });
    
    body.sort((a,b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));

    if(body.length === 0) return toast.error("Nenhuma mensalidade recebida no período.");
    generatePDF("Mensalidades Recebidas por Curso/Turma", [['Curso', 'Turma', 'Quantidade', 'Valor Total']], body);
  };

  const exportAtrasoAgrupadas = () => {
    const today = new Date().setHours(0,0,0,0);
    let data = mensalidades.filter(m => m.status === 'Pendente' && new Date(m.dataVencimento).getTime() < today);
    if (dataInicio && dataFim) {
      const inicio = new Date(dataInicio).setHours(0,0,0,0);
      const fim = new Date(dataFim).setHours(23,59,59,999);
      data = data.filter(m => {
        const d = new Date(m.dataVencimento).getTime();
        return d >= inicio && d <= fim;
      });
    }

    const map = new Map<string, { qtd: number, valor: number }>();
    data.forEach(m => {
      const aluno = alunos.find(a => a.id === m.alunoId);
      if (!aluno) return;
      const key = `${aluno.setor || 'Sem Curso'}|${aluno.classe || ''} ${aluno.turma || ''}`.trim();
      const curr = map.get(key) || { qtd: 0, valor: 0 };
      curr.qtd++;
      curr.valor += m.valorFinal;
      map.set(key, curr);
    });

    const body = Array.from(map.entries()).map(([key, val]) => {
      const [curso, turma] = key.split('|');
      return [curso, turma, val.qtd.toString(), formatCurrency(val.valor)];
    });
    
    body.sort((a,b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));

    if(body.length === 0) return toast.error("Nenhuma mensalidade em atraso no período.");
    generatePDF("Mensalidades em Atraso por Curso/Turma", [['Curso', 'Turma', 'Quantidade', 'Valor Total em Atraso']], body);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Relatórios Gerenciais" description="Emita relatórios detalhados em PDF filtrados por período." />
      
      <Card className="mb-6 bg-slate-50">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1">
              <Label>Data Inicial</Label>
              <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
            </div>
            <div className="space-y-2 flex-1">
              <Label>Data Final</Label>
              <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
            </div>
            <Button variant="outline" className="mb-0" onClick={() => { setDataInicio(''); setDataFim(''); }}>Limpar Filtro</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <ReportCard title="Mensalidades Recebidas" icon={<CheckCircle className="h-6 w-6" />} color="text-teal-700" bg="bg-teal-100" onClick={exportMensalidadesRecebidas} desc="Mensalidades pagas, listadas individualmente." />
        <ReportCard title="Mensalidades em Atraso" icon={<Clock className="h-6 w-6" />} color="text-rose-700" bg="bg-rose-100" onClick={exportMensalidadesAtraso} desc="Mensalidades vencidas e pendentes, por aluno." />
        <ReportCard title="Recebidas por Turma/Curso" icon={<GraduationCap className="h-6 w-6" />} color="text-teal-700" bg="bg-teal-100" onClick={exportRecebidasAgrupadas} desc="Total de recebimentos agrupado por turma." />
        <ReportCard title="Atrasadas por Turma/Curso" icon={<GraduationCap className="h-6 w-6" />} color="text-rose-700" bg="bg-rose-100" onClick={exportAtrasoAgrupadas} desc="Inadimplência consolidada agrupada por turma." />
        
        <ReportCard title="Entradas por Período" icon={<TrendingUp className="h-6 w-6" />} color="text-green-700" bg="bg-green-100" onClick={exportEntradas} desc="Todas as receitas registradas no período." />
        <ReportCard title="Saídas por Período" icon={<TrendingDown className="h-6 w-6" />} color="text-red-700" bg="bg-red-100" onClick={exportSaidas} desc="Todas as despesas e pagamentos efetuados." />
        <ReportCard title="Caixa Agrupado" icon={<Landmark className="h-6 w-6" />} color="text-indigo-700" bg="bg-indigo-100" onClick={exportCaixa} desc="Movimentação e saldos agrupados por caixa." />
        <ReportCard title="Pagamentos a Receber" icon={<Users className="h-6 w-6" />} color="text-blue-700" bg="bg-blue-100" onClick={exportFuncionarios} desc="Folha de pagamento pendente para o período." />
        <ReportCard title="Ocorrências" icon={<AlertCircle className="h-6 w-6" />} color="text-amber-700" bg="bg-amber-100" onClick={exportOcorrencias} desc="Faltas, atrasos e atestados de funcionários." />
        <ReportCard title="Saídas por Orçamento" icon={<PieChart className="h-6 w-6" />} color="text-purple-700" bg="bg-purple-100" onClick={exportOrcamentos} desc="Acompanhamento do que foi gasto vs orçado." />
      </div>
    </div>
  );
};

const ReportCard = ({ title, icon, color, bg, onClick, desc }: any) => (
  <Card className="flex flex-col h-full">
    <CardHeader>
      <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${bg} ${color} mb-4`}>
        {icon}
      </div>
      <CardTitle className="text-lg">{title}</CardTitle>
      <CardDescription>{desc}</CardDescription>
    </CardHeader>
    <CardContent className="mt-auto pt-4">
      <Button className="w-full" variant="outline" onClick={onClick}>
        <Download className="mr-2 h-4 w-4" />
        Exportar PDF
      </Button>
    </CardContent>
  </Card>
);

export default Relatorios;
