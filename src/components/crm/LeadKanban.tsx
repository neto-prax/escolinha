import { useState } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { LeadCard, Lead } from "./LeadCard";
import { cn } from "@/lib/utils";

interface LeadKanbanProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onLeadCall: (lead: Lead) => void;
  onLeadMessage: (lead: Lead) => void;
  onLeadSchedule: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatus: string) => void;
}

const columns = [
  { id: 'new', label: 'Novos', color: 'bg-blue-500' },
  { id: 'contacted', label: 'Contatados', color: 'bg-cyan-500' },
  { id: 'visit_scheduled', label: 'Visita Agendada', color: 'bg-yellow-500' },
  { id: 'visited', label: 'Visitou', color: 'bg-orange-500' },
  { id: 'proposal_sent', label: 'Proposta Enviada', color: 'bg-purple-500' },
  { id: 'negotiating', label: 'Em Negociação', color: 'bg-pink-500' },
  { id: 'enrolled', label: 'Matriculado', color: 'bg-green-500' },
  { id: 'lost', label: 'Perdido', color: 'bg-gray-500' },
];

export function LeadKanban({
  leads,
  onLeadClick,
  onLeadCall,
  onLeadMessage,
  onLeadSchedule,
  onStatusChange,
}: LeadKanbanProps) {
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedLead(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDrop = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (draggedLead && draggedLead.status !== columnId) {
      onStatusChange(draggedLead.id, columnId);
    }
    setDraggedLead(null);
    setDragOverColumn(null);
  };

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 p-4 min-w-max">
        {columns.map(column => {
          const columnLeads = leads.filter(l => l.status === column.id);
          const isOver = dragOverColumn === column.id;

          return (
            <div
              key={column.id}
              className={cn(
                "w-72 shrink-0 rounded-lg bg-muted/50 transition-colors",
                isOver && "bg-accent"
              )}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className="p-3 border-b">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", column.color)} />
                  <h3 className="font-medium text-sm">{column.label}</h3>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {columnLeads.length}
                  </span>
                </div>
              </div>

              <ScrollArea className="h-[calc(100vh-280px)]">
                <div className="p-2 space-y-2">
                  {columnLeads.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Nenhum lead
                    </p>
                  ) : (
                    columnLeads.map(lead => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead)}
                        onDragEnd={handleDragEnd}
                      >
                        <LeadCard
                          lead={lead}
                          onClick={() => onLeadClick(lead)}
                          onCall={() => onLeadCall(lead)}
                          onMessage={() => onLeadMessage(lead)}
                          onSchedule={() => onLeadSchedule(lead)}
                          isDragging={draggedLead?.id === lead.id}
                        />
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
