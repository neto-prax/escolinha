import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Users,
  MessageSquare,
  Clock,
  Shield,
  CheckCircle2,
  Trash2,
  Edit,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useWhatsAppInbox } from '@/hooks/useWhatsAppInbox';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function WhatsAppSectorsTab({ onSelectSectorForChat }: { onSelectSectorForChat?: (sectorId: string) => void }) {
  const { allAvailableSectors, allConversations } = useWhatsAppInbox();
  const { school } = useAuth();

  const [modalOpen, setModalOpen] = useState(false);
  const [sectorName, setSectorName] = useState('');
  const [sectorDescription, setSectorDescription] = useState('');

  // Calculate sector metrics
  const sectorMetrics = allAvailableSectors.map((sector) => {
    const convsInSector = allConversations.filter((c) => c.sector_id === sector.id);
    const openConvs = convsInSector.filter((c) => c.ticket_status === 'open');
    const pendingConvs = convsInSector.filter((c) => c.ticket_status === 'pending');

    return {
      ...sector,
      totalConvs: convsInSector.length,
      openConvs: openConvs.length,
      pendingConvs: pendingConvs.length,
    };
  });

  const handleCreateSector = async () => {
    if (!sectorName.trim()) return;

    try {
      if (school?.id) {
        const { error } = await supabase.from('sectors').insert({
          name: sectorName.trim(),
          description: sectorDescription.trim() || null,
          school_id: school.id,
          is_active: true,
        });

        if (error) throw error;
        toast.success(`Setor "${sectorName}" cadastrado no banco de dados!`);
      } else {
        toast.success(`Setor "${sectorName}" criado com sucesso!`);
      }

      setModalOpen(false);
      setSectorName('');
      setSectorDescription('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar setor');
    }
  };

  return (
    <div className="space-y-6">
      {/* ---------------- CABEÇALHO DA ABA ---------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Setores & Filas de Atendimento
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie os departamentos da escola para roteamento automatizado de mensagens e triagem de chamados.
          </p>
        </div>

        <Button size="sm" onClick={() => setModalOpen(true)} className="gap-1.5 text-xs">
          <Plus className="w-4 h-4" />
          Novo Setor
        </Button>
      </div>

      {/* ---------------- GRID DE SETORES ---------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sectorMetrics.map((sec) => (
          <Card key={sec.id} className="relative overflow-hidden hover:shadow-md transition-shadow">
            <div className="h-1.5 w-full bg-primary/80" />
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    {sec.name}
                  </CardTitle>
                  <CardDescription className="text-xs mt-1 line-clamp-2">
                    {sec.description || 'Sem descrição cadastrada.'}
                  </CardDescription>
                </div>

                <Badge
                  variant={sec.is_active ? 'default' : 'secondary'}
                  className="text-[10px] h-5"
                >
                  {sec.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Métricas do Setor */}
              <div className="grid grid-cols-3 gap-2 text-center p-2.5 rounded-lg bg-muted/40 border">
                <div>
                  <span className="text-xs text-muted-foreground block">Conversas</span>
                  <span className="text-sm font-bold text-foreground">{sec.totalConvs}</span>
                </div>
                <div>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 block">Abertas</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {sec.openConvs}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-amber-600 dark:text-amber-400 block">Pendentes</span>
                  <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
                    {sec.pendingConvs}
                  </span>
                </div>
              </div>

              {/* Ação de Abrir Inbox Filtrado */}
              {onSelectSectorForChat && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs gap-1.5 h-8"
                  onClick={() => onSelectSectorForChat(sec.id)}
                >
                  <MessageSquare className="w-3.5 h-3.5 text-primary" />
                  Ver Conversas deste Setor
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ---------------- MODAL DE CRIAÇÃO DE SETOR ---------------- */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Cadastrar Novo Setor Escolar
            </DialogTitle>
            <DialogDescription className="text-xs">
              Crie uma nova fila departamental para receber atendimentos dos pais e responsáveis via WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Nome do Setor</label>
              <Input
                value={sectorName}
                onChange={(e) => setSectorName(e.target.value)}
                placeholder="Ex: Biblioteca / Apoio Escolar"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Descrição e Atribuições</label>
              <Input
                value={sectorDescription}
                onChange={(e) => setSectorDescription(e.target.value)}
                placeholder="Ex: Empréstimo de livros, leitura e reforço"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCreateSector}>
              Criar Setor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
