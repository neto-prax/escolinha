import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Download, TrendingUp, TrendingDown, Landmark, Users, AlertCircle, PieChart } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { mockExpenses, mockEmployees, mockCaixas } from '@/data/mockData';
import { toast } from 'sonner';

const Relatorios = () => {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const getFilteredData = (data: any[]) => {
    // Para simplificar no mock, retornamos tudo se não houver datas
    return data;
  };

  const generatePDF = (title: string, head: string[][], body: any[][]) => {
    const doc = new jsPDF();
    doc.text(title, 14, 15);
    if (dataInicio && dataFim) {
      doc.setFontSize(10);
      doc.text(`Período: ${new Date(dataInicio).toLocaleDateString('pt-BR')} a ${new Date(dataFim).toLocaleDateString('pt-BR')}`, 14, 22);
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
    const data = getFilteredData(mockExpenses.filter(e => e.tipo === 'Entrada'));
    if(data.length === 0) return toast.error("Nenhuma entrada no período.");
    
    const body = data.map(e => [e.data.toLocaleDateString('pt-BR'), e.descricao, e.categoria, formatCurrency(e.valor)]);
    generatePDF("Relatório de Entradas por Período", [['Data', 'Descrição', 'Categoria', 'Valor']], body);
  };

  const exportSaidas = () => {
    const data = getFilteredData(mockExpenses.filter(e => e.tipo === 'Saída'));
    if(data.length === 0) return toast.error("Nenhuma saída no período.");
    
    const body = data.map(e => [e.data.toLocaleDateString('pt-BR'), e.descricao, e.categoria, formatCurrency(e.valor)]);
    generatePDF("Relatório de Saídas por Período", [['Data', 'Descrição', 'Categoria', 'Valor']], body);
  };

  const exportCaixa = () => {
    const body = mockCaixas.map(c => {
      const entradas = mockExpenses.filter(e => e.caixaId === c.id && e.tipo === 'Entrada').reduce((acc, curr) => acc + curr.valor, 0);
      const saidas = mockExpenses.filter(e => e.caixaId === c.id && e.tipo === 'Saída').reduce((acc, curr) => acc + curr.valor, 0);
      return [c.nome, formatCurrency(entradas), formatCurrency(saidas), formatCurrency(c.saldoInicial + entradas - saidas)];
    });
    generatePDF("Caixa Agrupado por Período", [['Caixa', 'Entradas', 'Saídas', 'Saldo Final']], body);
  };

  const exportFuncionarios = () => {
    const body = mockEmployees.map(emp => [
      emp.name,
      emp.role,
      emp.department,
      formatCurrency(Math.random() * 2000 + 1500), // Salário mockado
      'A Receber'
    ]);
    generatePDF("Funcionários a Receber Pagamentos", [['Nome', 'Cargo', 'Departamento', 'Valor a Receber', 'Status']], body);
  };

  const exportOcorrencias = () => {
    const body = [
      ['05/08/2026', 'Carlos Lima', 'Atraso', 'Atraso de 30 minutos na entrada.'],
      ['10/08/2026', 'João Santos', 'Falta Injustificada', 'Não compareceu ao turno da manhã.'],
      ['12/08/2026', 'Maria Silva', 'Atestado Médico', 'Atestado de 2 dias.'],
    ];
    generatePDF("Ocorrências por Período", [['Data', 'Funcionário', 'Tipo', 'Descrição']], body);
  };

  const exportOrcamentos = () => {
    const body = [
      ['Marketing', formatCurrency(5000), formatCurrency(1500), formatCurrency(3500)],
      ['Eventos Escolares', formatCurrency(10000), formatCurrency(8500), formatCurrency(1500)],
      ['Manutenção Predial', formatCurrency(15000), formatCurrency(2300), formatCurrency(12700)],
    ];
    generatePDF("Saídas Agrupadas por Orçamento", [['Orçamento', 'Valor Previsto', 'Valor Realizado', 'Saldo Restante']], body);
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
