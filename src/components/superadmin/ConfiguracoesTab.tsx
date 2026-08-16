import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export function ConfiguracoesTab() {
  const [cupomComissao, setCupomComissao] = useLocalStorage('escolinha_cupom_comissao', '');
  const [periodoTeste, setPeriodoTeste] = useLocalStorage('escolinha_periodo_teste', 7);

  const [tempCupom, setTempCupom] = useState(cupomComissao);
  const [tempPeriodo, setTempPeriodo] = useState(periodoTeste);

  const handleSave = () => {
    setCupomComissao(tempCupom);
    setPeriodoTeste(tempPeriodo);
    toast.success('Configurações salvas com sucesso!');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações Financeiras</CardTitle>
          <CardDescription>
            Gerencie as opções de comissão e período de teste da plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-xl">
          <div className="space-y-2">
            <Label htmlFor="cupom">Cupom para Comissão</Label>
            <Input 
              id="cupom" 
              placeholder="Ex: PROMO20" 
              value={tempCupom}
              onChange={(e) => setTempCupom(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Insira o código do cupom que os afiliados usarão para receber comissão.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="teste">Período de Teste Grátis (em dias)</Label>
            <Input 
              id="teste" 
              type="number" 
              min="0"
              placeholder="Ex: 7" 
              value={tempPeriodo}
              onChange={(e) => setTempPeriodo(Number(e.target.value))}
            />
            <p className="text-sm text-muted-foreground">
              Define a quantidade de dias do período de teste gratuito para novos usuários.
            </p>
          </div>

          <Button onClick={handleSave} className="mt-4">
            <Save className="mr-2 h-4 w-4" />
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
