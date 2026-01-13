import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

interface AutomationConfig {
  sector_selection_enabled: boolean;
  sector_selection_message: string;
  enabled_sectors: string[];
}

const DEFAULT_MESSAGE = `Olá! 👋 Bem-vindo(a) à nossa escola!

Para melhor atendê-lo(a), por favor escolha o setor desejado:

{SECTORS_LIST}

Digite o número correspondente ao setor.`;

export function AutomationSettings() {
  const { school } = useAuth();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

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
      } as AutomationConfig;
    },
    enabled: !!school?.id,
  });

  const [config, setConfig] = useState<AutomationConfig | null>(null);

  // Initialize config when data loads
  useState(() => {
    if (automationConfig && !config) {
      setConfig(automationConfig);
    }
  });

  const currentConfig = config || automationConfig || {
    sector_selection_enabled: false,
    sector_selection_message: DEFAULT_MESSAGE,
    enabled_sectors: [],
  };

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
          sector_selection_enabled: currentConfig.sector_selection_enabled,
          sector_selection_message: currentConfig.sector_selection_message,
          enabled_sectors: currentConfig.enabled_sectors,
        },
      };

      const { error } = await supabase
        .from('schools')
        .update({ settings: newSettings as unknown as Record<string, never> })
        .eq('id', school.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['automation-config'] });
      toast.success('Configurações de automação salvas!');
    } catch (error) {
      console.error('Error saving automation config:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSector = (sectorId: string) => {
    const newEnabledSectors = currentConfig.enabled_sectors.includes(sectorId)
      ? currentConfig.enabled_sectors.filter(id => id !== sectorId)
      : [...currentConfig.enabled_sectors, sectorId];
    
    setConfig({
      ...currentConfig,
      enabled_sectors: newEnabledSectors,
    });
  };

  const updateConfig = (updates: Partial<AutomationConfig>) => {
    setConfig({
      ...currentConfig,
      ...updates,
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
  const sectorsPreview = currentConfig.enabled_sectors
    .map((sectorId, index) => {
      const sector = sectors.find(s => s.id === sectorId);
      return sector ? `${index + 1}. ${sector.name}` : null;
    })
    .filter(Boolean)
    .join('\n');

  const previewMessage = currentConfig.sector_selection_message.replace(
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
              checked={currentConfig.sector_selection_enabled}
              onCheckedChange={(checked) => updateConfig({ sector_selection_enabled: checked })}
            />
          </div>

          {currentConfig.sector_selection_enabled && (
            <>
              <div className="space-y-3">
                <Label>Setores disponíveis para seleção</Label>
                <p className="text-sm text-muted-foreground">
                  Selecione quais setores aparecerão como opção para o contato
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {sectors.map((sector) => (
                    <div
                      key={sector.id}
                      className="flex items-center space-x-2 rounded-md border p-3"
                    >
                      <Checkbox
                        id={`sector-${sector.id}`}
                        checked={currentConfig.enabled_sectors.includes(sector.id)}
                        onCheckedChange={() => toggleSector(sector.id)}
                      />
                      <Label
                        htmlFor={`sector-${sector.id}`}
                        className="flex-1 cursor-pointer font-normal"
                      >
                        {sector.name}
                      </Label>
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
                  value={currentConfig.sector_selection_message}
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
