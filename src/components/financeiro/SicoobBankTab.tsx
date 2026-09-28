import React, { useState, useEffect } from 'react';
import {
  Landmark,
  QrCode,
  FileText,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Plus,
  ArrowUpRight,
  Key,
  Eye,
  EyeOff,
  AlertCircle,
  Building,
  Loader2,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  sicoobService,
  SicoobAccount,
  SicoobInvoice,
  getSicoobClientId,
  setSicoobClientId,
  getSicoobCooperativa,
  setSicoobCooperativa,
  getSicoobConta,
  setSicoobConta,
  getSicoobContrato,
  setSicoobContrato,
  getSicoobChavePix,
  setSicoobChavePix,
  getSicoobEnvironment,
  setSicoobEnvironment,
} from '@/services/sicoobService';

export const SicoobBankTab: React.FC = () => {
  const [balance, setBalance] = useState<number | null>(null);
  const [account, setAccount] = useState<SicoobAccount | null>(null);
  const [invoices, setInvoices] = useState<SicoobInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Credenciais Sicoob
  const [clientId, setClientId] = useState(getSicoobClientId());
  const [cooperativa, setCoop] = useState(getSicoobCooperativa());
  const [conta, setConta] = useState(getSicoobConta());
  const [contrato, setContrato] = useState(getSicoobContrato());
  const [chavePix, setPix] = useState(getSicoobChavePix());
  const [showKey, setShowKey] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [environment, setEnvironment] = useState<'production' | 'sandbox'>(getSicoobEnvironment());

  // Modal de Nova Cobrança Sicoob
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [chargeName, setChargeName] = useState('');
  const [chargeCpf, setChargeCpf] = useState('');
  const [chargeEmail, setChargeEmail] = useState('');
  const [chargePhone, setChargePhone] = useState('');
  const [chargeValue, setChargeValue] = useState('');
  const [chargeDueDate, setChargeDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [chargeDesc, setChargeDesc] = useState('');

  // Modal de Visualização da Fatura
  const [viewInvoiceModal, setViewInvoiceModal] = useState<SicoobInvoice | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedBarcode, setCopiedBarcode] = useState(false);

  const loadSicoobData = async () => {
    setIsLoading(true);
    try {
      const [balRes, accRes, invRes] = await Promise.all([
        sicoobService.getBalance(),
        sicoobService.getAccount(),
        sicoobService.listInvoices(),
      ]);

      setBalance(balRes.balance);
      setAccount(accRes);
      setInvoices(invRes);
      setIsConnected(true);
    } catch (err: any) {
      console.error('Erro ao conectar ao Banco Sicoob:', err);
      setIsConnected(false);
      toast.error('Falha ao comunicar com o Banco Sicoob: ' + (err.message || 'Verifique suas credenciais'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadSicoobData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadSicoobData();
    toast.success('Dados do Banco Sicoob atualizados!');
  };

  const handleSaveAndTestCredentials = async () => {
    setIsTestingKey(true);
    try {
      setSicoobClientId(clientId);
      setSicoobCooperativa(cooperativa);
      setSicoobConta(conta);
      setSicoobContrato(contrato);
      setSicoobChavePix(chavePix);
      setSicoobEnvironment(environment);

      const test = await sicoobService.testConnection(clientId, cooperativa, conta);
      if (test.connected) {
        setIsConnected(true);
        if (test.balance !== undefined) setBalance(test.balance);
        toast.success(`Conexão bem-sucedida com ${test.cooperativaName}!`);
        await loadSicoobData();
      } else {
        setIsConnected(false);
        toast.error(`Erro ao validar Sicoob: ${test.error}`);
      }
    } catch (err: any) {
      setIsConnected(false);
      toast.error('Erro ao conectar com Sicoob: ' + err.message);
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chargeName || !chargeCpf || !chargeValue || !chargeDueDate) {
      toast.error('Preencha os campos obrigatórios (Nome, CPF/CNPJ, Valor e Vencimento)');
      return;
    }

    const numVal = parseFloat(chargeValue.replace(',', '.'));
    if (isNaN(numVal) || numVal <= 0) {
      toast.error('Informe um valor válido em reais');
      return;
    }

    setIsCreatingInvoice(true);
    try {
      const created = await sicoobService.createInvoice({
        nome: chargeName,
        cpfCnpj: chargeCpf,
        email: chargeEmail,
        telefone: chargePhone,
        valor: numVal,
        dataVencimento: chargeDueDate,
        descricao: chargeDesc,
      });

      toast.success(`Boleto Sicoob com Pix gerado com sucesso! Nosso Número: ${created.nossoNumero}`);
      setIsCreateModalOpen(false);
      setChargeName('');
      setChargeCpf('');
      setChargeEmail('');
      setChargePhone('');
      setChargeValue('');
      setChargeDesc('');
      await loadSicoobData();
      setViewInvoiceModal(created);
    } catch (err: any) {
      toast.error('Erro ao emitir cobrança Sicoob: ' + err.message);
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const copyToClipboard = (text: string, type: 'pix' | 'barcode') => {
    navigator.clipboard.writeText(text);
    if (type === 'pix') {
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2500);
      toast.success('Pix Copia e Cola copiado!');
    } else {
      setCopiedBarcode(true);
      setTimeout(() => setCopiedBarcode(false), 2500);
      toast.success('Linha digitável copiada!');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner de Integração Oficial Sicoob */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#003641] to-[#005161] text-white shadow-md border border-[#002730]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Badge className="bg-[#7CB342] text-[#003641] font-bold hover:bg-[#689F38]">
              Sicoob Oficial (Banco 756)
            </Badge>
            <Badge className="bg-white/15 text-white border-0 font-medium">
              Cooperativa {cooperativa || '4321'} • Conta {conta || '88721-0'}
            </Badge>
            <Badge className="bg-white/10 text-white/90 border-0 font-medium">
              ● {environment === 'sandbox' ? 'Ambiente Sandbox' : 'Ambiente Produção'}
            </Badge>
          </div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Landmark className="h-6 w-6 text-[#7CB342]" />
            Banco Cooperativo Sicoob
          </h2>
          <p className="text-xs text-white/80 max-w-2xl leading-relaxed">
            Emissão de Boletos Híbridos com Pix associado e conciliação bancária cooperativa direta via API Sicoob Developers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="border-white/20 bg-white/10 hover:bg-white/20 text-white gap-2 font-medium"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>

          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-[#7CB342] hover:bg-[#689F38] text-[#003641] font-bold gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Nova Cobrança Sicoob
          </Button>
        </div>
      </div>

      {/* Cards de Métricas e Conta */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card Saldo em Conta */}
        <Card className="border border-slate-200 shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-slate-500 flex items-center justify-between">
              Saldo Conta Cooperativa
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900">
              {isLoading ? (
                <div className="h-7 w-28 bg-slate-200 animate-pulse rounded"></div>
              ) : (
                formatCurrency(balance || 0)
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Sincronizado com Cooperativa {cooperativa || '4321'}
            </p>
          </CardContent>
        </Card>

        {/* Card Boletos Emitidos */}
        <Card className="border border-slate-200 shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-slate-500">
              Total de Boletos Sicoob
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900">
              {invoices.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {invoices.filter((i) => i.status === 'EM_ABERTO').length} em aberto •{' '}
              {invoices.filter((i) => i.status === 'PAGO').length} liquidados
            </p>
          </CardContent>
        </Card>

        {/* Card Volume em Aberto */}
        <Card className="border border-slate-200 shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-slate-500">
              A Receber (Em Aberto)
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600">
              {formatCurrency(
                invoices
                  .filter((i) => i.status === 'EM_ABERTO')
                  .reduce((acc, cur) => acc + cur.valor, 0)
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Previsão de conciliação por Pix e Boleto</p>
          </CardContent>
        </Card>

        {/* Card Dados da Cooperativa */}
        <Card className="border border-slate-200 shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-slate-500">
              Conta & Contrato Cobrança
            </CardDescription>
            <CardTitle className="text-base font-bold text-slate-800">
              {account?.titular || 'Escola Modelo Ltda'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-600 font-mono">
              Coop: {cooperativa || '4321'} | C/C: {conta || '88721-0'}
            </p>
            <p className="text-[11px] text-muted-foreground">Contrato Convênio: #{contrato || '104523'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Caixa Rápida de Configuração / Credenciais Sicoob */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-3 border-b bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                <Key className="h-4 w-4 text-[#003641]" />
                Credenciais da API Sicoob (Portal Developers)
              </CardTitle>
              <CardDescription className="text-xs">
                Configure o Client ID, Cooperativa e Conta Corrente obtidos no{' '}
                <a
                  href="https://developers.sicoob.com.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#003641] font-semibold underline hover:text-[#005161]"
                >
                  developers.sicoob.com.br
                </a>
              </CardDescription>
            </div>

            <Button
              size="sm"
              onClick={handleSaveAndTestCredentials}
              disabled={isTestingKey}
              className="bg-[#003641] hover:bg-[#005161] text-white font-semibold gap-1.5 text-xs self-start"
            >
              {isTestingKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5 text-[#7CB342]" />}
              Testar & Salvar Sicoob
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold text-slate-700">Client ID da Aplicação *</Label>
              <div className="relative">
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Ex: 5f1b8a92-sicoob-app-client-id"
                  className="font-mono text-xs pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Código Cooperativa (4 dígitos) *</Label>
              <Input
                value={cooperativa}
                onChange={(e) => setCoop(e.target.value)}
                placeholder="4321"
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Conta Corrente Sicoob *</Label>
              <Input
                value={conta}
                onChange={(e) => setConta(e.target.value)}
                placeholder="88721-0"
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Número do Contrato de Cobrança</Label>
              <Input
                value={contrato}
                onChange={(e) => setContrato(e.target.value)}
                placeholder="104523"
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Chave Pix da Cooperativa</Label>
              <Input
                value={chavePix}
                onChange={(e) => setPix(e.target.value)}
                placeholder="CNPJ, E-mail ou Chave Aleatória"
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Ambiente de Execução</Label>
              <select
                value={environment}
                onChange={(e: any) => setEnvironment(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="production">Produção (api.sicoob.com.br)</option>
                <option value="sandbox">Sandbox / Homologação (sandbox.sicoob.com.br)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Boletos e Cobranças Sicoob */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#003641]" />
                Boletos e Cobranças Emitidas pelo Sicoob
              </CardTitle>
              <CardDescription className="text-xs">
                Boletos registrados no Banco Cooperativo Sicoob com conciliação automática por Pix QR Code e Código de Barras.
              </CardDescription>
            </div>

            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-[#003641] hover:bg-[#005161] text-white font-semibold gap-1.5 text-xs self-start"
            >
              <Plus className="h-3.5 w-3.5 text-[#7CB342]" />
              Nova Cobrança
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/70">
              <TableRow>
                <TableHead className="text-xs font-bold text-slate-700">Nosso Número</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Aluno / Pagador</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Valor</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Vencimento</TableHead>
                <TableHead className="text-xs font-bold text-slate-700">Status</TableHead>
                <TableHead className="text-xs font-bold text-slate-700 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#003641]" />
                    <p className="text-xs text-muted-foreground mt-2">Carregando boletos Sicoob...</p>
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-xs">
                    Nenhum boleto Sicoob registrado ainda. Clique em "Nova Cobrança Sicoob" para emitir o primeiro.
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => (
                  <TableRow key={inv.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-mono text-xs font-bold text-slate-800">
                      {inv.nossoNumero}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-xs text-slate-900">{inv.pagador.nome}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">{inv.pagador.cpfCnpj}</div>
                    </TableCell>
                    <TableCell className="font-bold text-xs text-slate-900">
                      {formatCurrency(inv.valor)}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      {new Date(inv.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      {inv.status === 'PAGO' ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                          Liquidado
                        </Badge>
                      ) : inv.status === 'EM_ABERTO' ? (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px]">
                          Em Aberto
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-rose-700 bg-rose-50 text-[10px]">
                          Vencido
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewInvoiceModal(inv)}
                        className="text-xs h-7 px-2.5 gap-1.5 border-slate-200 text-[#003641] hover:bg-slate-100"
                      >
                        <QrCode className="h-3.5 w-3.5 text-[#003641]" />
                        Ver Cobrança
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Nova Cobrança Sicoob */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCreateInvoice}>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-[#003641] text-white">Sicoob 756</Badge>
                <Badge variant="outline" className="text-[#7CB342] border-[#7CB342]/40 bg-emerald-50">
                  Boleto Híbrido + Pix
                </Badge>
              </div>
              <DialogTitle className="text-lg flex items-center gap-2 text-slate-900">
                <Plus className="h-5 w-5 text-[#003641]" />
                Emitir Boleto Bancário Sicoob
              </DialogTitle>
              <DialogDescription className="text-xs">
                Gera um boleto registrado na Cooperativa Sicoob com QR Code Pix integrado no topo.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nome do Aluno / Responsável *</Label>
                <Input
                  required
                  placeholder="Nome completo do pagador"
                  value={chargeName}
                  onChange={(e) => setChargeName(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">CPF ou CNPJ *</Label>
                  <Input
                    required
                    placeholder="000.000.000-00"
                    value={chargeCpf}
                    onChange={(e) => setChargeCpf(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Telefone / WhatsApp</Label>
                  <Input
                    placeholder="(00) 00000-0000"
                    value={chargePhone}
                    onChange={(e) => setChargePhone(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Valor (R$) *</Label>
                  <Input
                    required
                    placeholder="450,00"
                    value={chargeValue}
                    onChange={(e) => setChargeValue(e.target.value)}
                    className="text-xs font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Data de Vencimento *</Label>
                  <Input
                    type="date"
                    required
                    value={chargeDueDate}
                    onChange={(e) => setChargeDueDate(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">E-mail para envio</Label>
                <Input
                  type="email"
                  placeholder="responsavel@email.com"
                  value={chargeEmail}
                  onChange={(e) => setChargeEmail(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Descrição / Mensalidade</Label>
                <Input
                  placeholder="Ex: Mensalidade Escolar - Outubro/2024"
                  value={chargeDesc}
                  onChange={(e) => setChargeDesc(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isCreatingInvoice}
                className="bg-[#003641] hover:bg-[#005161] text-white text-xs font-bold gap-2"
              >
                {isCreatingInvoice ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5 text-[#7CB342]" />}
                Emitir Boleto Sicoob
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes da Cobrança com QR Code Pix e Linha Digitável */}
      {viewInvoiceModal && (
        <Dialog open={!!viewInvoiceModal} onOpenChange={(open) => !open && setViewInvoiceModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-[#003641] text-white">Sicoob SCD 756</Badge>
                <Badge variant="outline" className="text-emerald-700 bg-emerald-50">
                  Boleto Registrado
                </Badge>
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Cobrança Sicoob: {viewInvoiceModal.nossoNumero}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Pagador: <strong className="text-slate-800">{viewInvoiceModal.pagador.nome}</strong> ({viewInvoiceModal.pagador.cpfCnpj})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="text-xs font-medium text-muted-foreground">Valor do Boleto</div>
                <div className="text-2xl font-black text-slate-900 mt-0.5">
                  {formatCurrency(viewInvoiceModal.valor)}
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  Vencimento:{' '}
                  <strong>{new Date(viewInvoiceModal.dataVencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</strong>
                </div>
              </div>

              {/* QR Code Pix */}
              {viewInvoiceModal.pixCopiaECola && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <QrCode className="h-4 w-4 text-[#003641]" />
                      Pix Copia e Cola (Compensação Imediata)
                    </Label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(viewInvoiceModal.pixCopiaECola!, 'pix')}
                      className="h-6 text-[11px] gap-1 px-2 text-[#003641] font-semibold"
                    >
                      {copiedPix ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      {copiedPix ? 'Copiado!' : 'Copiar Pix'}
                    </Button>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-100 font-mono text-[11px] break-all border text-slate-700 select-all">
                    {viewInvoiceModal.pixCopiaECola}
                  </div>
                </div>
              )}

              {/* Linha Digitável do Boleto */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-[#003641]" />
                    Linha Digitável do Boleto
                  </Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(viewInvoiceModal.linhaDigitavel, 'barcode')}
                    className="h-6 text-[11px] gap-1 px-2 text-[#003641] font-semibold"
                  >
                    {copiedBarcode ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    {copiedBarcode ? 'Copiado!' : 'Copiar Código'}
                  </Button>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-100 font-mono text-xs break-all border text-slate-800 font-bold select-all">
                  {viewInvoiceModal.linhaDigitavel}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                onClick={() => setViewInvoiceModal(null)}
                className="w-full bg-[#003641] hover:bg-[#005161] text-white text-xs font-bold"
              >
                Concluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
