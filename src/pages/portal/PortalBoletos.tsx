import { useOutletContext } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGuardianStudents, useStudentBilling } from '@/hooks/useGuardianPortal';
import { Loader2, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', variant: 'outline' },
  paid: { label: 'Pago', variant: 'secondary' },
  overdue: { label: 'Atrasado', variant: 'destructive' },
  cancelled: { label: 'Cancelado', variant: 'default' },
};

const PortalBoletos = () => {
  const { portalAccess } = useOutletContext<any>();
  const guardianId = portalAccess?.guardian_id;
  const { data: students, isLoading: loadingStudents } = useGuardianStudents(guardianId);

  const studentIds = students?.map((s: any) => s.id) || [];

  const { data: billing, isLoading: loadingBilling } = useQuery({
    queryKey: ['guardian-all-billing', guardianId, studentIds],
    queryFn: async () => {
      if (!studentIds.length) return [];
      const { data, error } = await supabase
        .from('billing')
        .select('*, students(full_name)')
        .or(`guardian_id.eq.${guardianId},student_id.in.(${studentIds.join(',')})`)
        .order('due_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!guardianId && studentIds.length > 0,
  });

  const isLoading = loadingStudents || loadingBilling;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Boletos</h1>
        <p className="text-muted-foreground">Cobranças e pagamentos</p>
      </div>

      {!billing?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum boleto encontrado.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {billing.map((bill: any) => {
            const st = statusMap[bill.status] || { label: bill.status, variant: 'outline' as const };
            return (
              <Card key={bill.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{bill.description}</span>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(bill.students as any)?.full_name} • Vencimento:{' '}
                        {format(new Date(bill.due_date), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <span className="font-semibold text-sm whitespace-nowrap">
                      R$ {Number(bill.amount).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PortalBoletos;
