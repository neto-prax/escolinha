import React, { useState } from 'react';
import { Landmark } from 'lucide-react';
import { AsaasBankTab } from './AsaasBankTab';
import { CoraBankTab } from './CoraBankTab';
import { SicoobBankTab } from './SicoobBankTab';
import { BradescoBankTab } from './BradescoBankTab';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getActiveBankingGateway,
  setActiveBankingGateway,
  BankingGatewayId,
  hasCoraCredentials,
} from '@/services/coraService';
import { toast } from 'sonner';

export const BancoIntegradoTab: React.FC = () => {
  const [selectedBankView, setSelectedBankView] = useState<BankingGatewayId>(() => {
    return getActiveBankingGateway();
  });
  const [activeGateway, setActiveGatewayState] = useState<BankingGatewayId>(() => {
    return getActiveBankingGateway();
  });

  const handleSelectBankView = (bank: BankingGatewayId) => {
    setSelectedBankView(bank);
  };

  const getBankName = (bank: BankingGatewayId) => {
    switch (bank) {
      case 'cora':
        return 'Banco Cora';
      case 'sicoob':
        return 'Banco Sicoob (756)';
      case 'bradesco':
        return 'Banco Bradesco (237)';
      case 'asaas':
      default:
        return 'Asaas Bank';
    }
  };

  const handleSetActiveGateway = (bank: BankingGatewayId) => {
    if (bank === 'cora' && !hasCoraCredentials()) {
      toast.error('O Banco Cora só pode ser ativado como gateway após o envio e validação das credenciais de API da escola.');
      setSelectedBankView('cora');
      return;
    }
    const success = setActiveBankingGateway(bank);
    if (success) {
      setActiveGatewayState(bank);
      toast.success(`Gateway principal de cobrança alterado para ${getBankName(bank)}`);
    } else {
      toast.error('Não foi possível ativar este banco. Verifique as credenciais.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra de Seleção de Banco & Gateway Ativo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-xl bg-card shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mr-2">
            <Landmark className="h-4 w-4 text-primary" />
            Visualizar Banco:
          </span>

          <div className="flex flex-wrap items-center gap-2">
            {/* Asaas */}
            <button
              type="button"
              onClick={() => handleSelectBankView('asaas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 border ${
                selectedBankView === 'asaas'
                  ? 'bg-[#6b26d9] text-white border-[#6b26d9] shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-white"></span>
              Asaas Bank
              {activeGateway === 'asaas' && (
                <Badge className="bg-white/20 hover:bg-white/30 text-white text-[9px] px-1 py-0 h-4">
                  Principal
                </Badge>
              )}
            </button>

            {/* Cora */}
            <button
              type="button"
              onClick={() => handleSelectBankView('cora')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 border ${
                selectedBankView === 'cora'
                  ? 'bg-[#fe3c72] text-white border-[#fe3c72] shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-white"></span>
              Banco Cora
              {!hasCoraCredentials() ? (
                <Badge className="bg-amber-100 text-amber-900 text-[9px] px-1 py-0 h-4 border border-amber-300 font-bold">
                  Requer Credenciais
                </Badge>
              ) : activeGateway === 'cora' ? (
                <Badge className="bg-white/20 hover:bg-white/30 text-white text-[9px] px-1 py-0 h-4">
                  Principal
                </Badge>
              ) : null}
            </button>

            {/* Sicoob */}
            <button
              type="button"
              onClick={() => handleSelectBankView('sicoob')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 border ${
                selectedBankView === 'sicoob'
                  ? 'bg-[#003641] text-white border-[#003641] shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#7CB342]"></span>
              Sicoob (756)
              {activeGateway === 'sicoob' && (
                <Badge className="bg-[#7CB342] text-[#003641] text-[9px] px-1 py-0 h-4 font-bold">
                  Principal
                </Badge>
              )}
            </button>

            {/* Bradesco */}
            <button
              type="button"
              onClick={() => handleSelectBankView('bradesco')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 border ${
                selectedBankView === 'bradesco'
                  ? 'bg-[#cc092f] text-white border-[#cc092f] shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-white"></span>
              Bradesco (237)
              {activeGateway === 'bradesco' && (
                <Badge className="bg-white/25 hover:bg-white/35 text-white text-[9px] px-1 py-0 h-4">
                  Principal
                </Badge>
              )}
            </button>
          </div>
        </div>

        {/* Seletor rápido de gateway padrão para emissão */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground whitespace-nowrap hidden md:inline">
            Emissão de Boletos/Pix:
          </span>
          <Select
            value={activeGateway}
            onValueChange={(val: BankingGatewayId) => handleSetActiveGateway(val)}
          >
            <SelectTrigger className="w-[190px] h-8 text-xs bg-slate-50 border-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asaas">
                <span className="flex items-center gap-2 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#6b26d9]"></span>
                  Asaas Bank (Padrão)
                </span>
              </SelectItem>
              <SelectItem value="cora" disabled={!hasCoraCredentials()}>
                <span className="flex items-center gap-2 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#fe3c72]"></span>
                  Banco Cora {hasCoraCredentials() ? '(Padrão)' : '(Requer Credenciais)'}
                </span>
              </SelectItem>
              <SelectItem value="sicoob">
                <span className="flex items-center gap-2 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#003641]"></span>
                  Sicoob - 756 (Padrão)
                </span>
              </SelectItem>
              <SelectItem value="bradesco">
                <span className="flex items-center gap-2 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#cc092f]"></span>
                  Bradesco - 237 (Padrão)
                </span>
              </SelectItem>
              <SelectItem value="inter" disabled>
                <span className="flex items-center gap-2 opacity-50 text-xs">
                  <span className="w-2 h-2 rounded-full bg-orange-400"></span>
                  Banco Inter (Em Breve)
                </span>
              </SelectItem>
              <SelectItem value="itau" disabled>
                <span className="flex items-center gap-2 opacity-50 text-xs">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  Itaú Empresas (Em Breve)
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Conteúdo do Banco Selecionado */}
      {selectedBankView === 'asaas' && <AsaasBankTab />}
      {selectedBankView === 'cora' && <CoraBankTab />}
      {selectedBankView === 'sicoob' && <SicoobBankTab />}
      {selectedBankView === 'bradesco' && <BradescoBankTab />}
    </div>
  );
};
