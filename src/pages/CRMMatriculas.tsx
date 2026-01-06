import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Filter,
  Download,
  LayoutGrid,
  List,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

// Mock data
const mockSectors = [
  { id: '1', name: 'Secretaria' },
  { id: '2', name: 'Comercial' },
];

const mockLeads: Lead[] = [
  {
    id: '1',
    guardian_name: 'Maria Fernanda Costa',
    guardian_phone: '5511999999999',
    guardian_email: 'maria@email.com',
    student_name: 'Pedro Costa',
    student_grade: '1º Ano',
    status: 'new',
    source: 'Site',
    interest_level: 'high',
    next_follow_up: new Date(Date.now() + 86400000).toISOString(),
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: '2',
    guardian_name: 'João Silva',
    guardian_phone: '5511988888888',
    student_name: 'Ana Silva',
    student_grade: '3º Ano',
    status: 'contacted',
    source: 'Indicação',
    interest_level: 'medium',
    next_follow_up: new Date(Date.now() + 172800000).toISOString(),
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: '3',
    guardian_name: 'Carla Oliveira',
    guardian_phone: '5511977777777',
    guardian_email: 'carla@email.com',
    student_name: 'Lucas Oliveira',
    student_grade: 'Maternal II',
    status: 'visit_scheduled',
    source: 'Redes Sociais',
    interest_level: 'high',
    next_follow_up: new Date(Date.now() + 259200000).toISOString(),
    created_at: new Date(Date.now() - 259200000).toISOString(),
  },
  {
    id: '4',
    guardian_name: 'Roberto Santos',
    guardian_phone: '5511966666666',
    student_name: 'Julia Santos',
    student_grade: '5º Ano',
    status: 'visited',
    source: 'Google',
    interest_level: 'high',
    created_at: new Date(Date.now() - 345600000).toISOString(),
  },
  {
    id: '5',
    guardian_name: 'Ana Paula Lima',
    guardian_phone: '5511955555555',
    student_name: 'Gabriel Lima',
    student_grade: '2º Ano',
    status: 'proposal_sent',
    source: 'Indicação',
    interest_level: 'medium',
    created_at: new Date(Date.now() - 432000000).toISOString(),
  },
  {
    id: '6',
    guardian_name: 'Fernando Alves',
    guardian_phone: '5511944444444',
    student_name: 'Marina Alves',
    student_grade: 'Pré II',
    status: 'negotiating',
    source: 'Site',
    interest_level: 'high',
    created_at: new Date(Date.now() - 518400000).toISOString(),
  },
  {
    id: '7',
    guardian_name: 'Patricia Mendes',
    guardian_phone: '5511933333333',
    student_name: 'Thiago Mendes',
    student_grade: '4º Ano',
    status: 'enrolled',
    source: 'Evento',
    interest_level: 'high',
    created_at: new Date(Date.now() - 604800000).toISOString(),
  },
  {
    id: '8',
    guardian_name: 'Ricardo Souza',
    guardian_phone: '5511922222222',
    student_name: 'Beatriz Souza',
    student_grade: '1º Ano',
    status: 'lost',
    source: 'Google',
    interest_level: 'low',
    created_at: new Date(Date.now() - 691200000).toISOString(),
  },
];

const mockActivities = [
  {
    id: '1',
    activity_type: 'note',
    description: 'Responsável interessado em matrícula para 2025. Agendada visita para próxima semana.',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    user_name: 'Ana Secretaria',
  },
  {
    id: '2',
    activity_type: 'call',
    description: 'Primeiro contato por telefone. Responsável quer conhecer a estrutura.',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    user_name: 'Ana Secretaria',
  },
];

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

export default function CRMMatriculas() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>(mockLeads);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);

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
    setLeads(prev =>
      prev.map(l =>
        l.id === leadId ? { ...l, status: newStatus } : l
      )
    );
  };

  const handleAddActivity = (type: string, description: string) => {
    // Would save to database
    console.log('Adding activity:', type, description);
  };

  const handleUpdateLead = (data: Partial<Lead>) => {
    if (selectedLead) {
      setLeads(prev =>
        prev.map(l =>
          l.id === selectedLead.id ? { ...l, ...data } : l
        )
      );
      setSelectedLead(prev => prev ? { ...prev, ...data } : null);
    }
  };

  const handleConvertToEnrollment = () => {
    if (selectedLead) {
      handleStatusChange(selectedLead.id, 'enrolled');
      setSelectedLead(null);
      // Would also create student, guardian, and enrollment records
    }
  };

  const handleNewLead = (data: any) => {
    const newLead: Lead = {
      id: Date.now().toString(),
      ...data,
      status: 'new',
      created_at: new Date().toISOString(),
    };
    setLeads(prev => [newLead, ...prev]);
  };

  const handleMessage = (lead: Lead) => {
    // Navigate to messages with the lead
    navigate('/app/mensagens');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM de Matrículas"
        description="Gerencie leads e funil de matrículas"
      >
        <Button onClick={() => setShowNewLead(true)}>
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
        activities={mockActivities}
        onAddActivity={handleAddActivity}
        onUpdateLead={handleUpdateLead}
        onConvertToEnrollment={handleConvertToEnrollment}
        onMessage={() => selectedLead && handleMessage(selectedLead)}
      />

      <NewLeadModal
        open={showNewLead}
        onClose={() => setShowNewLead(false)}
        onSubmit={handleNewLead}
        sectors={mockSectors}
      />
    </div>
  );
}
