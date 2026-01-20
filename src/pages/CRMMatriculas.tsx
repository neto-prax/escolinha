import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LeadKanban } from "@/components/crm/LeadKanban";
import { LeadDetailsModal } from "@/components/crm/LeadDetailsModal";
import { NewLeadModal } from "@/components/crm/NewLeadModal";
import { Lead } from "@/components/crm/LeadCard";
import {
  Search,
  Plus,
  Users,
  UserPlus,
  UserCheck,
  UserX,
  Download,
  LayoutGrid,
  List,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useCRMLeads, CRMLead } from "@/hooks/useCRMLeads";

const statusConfig: Record<string, { label: string; color: string }> = {
  new: { label: 'Novo', color: 'bg-blue-500' },
  contacted: { label: 'Contatado', color: 'bg-cyan-500' },
  visit_scheduled: { label: 'Visita Agendada', color: 'bg-yellow-500' },
  visited: { label: 'Visitou', color: 'bg-orange-500' },
  proposal_sent: { label: 'Proposta Enviada', color: 'bg-purple-500' },
  negotiating: { label: 'Em Negociação', color: 'bg-pink-500' },
  enrolled: { label: 'Matriculado', color: 'bg-green-500' },
  lost: { label: 'Perdido', color: 'bg-gray-500' },
};

// Convert CRMLead to Lead format for components
const convertToLead = (crmLead: CRMLead): Lead => ({
  id: crmLead.id,
  guardian_name: crmLead.guardian_name,
  guardian_phone: crmLead.guardian_phone,
  guardian_email: crmLead.guardian_email || undefined,
  student_name: crmLead.student_name,
  student_grade: crmLead.student_grade || undefined,
  status: crmLead.status,
  source: crmLead.source || undefined,
  interest_level: crmLead.interest_level as 'high' | 'medium' | 'low' | undefined,
  next_follow_up: crmLead.next_follow_up || undefined,
  created_at: crmLead.created_at,
});

export default function CRMMatriculas() {
  const navigate = useNavigate();
  const {
    leads: crmLeads,
    sectors,
    isLoading,
    createLead,
    updateLead,
    addActivity,
    convertToEnrollment,
    getActivitiesForLead,
    isCreating,
  } = useCRMLeads();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);

  // Convert CRM leads to Lead format
  const leads = crmLeads.map(convertToLead);

  const filteredLeads = leads.filter(lead => {
    const matchesSearch =
      lead.guardian_name.toLowerCase().includes(search.toLowerCase()) ||
      lead.student_name.toLowerCase().includes(search.toLowerCase()) ||
      lead.guardian_phone.includes(search);

    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    enrolled: leads.filter(l => l.status === 'enrolled').length,
    lost: leads.filter(l => l.status === 'lost').length,
  };

  const handleStatusChange = (leadId: string, newStatus: string) => {
    updateLead({ id: leadId, data: { status: newStatus } });
    // Update local state for immediate feedback
    if (selectedLead?.id === leadId) {
      setSelectedLead({ ...selectedLead, status: newStatus });
    }
  };

  const handleAddActivity = (type: string, description: string) => {
    if (selectedLead) {
      addActivity({ leadId: selectedLead.id, type, description });
    }
  };

  const handleUpdateLead = (data: Partial<Lead>) => {
    if (selectedLead) {
      updateLead({ 
        id: selectedLead.id, 
        data: {
          next_follow_up: data.next_follow_up,
          status: data.status,
        } 
      });
      setSelectedLead({ ...selectedLead, ...data });
    }
  };

  const handleConvertToEnrollment = () => {
    if (selectedLead) {
      convertToEnrollment(selectedLead.id);
      setSelectedLead(null);
    }
  };

  const handleNewLead = (data: any) => {
    createLead({
      guardian_name: data.guardian_name,
      guardian_phone: data.guardian_phone,
      guardian_email: data.guardian_email,
      student_name: data.student_name,
      student_grade: data.student_grade,
      source: data.source,
      interest_level: data.interest_level,
      notes: data.notes,
      sector_id: data.sector_id,
    });
    setShowNewLead(false);
  };

  const handleMessage = (lead: Lead) => {
    navigate('/app/mensagens');
  };

  // Get activities for selected lead
  const selectedLeadActivities = selectedLead 
    ? getActivitiesForLead(selectedLead.id).map(a => ({
        id: a.id,
        activity_type: a.activity_type,
        description: a.description || '',
        created_at: a.created_at,
        user_name: a.user_name || 'Usuário',
      }))
    : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM de Matrículas"
        description="Gerencie leads e funil de matrículas"
      >
        <Button onClick={() => setShowNewLead(true)} disabled={isCreating}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Lead
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total de Leads"
          value={stats.total}
          icon={Users}
        />
        <StatCard
          title="Novos"
          value={stats.new}
          icon={UserPlus}
          description="Aguardando contato"
        />
        <StatCard
          title="Matriculados"
          value={stats.enrolled}
          icon={UserCheck}
          description="Conversões"
        />
        <StatCard
          title="Perdidos"
          value={stats.lost}
          icon={UserX}
          description="Não converteram"
        />
      </div>

      {/* Filters and View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-2 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar leads..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(statusConfig).map(([value, config]) => (
                <SelectItem key={value} value={value}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('kanban')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'kanban' ? (
        <LeadKanban
          leads={filteredLeads}
          onLeadClick={setSelectedLead}
          onLeadCall={(lead) => console.log('Call', lead)}
          onLeadMessage={handleMessage}
          onLeadSchedule={(lead) => console.log('Schedule', lead)}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Responsável</TableHead>
                <TableHead>Aluno</TableHead>
                <TableHead>Série</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Interesse</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum lead encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map(lead => {
                  const status = statusConfig[lead.status] || statusConfig.new;
                  return (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{lead.guardian_name}</p>
                          <p className="text-xs text-muted-foreground">{lead.guardian_phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>{lead.student_name}</TableCell>
                      <TableCell>{lead.student_grade || '-'}</TableCell>
                      <TableCell>
                        <Badge className={cn("text-white", status.color)}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{lead.source || '-'}</TableCell>
                      <TableCell>
                        {lead.interest_level && (
                          <Badge variant={
                            lead.interest_level === 'high' ? 'default' :
                            lead.interest_level === 'medium' ? 'secondary' : 'outline'
                          }>
                            {lead.interest_level === 'high' ? 'Alto' :
                             lead.interest_level === 'medium' ? 'Médio' : 'Baixo'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(lead.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modals */}
      <LeadDetailsModal
        open={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        lead={selectedLead}
        activities={selectedLeadActivities}
        onAddActivity={handleAddActivity}
        onUpdateLead={handleUpdateLead}
        onConvertToEnrollment={handleConvertToEnrollment}
        onMessage={() => selectedLead && handleMessage(selectedLead)}
      />

      <NewLeadModal
        open={showNewLead}
        onClose={() => setShowNewLead(false)}
        onSubmit={handleNewLead}
        sectors={sectors}
      />
    </div>
  );
}
