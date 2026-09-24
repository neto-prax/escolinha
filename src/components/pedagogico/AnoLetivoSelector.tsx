import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar, RotateCcw } from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface AnoLetivoSelectorProps {
  anoAtivo?: string;
  onAnoChange?: (ano: string) => void;
  showTodosOption?: boolean;
  className?: string;
  size?: 'sm' | 'default';
}

export const AnoLetivoSelector: React.FC<AnoLetivoSelectorProps> = ({
  anoAtivo,
  onAnoChange,
  showTodosOption = true,
  className = '',
  size = 'default',
}) => {
  const currentYear = new Date().getFullYear(); // 2026
  const [storedAno, setStoredAno] = useLocalStorage<string>(
    'escolinha_ano_letivo_ativo',
    String(currentYear)
  );

  const selectedAno = anoAtivo !== undefined ? anoAtivo : storedAno;

  const handleSelectAno = (newAno: string) => {
    if (anoAtivo === undefined) {
      setStoredAno(newAno);
    }
    if (onAnoChange) {
      onAnoChange(newAno);
    }
  };

  const handleStep = (delta: number) => {
    const numeric = parseInt(selectedAno === 'todos' ? String(currentYear) : selectedAno, 10) || currentYear;
    const nextAno = String(numeric + delta);
    handleSelectAno(nextAno);
  };

  // Gerar lista de anos para o dropdown (ex: 2023 a 2030)
  const anosDisponiveis = [
    String(currentYear - 3), // 2023
    String(currentYear - 2), // 2024
    String(currentYear - 1), // 2025
    String(currentYear),     // 2026
    String(currentYear + 1), // 2027
    String(currentYear + 2), // 2028
    String(currentYear + 3), // 2029
    String(currentYear + 4), // 2030
  ];

  // Garante que o ano selecionado esteja na lista se for um ano customizado
  if (selectedAno !== 'todos' && !anosDisponiveis.includes(selectedAno)) {
    anosDisponiveis.push(selectedAno);
    anosDisponiveis.sort();
  }

  const isCurrentYear = selectedAno === String(currentYear);
  const isCompact = size === 'sm';

  return (
    <div
      data-tour="ano-selector"
      className={`inline-flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm ${className}`}
    >
      {/* Botão Retroagir Ano (<) */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-slate-600 dark:text-slate-300 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition-colors"
        onClick={() => handleStep(-1)}
        title="Retroagir para o ano anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Seletor do Ano com Dropdown */}
      <div className="flex items-center gap-1.5 px-1.5">
        <Calendar size={15} className="text-purple-600 shrink-0" />
        <Select value={selectedAno} onValueChange={handleSelectAno}>
          <SelectTrigger className="h-8 border-0 bg-transparent shadow-none px-1 text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800 rounded-md focus:ring-0 w-auto min-w-[100px] cursor-pointer">
            <SelectValue placeholder="Ano Letivo">
              {selectedAno === 'todos' ? 'Todos os Anos' : `Ano ${selectedAno}`}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="text-xs">
            {showTodosOption && (
              <SelectItem value="todos" className="text-xs font-medium">
                Todos os Anos
              </SelectItem>
            )}
            {anosDisponiveis.map((ano) => (
              <SelectItem key={ano} value={ano} className="text-xs font-semibold">
                Ano Letivo {ano} {ano === String(currentYear) ? '(Atual)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isCurrentYear ? (
          <Badge
            variant="outline"
            className="text-[10px] bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 font-semibold px-1.5 py-0 h-5"
          >
            Atual
          </Badge>
        ) : selectedAno !== 'todos' ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleSelectAno(String(currentYear))}
            className="h-5 px-1.5 text-[10px] text-slate-500 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/40 flex items-center gap-1 font-medium rounded"
            title={`Voltar para o ano atual (${currentYear})`}
          >
            <RotateCcw size={10} />
            {currentYear}
          </Button>
        ) : null}
      </div>

      {/* Botão Avançar Ano (>) */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-slate-600 dark:text-slate-300 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition-colors"
        onClick={() => handleStep(1)}
        title="Avançar para o próximo ano"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

