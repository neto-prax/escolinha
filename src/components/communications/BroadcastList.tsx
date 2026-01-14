import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, Plus, Mail, Users, CheckCircle2, Clock, XCircle, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BroadcastForm } from './BroadcastForm';

interface Broadcast {
  id: string;
  message: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  sent_at: string | null;
  created_at: string;
  class_name: string;
}

export const BroadcastList = () => {
  const { school, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    if (school?.id) {
      fetchBroadcasts();
    }
  }, [school?.id]);

  const fetchBroadcasts = async () => {
    if (!school?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('broadcast_logs')
        .select(`
          id,
          message,
          status,
          total_recipients,
          sent_count,
          failed_count,
          sent_at,
          created_at,
          classes:class_id(name)
        `)
        .eq('school_id', school.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formattedData = (data || []).map(b => ({
        id: b.id,
        message: b.message,
        status: b.status || 'pending',
        total_recipients: b.total_recipients || 0,
        sent_count: b.sent_count || 0,
        failed_count: b.failed_count || 0,
        sent_at: b.sent_at,
        created_at: b.created_at,
        class_name: (b.classes as any)?.name || 'Turma não encontrada',
      }));

      setBroadcasts(formattedData);
    } catch (error) {
      console.error('Error fetching broadcasts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return (
          <Badge variant="secondary" className="badge-success gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Enviado
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="border-warning text-warning gap-1">
            <Clock className="h-3 w-3" />
            Pendente
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Falhou
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            {status}
          </Badge>
        );
    }
  };

  const filteredBroadcasts = broadcasts.filter(b =>
    b.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.class_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar comunicados..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Comunicado
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredBroadcasts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg mb-1">Nenhum comunicado</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Envie seu primeiro comunicado para os responsáveis
            </p>
            <Button onClick={() => setIsFormOpen(true)}>
              <Send className="mr-2 h-4 w-4" />
              Criar Comunicado
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[500px]">
          <div className="space-y-4">
            {filteredBroadcasts.map((broadcast) => (
              <Card key={broadcast.id} className="card-interactive">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base line-clamp-1">
                        {broadcast.message.substring(0, 50)}
                        {broadcast.message.length > 50 && '...'}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Badge variant="outline">{broadcast.class_name}</Badge>
                        <span>•</span>
                        <span>
                          {format(new Date(broadcast.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </CardDescription>
                    </div>
                    {getStatusBadge(broadcast.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {broadcast.message}
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{broadcast.total_recipients} destinatários</span>
                    </div>
                    {broadcast.status === 'sent' && (
                      <>
                        <div className="flex items-center gap-1 text-success">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{broadcast.sent_count} enviados</span>
                        </div>
                        {broadcast.failed_count > 0 && (
                          <div className="flex items-center gap-1 text-destructive">
                            <XCircle className="h-4 w-4" />
                            <span>{broadcast.failed_count} falhas</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      <BroadcastForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSuccess={fetchBroadcasts}
      />
    </div>
  );
};
