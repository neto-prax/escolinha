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
  Sparkles,
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
  coraService,
  CoraAccount,
  CoraInvoice,
  getCoraApiKey,
  setCoraApiKey,
  getCoraClientId,
  setCoraClientId,
  getCoraEnvironment,
  setCoraEnvironment,
  hasCoraCredentials,
} from '@/services/coraService';

export const CoraBankTab: React.FC = () => {
  const [balance, setBalance] = useState<number | null>(null);
  const [account, setAccount] = useState<CoraAccount | null>(null);
  const [pixKeys, setPixKeys] = useState<{ type: string; key: string }[]>([]);
  const [invoices, setInvoices] = useState<CoraInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Configuração da chave de API Cora
  const [currentKey, setCurrentKey] = useState(getCoraApiKey());
  const [currentClientId, setCurrentClientId] = useState(getCoraClientId());
  const [showKey, setShowKey] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean>(() => hasCoraCredentials());
  const [environment, setEnvironment] = useState<'production' | 'stage'>(getCoraEnvironment());

  // Modal de Nova Cobrança Cora
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [chargeName, setChargeName] = useState('');
  const [chargeCpf, setChargeCpf] = useState('');
  const [chargeEmail, setChargeEmail] = useState('');
  const [chargeValue, setChargeValue] = useState('');
  const [chargeDueDate, setChargeDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().split('T')[0];
  });
  const [chargeDesc, setChargeDesc] = useState('');

  // Modal de Detalhes da Cobrança Gerada
  const [viewInvoiceModal, setViewInvoiceModal] = useState<CoraInvoice | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [copiedBarcode, setCopiedBarcode] = useState(false);

  const loadCoraData = async () => {
    if (!hasCoraCredentials()) {
      setIsConnected(false);
      setBalance(0);
      setAccount({
        name: 'Aguardando Credenciais da Escola',
        document: 'Envie as credenciais da API Cora abaixo',
        agency: '0001',
        accountNumber: 'Pendente',
        bankCode: '403',
        bankName: 'Cora SCD',
      });
      setPixKeys([]);
      setInvoices([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const [balRes, accRes, pixRes, invRes] = await Promise.all([
        coraService.getBalance(),
        coraService.getAccount(),
        coraService.getPixKeys(),
        coraService.getInvoices(),
      ]);

      setBalance(balRes.balance);
      setAccount(accRes);
      setPixKeys(pixRes);
      setInvoices(invRes);
      setIsConnected(true);
    } catch (err: any) {
      console.error('Erro ao conectar ao Banco Cora:', err);
      setIsConnected(false);
      toast.error('Falha ao comunicar com o Banco Cora: ' + (err.message || 'Verifique sua chave'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCoraData();
  }, []);

  const handleRefreshBalance = async () => {
    if (!hasCoraCredentials()) {
      toast.info('Cadastre as credenciais do Banco Cora abaixo para consultar o saldo e extrato.');
      return;
    }
    setIsRefreshing(true);
    try {
      const balRes = await coraService.getBalance();
      setBalance(balRes.balance);
      const invRes = await coraService.getInvoices();
      setInvoices(invRes);
      toast.success('Dados e extrato do Banco Cora atualizados!');
    } catch (e: any) {
      toast.error('Erro ao atualizar saldo: ' + e.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTestAndSaveKey = async () => {
    if (!currentKey.trim() && !currentClientId.trim()) {
      toast.error('Informe ao menos a Chave de API / Token ou Client ID do Banco Cora.');
      return;
    }

    setIsTestingKey(true);
    try {
      const res = await coraService.testConnection(currentKey, currentClientId);
      if (res.connected) {
        setCoraApiKey(currentKey);
        if (currentClientId) setCoraClientId(currentClientId);
        setCoraEnvironment(environment);
        setIsConnected(true);
        if (res.balance !== undefined) setBalance(res.balance);
        toast.success(`Credenciais do Banco Cora validadas com sucesso! Titular: ${res.name || 'Conta Escolar'}`);
        await loadCoraData();
      } else {
        setIsConnected(false);
        toast.error(res.error || 'Não foi possível validar as credenciais do Banco Cora.');
      }
    } catch (e: any) {
      setIsConnected(false);
      toast.error('Erro na validação da chave Cora: ' + e.message);
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleDisconnect = () => {
    setCoraApiKey('');
    setCoraClientId('');
    setCurrentKey('');
    setCurrentClientId('');
    setIsConnected(false);
    loadCoraData();
    toast.info('Credenciais do Banco Cora removidas. Os boletos serão emitidos pelo banco do caixa.');
  };

  const handleCreateCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasCoraCredentials()) {
      toast.error('O Banco Cora só pode ser integrado e emitir cobranças após o envio e validação das credenciais da escola.');
      return;
    }
    if (!chargeName.trim() || !chargeCpf.trim() || !chargeValue) {
      toast.error('Preencha os campos obrigatórios (Nome, CPF e Valor).');
      return;
    }

    const numVal = parseFloat(chargeValue.replace(',', '.'));
    if (isNaN(numVal) || numVal <= 0) {
      toast.error('Valor da cobrança inválido.');
      return;
    }

    setIsCreatingInvoice(true);
    try {
      const inv = await coraService.createInvoice({
        name: chargeName.trim(),
        cpfCnpj: chargeCpf.trim(),
        email: chargeEmail.trim() || undefined,
        value: numVal,
        dueDate: chargeDueDate,
        description: chargeDesc.trim() || 'Mensalidade Escolar',
      });

      toast.success(`Boleto Híbrido Cora gerado com sucesso! Código: ${inv.code}`);
      setIsCreateModalOpen(false);
      setViewInvoiceModal(inv);
      
      // Limpa formulário
      setChargeName('');
      setChargeCpf('');
      setChargeEmail('');
      setChargeValue('');
      setChargeDesc('');
      
      // Atualiza listagem
      loadCoraData();
    } catch (e: any) {
      toast.error('Erro ao emitir cobrança no Banco Cora: ' + e.message);
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const formatCurrency = (val: number | null) => {
    if (val === null || isNaN(val)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Banner Superior Banco Cora */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#fe3c72]/10 via-[#ff6584]/5 to-transparent border border-[#fe3c72]/20">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-[#fe3c72] flex items-center justify-center text-white shadow-md font-black text-xl tracking-tighter">
            cora
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Banco Cora SCD (403)</h2>
              <Badge className="bg-[#fe3c72] hover:bg-[#fe3c72]/90 text-white font-semibold text-[10px]">
                Integração Oficial Cora
              </Badge>
              <Badge variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50 text-[10px]">
                Pix & Boletos Gratuitos
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Conta jurídica digital especializada em escolas e empresas. Emissão de Boletos Híbridos com QR Code Pix embutido.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshBalance}
            disabled={isRefreshing}
            className="text-xs gap-1.5 border-slate-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar Saldo
          </Button>
          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-[#fe3c72] hover:bg-[#e02d60] text-white font-semibold text-xs gap-1.5 shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            Emitir Cobrança Cora
          </Button>
        </div>
      </div>

      {/* Caixa de Configuração / Credenciais da API Banco Cora */}
      <Card className="border border-slate-200 shadow-xs">
        <CardHeader className="pb-3 border-b bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                  <Key className="h-4 w-4 text-[#fe3c72]" />
                  Credenciais de Integração da API Banco Cora
                </CardTitle>
                {hasCoraCredentials() ? (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[10px]">
                    ✅ Integração Ativa & Homologada
                  </Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-bold text-[10px]">
                    ⚠️ Credenciais Pendentes (Integração Inativa)
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs mt-1">
                {hasCoraCredentials()
                  ? 'A escola enviou as credenciais do Banco Cora. A emissão de boletos via Cora está autorizada e ativa.'
                  : 'O Banco Cora só é integrado e emite boletos quando as credenciais forem cadastradas pela escola. Caso contrário, os boletos são emitidos pelos bancos vinculados aos caixas.'}
              </CardDescription>
            </div>

            <div className="flex items-center gap-2 self-start">
              {hasCoraCredentials() && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDisconnect}
                  className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                >
                  Remover Credenciais
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleTestAndSaveKey}
                disabled={isTestingKey}
                className="bg-[#fe3c72] hover:bg-[#e02d60] text-white font-semibold gap-1.5 text-xs shadow-xs"
              >
                {isTestingKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                Salvar & Validar Credenciais Cora
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold text-slate-700">
                Chave de API / Token de Acesso Cora *
              </Label>
              <div className="relative">
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={currentKey}
                  onChange={(e) => setCurrentKey(e.target.value)}
                  placeholder="Ex: cora_live_token_a1b2c3d4e5f6..."
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
              <p className="text-[11px] text-muted-foreground">
                Gere seu token no painel Cora Empresas em Configurações &gt; Integrações / API.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Client ID da Escola (Opcional)</Label>
              <Input
                value={currentClientId}
                onChange={(e) => setCurrentClientId(e.target.value)}
                placeholder="Ex: client-id-escola-cora"
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Utilizado para autenticação OAuth2 mTLS caso ativado.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 border-t border-slate-100">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Ambiente da API</Label>
              <select
                value={environment}
                onChange={(e: any) => setEnvironment(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="production">Produção Oficial (matls-api.cora.com.br)</option>
                <option value="stage">Stage / Homologação (matls-api.stage.cora.com.br)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-4 text-xs text-slate-600">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
              <span>
                Quando sem credenciais, os boletos da escola são emitidos pelos bancos configurados nos Caixas (Banco do Brasil, Sicoob, Bradesco, Itaú, etc.).
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card de Saldo */}
        <Card className="border shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center justify-between">
              <span>Saldo Disponível Cora</span>
              <Landmark className="h-4 w-4 text-[#fe3c72]" />
            </CardDescription>
            <CardTitle className="text-2xl font-black text-slate-900">
              {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-[#fe3c72]" /> : formatCurrency(balance)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2 mt-1">
              <span>Rendimento automático CDI</span>
              <span className="font-semibold text-emerald-600">100% CDI</span>
            </div>
          </CardContent>
        </Card>

        {/* Card de Dados da Conta */}
        <Card className="border shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center justify-between">
              <span>Dados da Conta Cora</span>
              <Building className="h-4 w-4 text-slate-500" />
            </CardDescription>
            <CardTitle className="text-sm font-bold text-slate-800">
              {account?.name || 'Colégio Interagir Ltda'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Banco / Código:</span>
              <span className="font-medium text-slate-900">403 - Cora SCD</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Agência / Conta:</span>
              <span className="font-medium text-slate-900">{account?.agency || '0001'} / {account?.accountNumber || '3369804-1'}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>CNPJ Titular:</span>
              <span className="font-medium text-slate-900">{account?.document || '48.912.450/0001-89'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Card de Chaves Pix */}
        <Card className="border shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center justify-between">
              <span>Chaves Pix & Recebimentos</span>
              <QrCode className="h-4 w-4 text-[#fe3c72]" />
            </CardDescription>
            <CardTitle className="text-sm font-bold text-slate-800">
              Pix Instantâneo Ativo
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-1 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span>Chave CNPJ:</span>
              <span className="font-mono font-medium text-slate-900 text-[11px] truncate max-w-[140px]">
                {pixKeys[0]?.key || '48.912.450/0001-89'}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Tarifa de Emissão:</span>
              <span className="font-semibold text-emerald-600">R$ 0,00 (Grátis)</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Baixa Automática:</span>
              <span className="font-semibold text-indigo-600">Habilitada via Webhook</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Cobranças Emitidas no Cora */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#fe3c72]" />
              Cobranças e Boletos Híbridos Cora
            </CardTitle>
            <CardDescription className="text-xs">
              Mensalidades emitidas via Banco Cora com código Pix e linha digitável integrada.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshBalance}
              disabled={isRefreshing}
              className="text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              Sincronizar
            </Button>
            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-[#fe3c72] hover:bg-[#e02d60] text-white text-xs gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Nova Cobrança
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código / Data</TableHead>
                <TableHead>Aluno / Pagador</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs">
                    Nenhuma cobrança emitida no Banco Cora até o momento.
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <div className="font-semibold text-xs text-slate-900">{inv.code}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(inv.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-xs text-slate-800">{inv.customer.name}</div>
                      <div className="text-[10px] text-muted-foreground">{inv.customer.document}</div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 max-w-[180px] truncate">
                      {inv.description || 'Mensalidade'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(inv.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-slate-900">
                      {formatCurrency(inv.totalAmount)}
                    </TableCell>
                    <TableCell>
                      {inv.status === 'PAID' && (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                          Pago
                        </Badge>
                      )}
                      {inv.status === 'OPEN' && (
                        <Badge variant="outline" className="text-amber-800 border-amber-300 bg-amber-50 text-[10px]">
                          Em Aberto
                        </Badge>
                      )}
                      {inv.status === 'OVERDUE' && (
                        <Badge variant="destructive" className="text-[10px]">
                          Vencido
                        </Badge>
                      )}
                      {inv.status === 'CANCELLED' && (
                        <Badge variant="secondary" className="text-[10px]">
                          Cancelado
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 gap-1 border-slate-200 hover:bg-slate-50 text-[#fe3c72]"
                        onClick={() => setViewInvoiceModal(inv)}
                      >
                        <QrCode className="h-3 w-3" />
                        Ver Pix / Boleto
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal: Emitir Nova Cobrança Cora */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <span className="w-6 h-6 rounded-md bg-[#fe3c72] text-white flex items-center justify-center font-bold text-xs">
                c
              </span>
              Emitir Boleto Híbrido Cora
            </DialogTitle>
            <DialogDescription className="text-xs">
              Gera um boleto bancário registrado pelo Banco Cora (403) com QR Code Pix integrado no topo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCharge} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Nome do Aluno / Responsável *</Label>
              <Input
                placeholder="Ex: João da Silva"
                value={chargeName}
                onChange={(e) => setChargeName(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">CPF do Pagador *</Label>
                <Input
                  placeholder="000.000.000-00"
                  value={chargeCpf}
                  onChange={(e) => setChargeCpf(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Valor (R$) *</Label>
                <Input
                  placeholder="Ex: 480.00"
                  type="number"
                  step="0.01"
                  value={chargeValue}
                  onChange={(e) => setChargeValue(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Data de Vencimento *</Label>
                <Input
                  type="date"
                  value={chargeDueDate}
                  onChange={(e) => setChargeDueDate(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">E-mail para Notificação</Label>
                <Input
                  type="email"
                  placeholder="responsavel@email.com"
                  value={chargeEmail}
                  onChange={(e) => setChargeEmail(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Descrição / Referência</Label>
              <Input
                placeholder="Ex: Mensalidade Referente a Outubro"
                value={chargeDesc}
                onChange={(e) => setChargeDesc(e.target.value)}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isCreatingInvoice}
                className="bg-[#fe3c72] hover:bg-[#e02d60] text-white font-semibold text-xs gap-1.5"
              >
                {isCreatingInvoice ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Gerar Cobrança Cora
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Visualizar Pix e Linha Digitável Cora */}
      <Dialog open={!!viewInvoiceModal} onOpenChange={(open) => !open && setViewInvoiceModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <QrCode className="h-5 w-5 text-[#fe3c72]" />
              Cobrança Banco Cora - {viewInvoiceModal?.code}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pagador: {viewInvoiceModal?.customer.name} • Valor: {formatCurrency(viewInvoiceModal?.totalAmount || 0)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Bloco Pix */}
            <div className="p-4 rounded-xl border bg-slate-50 text-center space-y-3">
              <div className="text-xs font-bold text-slate-800">QR Code Pix Instantâneo</div>
              <div className="flex justify-center">
                {/* QR Code SVG / Visual Box */}
                <div className="p-3 bg-white border rounded-xl shadow-xs inline-block">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      viewInvoiceModal?.pix?.emv || 'cora-pix'
                    )}`}
                    alt="QR Code Pix Cora"
                    className="w-40 h-40"
                  />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Escaneie pelo aplicativo de qualquer banco. A confirmação do pagamento no Cora ocorre em poucos segundos.
              </p>
              
              {viewInvoiceModal?.pix?.emv && (
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={viewInvoiceModal.pix.emv}
                    className="font-mono text-[10px] bg-white"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs shrink-0 gap-1 border-slate-300"
                    onClick={() => {
                      navigator.clipboard.writeText(viewInvoiceModal.pix?.emv || '');
                      setCopiedPix(true);
                      setTimeout(() => setCopiedPix(false), 2000);
                      toast.success('Código Pix Copia e Cola copiado!');
                    }}
                  >
                    {copiedPix ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedPix ? 'Copiado!' : 'Copiar Pix'}
                  </Button>
                </div>
              )}
            </div>

            {/* Bloco Linha Digitável do Boleto */}
            {viewInvoiceModal?.bankSlip && (
              <div className="p-4 rounded-xl border bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Linha Digitável do Boleto Cora</span>
                  <Badge variant="outline" className="text-[10px]">
                    Banco 403
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={viewInvoiceModal.bankSlip.digitableLine}
                    className="font-mono text-xs bg-slate-50"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs shrink-0 gap-1"
                    onClick={() => {
                      navigator.clipboard.writeText(viewInvoiceModal.bankSlip?.digitableLine || '');
                      setCopiedBarcode(true);
                      setTimeout(() => setCopiedBarcode(false), 2000);
                      toast.success('Linha digitável copiada!');
                    }}
                  >
                    {copiedBarcode ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedBarcode ? 'Copiado!' : 'Copiar'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setViewInvoiceModal(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

