import React, { useState, useEffect } from 'react';
import {
  Landmark,
  QrCode,
  FileText,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Plus,
  Key,
  Eye,
  EyeOff,
  Building,
  Loader2,
  ExternalLink,
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
  bradescoService,
  BradescoAccount,
  BradescoInvoice,
  getBradescoClientId,
  setBradescoClientId,
  getBradescoAgencia,
  setBradescoAgencia,
  getBradescoConta,
  setBradescoConta,
  getBradescoCarteira,
  setBradescoCarteira,
  getBradescoChavePix,
  setBradescoChavePix,
  getBradescoEnvironment,
  setBradescoEnvironment,
} from '@/services/bradescoService';

export const BradescoBankTab: React.FC = () => {
  const [balance, setBalance] = useState<number | null>(null);
  const [account, setAccount] = useState<BradescoAccount | null>(null);
  const [invoices, setInvoices] = useState<BradescoInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Credenciais Bradesco
  const [clientId, setClientId] = useState(getBradescoClientId());
  const [agencia, setAgencia] = useState(getBradescoAgencia());
  const [conta, setConta] = useState(getBradescoConta());
  const [carteira, setCarteira] = useState(getBradescoCarteira());
  const [chavePix, setPix] = useState(getBradescoChavePix());
  const [showKey, setShowKey] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [environment, setEnvironment] = useState<'production' | 'sandbox'>(getBradescoEnvironment());

  // Modal de Nova Cobrança Bradesco
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
  const [viewInvoiceModal, setViewInvoiceModal] = useState<BradescoInvoice | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedBarcode, setCopiedBarcode] = useState(false);

  const loadBradescoData = async () => {
    setIsLoading(true);
    try {
      const [balRes, accRes, invRes] = await Promise.all([
        bradescoService.getBalance(),
        bradescoService.getAccount(),
        bradescoService.listInvoices(),
      ]);

      setBalance(balRes.balance);
      setAccount(accRes);
      setInvoices(invRes);
      setIsConnected(true);
    } catch (err: any) {
      console.error('Erro ao conectar ao Banco Bradesco:', err);
      setIsConnected(false);
      toast.error('Falha ao comunicar com o Banco Bradesco: ' + (err.message || 'Verifique suas credenciais'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadBradescoData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadBradescoData();
    toast.success('Dados do Banco Bradesco sincronizados!');
  };

  const handleSaveAndTestCredentials = async () => {
    setIsTestingKey(true);
    try {
      setBradescoClientId(clientId);
      setBradescoAgencia(agencia);
      setBradescoConta(conta);
      setBradescoCarteira(carteira);
      setBradescoChavePix(chavePix);
      setBradescoEnvironment(environment);

      const test = await bradescoService.testConnection(clientId, agencia, conta);
      if (test.connected) {
        setIsConnected(true);
        if (test.balance !== undefined) setBalance(test.balance);
        toast.success(`Conexão bem-sucedida com ${test.accountName}!`);
        await loadBradescoData();
      } else {
        setIsConnected(false);
        toast.error(`Erro ao validar Bradesco: ${test.error}`);
      }
    } catch (err: any) {
      setIsConnected(false);
      toast.error('Erro ao conectar com Bradesco: ' + err.message);
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
      const created = await bradescoService.createInvoice({
        nome: chargeName,
        cpfCnpj: chargeCpf,
        email: chargeEmail,
        telefone: chargePhone,
        valor: numVal,
        dataVencimento: chargeDueDate,
        descricao: chargeDesc,
      });

      toast.success(`Boleto Bradesco emitido com sucesso! Nosso Número: ${created.nossoNumero}`);
      setIsCreateModalOpen(false);
      setChargeName('');
      setChargeCpf('');
      setChargeEmail('');
      setChargePhone('');
      setChargeValue('');
      setChargeDesc('');
      await loadBradescoData();
      setViewInvoiceModal(created);
    } catch (err: any) {
      toast.error('Erro ao emitir cobrança Bradesco: ' + err.message);
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
      {/* Top Banner de Integração Oficial Bradesco */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#cc092f] to-[#99001f] text-white shadow-md border border-[#800015]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Badge className="bg-white text-[#cc092f] font-bold hover:bg-white/90">
              Banco Bradesco (237)
            </Badge>
            <Badge className="bg-white/15 text-white border-0 font-medium">
              Agência {agencia || '1234'} • Conta {conta || '0054321-8'} (Carteira {carteira || '09'})
            </Badge>
            <Badge className="bg-white/10 text-white/90 border-0 font-medium">
              ● {environment === 'sandbox' ? 'Ambiente Sandbox' : 'Ambiente Produção'}
            </Badge>
          </div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Landmark className="h-6 w-6 text-white" />
            Banco Bradesco S.A.
          </h2>
          <p className="text-xs text-white/80 max-w-2xl leading-relaxed">
            Emissão de Boletos Registrados (Carteira 09 Escritural) com Pix integrado e conciliação bancária via API Developers Bradesco.
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
            className="bg-white hover:bg-slate-100 text-[#cc092f] font-bold gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Nova Cobrança Bradesco
          </Button>
        </div>
      </div>

      {/* Cards de Métricas e Conta */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card Saldo em Conta */}
        <Card className="border border-slate-200 shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-slate-500 flex items-center justify-between">
              Saldo Conta Corrente Bradesco
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
              Agência {agencia || '1234'} • C/C {conta || '0054321-8'}
            </p>
          </CardContent>
        </Card>

        {/* Card Títulos Registrados */}
        <Card className="border border-slate-200 shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-slate-500">
              Títulos Registrados
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-slate-900">
              {invoices.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {invoices.filter((i) => i.status === 'REGISTRADO').length} ativos •{' '}
              {invoices.filter((i) => i.status === 'LIQUIDADO').length} liquidados
            </p>
          </CardContent>
        </Card>

        {/* Card Volume a Receber */}
        <Card className="border border-slate-200 shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-slate-500">
              Volume em Carteira
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-rose-600">
              {formatCurrency(
                invoices
                  .filter((i) => i.status === 'REGISTRADO')
                  .reduce((acc, cur) => acc + cur.valor, 0)
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Carteira de Cobrança 09 Escritural</p>
          </CardContent>
        </Card>

        {/* Card Dados da Conta */}
        <Card className="border border-slate-200 shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold text-slate-500">
              Titularidade & Carteira
            </CardDescription>
            <CardTitle className="text-base font-bold text-slate-800">
              {account?.titular || 'Escola Modelo Ltda'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-600 font-mono">
              Banco 237 | Ag: {agencia || '1234'} | C/C: {conta || '0054321-8'}
            </p>
            <p className="text-[11px] text-muted-foreground">Carteira Registrada: {carteira || '09'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Caixa Rápida de Configuração / Credenciais Bradesco */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-3 border-b bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                <Key className="h-4 w-4 text-[#cc092f]" />
                Credenciais da API Bradesco (Portal Developers)
              </CardTitle>
              <CardDescription className="text-xs">
                Configure a Chave da Aplicação, Agência e Conta Corrente obtidas no{' '}
                <a
                  href="https://developers.bradesco.com.br/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#cc092f] font-semibold underline hover:text-[#99001f]"
                >
                  developers.bradesco.com.br
                </a>
              </CardDescription>
            </div>

            <Button
              size="sm"
              onClick={handleSaveAndTestCredentials}
              disabled={isTestingKey}
              className="bg-[#cc092f] hover:bg-[#99001f] text-white font-semibold gap-1.5 text-xs self-start"
            >
              {isTestingKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
              Testar & Salvar Bradesco
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold text-slate-700">Client ID / App Key Bradesco *</Label>
              <div className="relative">
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Ex: a8f9104b-bradesco-client-key"
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
              <Label className="text-xs font-semibold text-slate-700">Agência (4 dígitos) *</Label>
              <Input
                value={agencia}
                onChange={(e) => setAgencia(e.target.value)}
                placeholder="1234"
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Conta Corrente Bradesco *</Label>
              <Input
                value={conta}
                onChange={(e) => setConta(e.target.value)}
                placeholder="0054321-8"
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Carteira de Cobrança (Padrão: 09)</Label>
              <Input
                value={carteira}
                onChange={(e) => setCarteira(e.target.value)}
                placeholder="09"
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Chave Pix Bradesco (Opcional)</Label>
              <Input
                value={chavePix}
                onChange={(e) => setPix(e.target.value)}
                placeholder="CNPJ, E-mail ou Telefone"
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
                <option value="production">Produção (api.bradesco.com.br)</option>
                <option value="sandbox">Sandbox / Homologação (homolog.api.bradesco)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Boletos Registrados Bradesco */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#cc092f]" />
                Títulos Registrados no Banco Bradesco
              </CardTitle>
              <CardDescription className="text-xs">
                Boletos registrados na Carteira 09 com conciliação automática bancária e Pix associado.
              </CardDescription>
            </div>

            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-[#cc092f] hover:bg-[#99001f] text-white font-semibold gap-1.5 text-xs self-start"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo Título
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
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#cc092f]" />
                    <p className="text-xs text-muted-foreground mt-2">Carregando títulos Bradesco...</p>
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-xs">
                    Nenhum título Bradesco registrado ainda. Clique em "Nova Cobrança Bradesco" para emitir o primeiro.
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
                      {inv.status === 'LIQUIDADO' ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                          Liquidado
                        </Badge>
                      ) : inv.status === 'REGISTRADO' ? (
                        <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px]">
                          Registrado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-700 bg-amber-50 text-[10px]">
                          Vencido
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setViewInvoiceModal(inv)}
                        className="text-xs h-7 px-2.5 gap-1.5 border-slate-200 text-[#cc092f] hover:bg-slate-100"
                      >
                        <QrCode className="h-3.5 w-3.5 text-[#cc092f]" />
                        Ver Título
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Nova Cobrança Bradesco */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCreateInvoice}>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-[#cc092f] text-white">Bradesco 237</Badge>
                <Badge variant="outline" className="text-rose-700 border-rose-200 bg-rose-50">
                  Carteira 09 Registrada
                </Badge>
              </div>
              <DialogTitle className="text-lg flex items-center gap-2 text-slate-900">
                <Plus className="h-5 w-5 text-[#cc092f]" />
                Emitir Boleto Bancário Bradesco
              </DialogTitle>
              <DialogDescription className="text-xs">
                Gera um boleto registrado no Banco Bradesco S.A. com linha digitável e QR Code Pix.
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
                    placeholder="580,00"
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
                  placeholder="Ex: Mensalidade Escolar - Novembro/2024"
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
                className="bg-[#cc092f] hover:bg-[#99001f] text-white text-xs font-bold gap-2"
              >
                {isCreatingInvoice ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                Registrar no Bradesco
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
                <Badge className="bg-[#cc092f] text-white">Bradesco 237</Badge>
                <Badge variant="outline" className="text-rose-700 bg-rose-50">
                  Carteira {carteira || '09'} Registrada
                </Badge>
              </div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Título Bradesco: {viewInvoiceModal.nossoNumero}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Pagador: <strong className="text-slate-800">{viewInvoiceModal.pagador.nome}</strong> ({viewInvoiceModal.pagador.cpfCnpj})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="text-xs font-medium text-muted-foreground">Valor do Título</div>
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
                      <QrCode className="h-4 w-4 text-[#cc092f]" />
                      Pix Copia e Cola (Compensação Imediata)
                    </Label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(viewInvoiceModal.pixCopiaECola!, 'pix')}
                      className="h-6 text-[11px] gap-1 px-2 text-[#cc092f] font-semibold"
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
                    <FileText className="h-4 w-4 text-[#cc092f]" />
                    Linha Digitável Bradesco
                  </Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(viewInvoiceModal.linhaDigitavel, 'barcode')}
                    className="h-6 text-[11px] gap-1 px-2 text-[#cc092f] font-semibold"
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
                className="w-full bg-[#cc092f] hover:bg-[#99001f] text-white text-xs font-bold"
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
