
# Plano: Calendário Escolar com Exportação em PDF

## Resumo
Implementar a funcionalidade completa de calendário escolar na página Pedagógico, incluindo criação de datas importantes, contador de dias letivos em tempo real e exportação do calendário em PDF.

## O Que Será Construído

### 1. Banco de Dados
Criar tabela `school_calendar` para armazenar os eventos do calendário escolar.

### 2. Aba de Calendário no Pedagógico
- Estrutura de abas: "Visão Geral" e "Calendário"
- Contador em tempo real de dias letivos
- Lista de eventos com filtros
- Botão para criar novas datas
- Botão para exportar em PDF

### 3. Exportação em PDF
- Documento formatado com cabeçalho da escola
- Tabela organizada por data
- Resumo de dias letivos
- Download automático

---

## Estrutura Visual

```text
+------------------------------------------+
|  Pedagógico                               |
|  Gestão pedagógica completa              |
+------------------------------------------+
|  [Visão Geral]  [Calendário]             |
+------------------------------------------+
|                                          |
|  +--------+  +--------+  +--------+      |
|  | 200    |  | 85     |  | 15     |      |
|  | Dias   |  | Trans- |  | Feria- |      |
|  | Letivos|  | corridos|  | dos    |      |
|  +--------+  +--------+  +--------+      |
|                                          |
|  [+ Nova Data]  [Exportar PDF]           |
|                                          |
|  +--------------------------------------+|
|  | Data    | Título       | Tipo | Afeta||
|  |---------|--------------|------|------||
|  | 01/01   | Ano Novo     | Fer. | Sim  ||
|  | 20/02   | Carnaval     | Rec. | Sim  ||
|  | 15/03   | Reunião Pais | Evnt | Não  ||
|  +--------------------------------------+|
+------------------------------------------+
```

---

## Detalhes Tecnicos

### Migração do Banco de Dados

```sql
CREATE TABLE public.school_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date,
  event_type text NOT NULL DEFAULT 'event',
  affects_school_days boolean DEFAULT false,
  year integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.school_calendar ENABLE ROW LEVEL SECURITY;

-- Diretores e secretários podem gerenciar
CREATE POLICY "Directors and secretary can manage calendar"
  ON public.school_calendar FOR ALL
  USING (is_director(auth.uid(), school_id) 
    OR has_role(auth.uid(), 'secretary', school_id));

-- Todos da escola podem visualizar
CREATE POLICY "Users can view school calendar"
  ON public.school_calendar FOR SELECT
  USING (school_id = get_user_school_id(auth.uid()));
```

### Dependência a Instalar
- `jspdf` - Biblioteca para geração de PDFs
- `jspdf-autotable` - Plugin para criar tabelas formatadas

### Componentes a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/pedagogico/SchoolCalendarTab.tsx` | Componente principal da aba calendário |
| `src/components/pedagogico/CalendarEventModal.tsx` | Modal para criar/editar eventos |
| `src/components/pedagogico/CalendarStats.tsx` | Cards com estatísticas de dias letivos |

### Modificar Arquivo Existente

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/Pedagogico.tsx` | Adicionar estrutura de Tabs com abas "Visão Geral" e "Calendário" |

### Tipos de Eventos Suportados

| Tipo | Cor | Descrição |
|------|-----|-----------|
| holiday | Vermelho | Feriados nacionais/locais |
| recess | Laranja | Recesso escolar |
| event | Azul | Eventos da escola |
| meeting | Roxo | Reuniões pedagógicas |
| special | Verde | Dias letivos especiais (sábado letivo) |

### Lógica de Cálculo de Dias Letivos

```typescript
// Usando date-fns
const calculateSchoolDays = (year: number, events: CalendarEvent[]) => {
  // 1. Pegar todos os dias do ano letivo (fev-dez)
  const startDate = new Date(year, 1, 1); // 1 de fevereiro
  const endDate = new Date(year, 11, 20); // 20 de dezembro
  
  // 2. Filtrar apenas dias úteis (seg-sex)
  const allDays = eachDayOfInterval({ start: startDate, end: endDate })
    .filter(day => !isWeekend(day));
  
  // 3. Subtrair feriados e recessos que afetam dias letivos
  const nonSchoolDays = events
    .filter(e => e.affects_school_days)
    .flatMap(e => eachDayOfInterval({ 
      start: new Date(e.start_date), 
      end: new Date(e.end_date || e.start_date) 
    }));
  
  // 4. Adicionar sábados letivos
  const specialDays = events
    .filter(e => e.event_type === 'special' && !e.affects_school_days);
  
  return allDays.length - nonSchoolDays.length + specialDays.length;
};
```

### Função de Exportação PDF

```typescript
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const handleExportCalendarPDF = () => {
  const doc = new jsPDF();
  
  // Cabeçalho
  doc.setFontSize(18);
  doc.text(`Calendário Escolar ${selectedYear}`, 14, 22);
  doc.setFontSize(10);
  doc.text(`Escola: ${school?.name}`, 14, 30);
  doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 14, 38);
  
  // Resumo
  doc.setFontSize(12);
  doc.text(`Total de Dias Letivos: ${totalSchoolDays}`, 14, 50);
  
  // Tabela de eventos
  autoTable(doc, {
    startY: 60,
    head: [['Data Início', 'Data Fim', 'Título', 'Tipo', 'Afeta Dias Letivos']],
    body: events.map(e => [
      format(new Date(e.start_date), 'dd/MM/yyyy'),
      e.end_date ? format(new Date(e.end_date), 'dd/MM/yyyy') : '-',
      e.title,
      eventTypeLabels[e.event_type],
      e.affects_school_days ? 'Sim' : 'Não'
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [59, 130, 246] }
  });
  
  doc.save(`calendario_escolar_${selectedYear}.pdf`);
  toast.success('Calendário exportado com sucesso!');
};
```

---

## Sequência de Implementação

1. Criar migração da tabela `school_calendar`
2. Instalar dependências `jspdf` e `jspdf-autotable`
3. Criar componente `CalendarStats.tsx` com os contadores
4. Criar componente `CalendarEventModal.tsx` para criar/editar eventos
5. Criar componente `SchoolCalendarTab.tsx` com lista e exportação PDF
6. Modificar `Pedagogico.tsx` para usar estrutura de Tabs
