import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Bot, MessageSquare } from 'lucide-react';

interface SectorGreeting {
  [sectorId: string]: string;
}

interface AutomationConfig {
  sector_selection_enabled: boolean;
  sector_selection_message: string;
  enabled_sectors: string[];
  sector_greetings: SectorGreeting;
  signature_enabled: boolean;
}

const DEFAULT_MESSAGE = `Olá! 👋 Bem-vindo(a) à nossa escola!

Para melhor atendê-lo(a), por favor escolha o setor desejado:

{SECTORS_LIST}

Digite o número correspondente ao setor.`;

export function AutomationSettings() {
  const { school } = useAuth();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<AutomationConfig>({
    sector_selection_enabled: false,
    sector_selection_message: DEFAULT_MESSAGE,
    enabled_sectors: [],
    sector_greetings: {},
    signature_enabled: true,
  });

  // Fetch sectors
  const { data: sectors = [], isLoading: loadingSectors } = useQuery({
    queryKey: ['sectors', school?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sectors')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!school?.id,
  });

  // Fetch current automation settings from school settings
  const { data: automationConfig, isLoading: loadingConfig } = useQuery({
    queryKey: ['automation-config', school?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('schools')
        .select('settings')
        .eq('id', school?.id)
        .single();
      
      if (error) throw error;
      
      const settings = data?.settings as Record<string, unknown> | null;
      const automation = settings?.automation as AutomationConfig | undefined;
      
      return {
        sector_selection_enabled: automation?.sector_selection_enabled ?? false,
        sector_selection_message: automation?.sector_selection_message ?? DEFAULT_MESSAGE,
        enabled_sectors: automation?.enabled_sectors ?? [],
        sector_greetings: automation?.sector_greetings ?? {},
        signature_enabled: automation?.signature_enabled ?? true,
      } as AutomationConfig;
    },
    enabled: !!school?.id,
  });

  // Initialize config when data loads
  useEffect(() => {
    if (automationConfig) {
      setConfig(automationConfig);
    }
  }, [automationConfig]);

  const handleSave = async () => {
    if (!school?.id) return;
    
    setIsSaving(true);
    try {
      // Get current settings
      const { data: currentSchool } = await supabase
        .from('schools')
        .select('settings')
        .eq('id', school.id)
        .single();

      const currentSettings = (currentSchool?.settings as Record<string, unknown>) || {};
      
      // Update with new automation config
      const newSettings = {
        ...currentSettings,
        automation: {
          sector_selection_enabled: config.sector_selection_enabled,
          sector_selection_message: config.sector_selection_message,
          enabled_sectors: config.enabled_sectors,
          sector_greetings: config.sector_greetings,
          signature_enabled: config.signature_enabled,
        },
      };

      const { error } = await supabase
        .from('schools')
        .update({ settings: newSettings as unknown as Record<string, never> })
        .eq('id', school.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['automation-config'] });
      toast.success('Configurações de automação salvas!');
    } catch (err) {
      console.error('Error saving automation config:', err);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSector = (sectorId: string) => {
    const newEnabledSectors = config.enabled_sectors.includes(sectorId)
      ? config.enabled_sectors.filter(id => id !== sectorId)
      : [...config.enabled_sectors, sectorId];
    
    setConfig({
      ...config,
      enabled_sectors: newEnabledSectors,
    });
  };

  const updateConfig = (updates: Partial<AutomationConfig>) => {
    setConfig({
      ...config,
      ...updates,
    });
  };

  const updateSectorGreeting = (sectorId: string, greeting: string) => {
    setConfig({
      ...config,
      sector_greetings: {
        ...config.sector_greetings,
        [sectorId]: greeting,
      },
    });
  };

  if (loadingSectors || loadingConfig) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Generate preview of sectors list
  const sectorsPreview = config.enabled_sectors
    .map((sectorId, index) => {
      const sector = sectors.find(s => s.id === sectorId);
      return sector ? `${index + 1}. ${sector.name}` : null;
    })
    .filter(Boolean)
    .join('\n');

  const previewMessage = config.sector_selection_message.replace(
    '{SECTORS_LIST}',
    sectorsPreview || '(Nenhum setor selecionado)'
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Seleção de Setor Automática
          </CardTitle>
          <CardDescription>
            Configure uma mensagem automática para novos contatos escolherem o setor de atendimento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sector-selection">Ativar seleção de setor</Label>
              <p className="text-sm text-muted-foreground">
                Enviar mensagem automática perguntando qual setor o contato deseja
              </p>
            </div>
            <Switch
              id="sector-selection"
              checked={config.sector_selection_enabled}
              onCheckedChange={(checked) => updateConfig({ sector_selection_enabled: checked })}
            />
          </div>

          {config.sector_selection_enabled && (
            <>
              <div className="space-y-3">
                <Label>Setores disponíveis para seleção</Label>
                <p className="text-sm text-muted-foreground">
                  Selecione quais setores aparecerão como opção para o contato e configure a saudação de cada um
                </p>
                <div className="space-y-3">
                  {sectors.map((sector) => (
                    <div
                      key={sector.id}
                      className="rounded-md border p-3 space-y-3"
                    >
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`sector-${sector.id}`}
                          checked={config.enabled_sectors.includes(sector.id)}
                          onCheckedChange={() => toggleSector(sector.id)}
                        />
                        <Label
                          htmlFor={`sector-${sector.id}`}
                          className="flex-1 cursor-pointer font-medium"
                        >
                          {sector.name}
                        </Label>
                      </div>
                      {config.enabled_sectors.includes(sector.id) && (
                        <div className="pl-6 space-y-2">
                          <Label htmlFor={`greeting-${sector.id}`} className="text-sm text-muted-foreground">
                            Mensagem de saudação ao entrar neste setor
                          </Label>
                          <Textarea
                            id={`greeting-${sector.id}`}
                            rows={2}
                            value={config.sector_greetings[sector.id] || ''}
                            onChange={(e) => updateSectorGreeting(sector.id, e.target.value)}
                            placeholder={`Ex: Olá! Você está falando com o setor de ${sector.name}. Como posso ajudar?`}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="message">Mensagem de boas-vindas</Label>
                <p className="text-sm text-muted-foreground">
                  Use {'{SECTORS_LIST}'} para inserir a lista de setores numerada
                </p>
                <Textarea
                  id="message"
                  rows={6}
                  value={config.sector_selection_message}
                  onChange={(e) => updateConfig({ sector_selection_message: e.target.value })}
                  placeholder={DEFAULT_MESSAGE}
                />
              </div>

              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Pré-visualização
                </Label>
                <div className="rounded-lg bg-muted p-4 whitespace-pre-wrap text-sm">
                  {previewMessage}
                </div>
              </div>
            </>
          )}

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="signature">Assinatura nas mensagens</Label>
                <p className="text-sm text-muted-foreground">
                  Adicionar nome do atendente em negrito antes de cada mensagem enviada
                </p>
                <p className="text-xs text-muted-foreground">
                  Formato: <span className="font-mono">*Nome do Atendente:*</span> seguido da mensagem
                </p>
              </div>
              <Switch
                id="signature"
                checked={config.signature_enabled}
                onCheckedChange={(checked) => updateConfig({ signature_enabled: checked })}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Configurações
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
