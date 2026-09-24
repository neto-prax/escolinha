import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  Compass,
} from 'lucide-react';
import { toast } from 'sonner';

export interface TutorialStep {
  target: string; // Seletor CSS, ex: '[data-tour="ano-selector"]'
  title: string;
  content: string;
  actionHint?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
}

export const TURMAS_TUTORIAL_STEPS: TutorialStep[] = [
  {
    target: '[data-tour="ano-selector"]',
    title: '1. Seletor de Ano Letivo',
    content:
      'Neste controle você escolhe o ano letivo ativo. Use as setas (< e >) para retroagir ou avançar os anos, ou clique no ano para escolher qualquer período de 2023 até 2030.',
    actionHint:
      'Dica: Ao avançar para anos futuros (ex: 2027), você poderá planejar novas turmas ou copiar as turmas de 2026 com 1 clique.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="btn-sync"]',
    title: '2. Sincronizar Alunos & Turmas',
    content:
      'Clique aqui para padronizar todas as séries do Berçário ao Ensino Médio com a Turma A padrão. Alunos antigos com dados legados são normalizados automaticamente sem perda de informação.',
    actionHint:
      'Como agir: Sempre que importar novos alunos ou cadastrar classes, clique para manter tudo alinhado ao padrão.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="btn-nova-turma"]',
    title: '3. Criar Nova Turma',
    content:
      'Abra este modal para cadastrar uma nova turma. Você pode definir o nome, turno de aulas (Matutino, Vespertino, Integral), valor da mensalidade e limite de vagas.',
    actionHint:
      'Como agir: O ano letivo da nova turma já virá pré-preenchido com o ano que você estiver navegando.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="filtros-busca"]',
    title: '4. Filtros e Busca Rápida',
    content:
      'Filtre as turmas por nome, professor regente ou número da sala. Você também pode filtrar por segmento específico (Educação Infantil, Fundamental 1, Fundamental 2 ou Ensino Médio).',
    actionHint:
      'Como agir: Digite para encontrar rapidamente qualquer turma da instituição.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="card-turma"]',
    title: '5. Card da Turma & Ocupação',
    content:
      'Cada card exibe os detalhes individuais da turma: valor da mensalidade, turno, sala e o percentual de ocupação em tempo real (alunos matriculados vs vagas disponíveis).',
    actionHint:
      'Como agir: Acompanhe a lotação das salas pelas cores da barra (verde, amarelo e vermelho).',
    placement: 'top',
  },
  {
    target: '[data-tour="btn-turma-b"]',
    title: '6. Adicionar Turma B / Seção Adicional',
    content:
      'Sua turma lotou ou precisa de mais uma turma para a mesma série? Clique neste botão para criar a Turma B (ou Turma C) instantaneamente com apenas 1 clique.',
    actionHint:
      'Como agir: O sistema registra a nova turma pedagógica e atualiza as classes globais na mesma hora.',
    placement: 'top',
  },
  {
    target: '[data-tour="btn-ver-alunos"]',
    title: '7. Ver Alunos da Turma & WhatsApp',
    content:
      'Clique em "Ver Alunos" para abrir o painel com todos os alunos matriculados nesta turma. Você terá acesso aos contatos, link direto para conversar no WhatsApp e botão de transferência rápida.',
    actionHint:
      'Como agir: Use para consultar dados dos responsáveis e realizar remanejamento de alunos entre turmas.',
    placement: 'top',
  },
  {
    target: '[data-tour="btn-horarios"]',
    title: '8. Grade Horária Semanal',
    content:
      'Clique em "Horários" para acessar a grade semanal interativa: aloque disciplinas, vincule professores, divida horários e configure o intervalo de recreio.',
    actionHint:
      'Como agir: Monte a grade horária completa da turma e gere o cronograma de aulas.',
    placement: 'top',
  },
];

export const PEDAGOGICO_TUTORIAL_STEPS: TutorialStep[] = TURMAS_TUTORIAL_STEPS;

export const MATRICULA_TUTORIAL_STEPS: TutorialStep[] = [
  {
    target: '[data-tour="btn-novo-aluno"]',
    title: '1. Nova Matrícula / Cadastrar Aluno',
    content:
      'Clique neste botão para abrir a ficha completa de matrícula. Você poderá cadastrar os dados do aluno, certidão de nascimento, endereço, fotos, responsáveis financeiro e pedagógico.',
    actionHint:
      'Como agir: Clique para registrar uma matrícula individual no sistema.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="btn-importar-alunos"]',
    title: '2. Matrículas em Lote / Excel',
    content:
      'Precisa cadastrar muitos alunos rapidamente? Baixe nossa planilha modelo em Excel, preencha os dados de todos os alunos e clique em "Importar" para criar as matrículas em lote.',
    actionHint:
      'Como agir: Baixe o modelo oficial, cole as informações e importe dezenas de matrículas de uma vez só.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="acoes-lote-alunos"]',
    title: '3. Enturmação e Transferência em Lote',
    content:
      'Selecione um ou vários alunos pelas caixas de seleção da tabela para atribuir a turma ou transferir turmas com apenas 1 clique.',
    actionHint:
      'Como agir: Marque os alunos na tabela e use os botões que surgem no topo para enturmar ou transferir.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="tabela-alunos"]',
    title: '4. Listagem e Gestão de Alunos',
    content:
      'Visualize todos os alunos matriculados. Clique nos títulos das colunas para ordenar por Matrícula, Nome, Responsável ou Enturmação, e use o menu de ações ao final para editar ou gerar documentos.',
    actionHint:
      'Como agir: Localize qualquer aluno e gerencie suas informações cadastrais.',
    placement: 'top',
  },
  {
    target: '[data-tour="abas-alunos"]',
    title: '5. Abas de Contratos e Mensalidades',
    content:
      'Alterne entre a Gestão de Alunos, a visão em árvore de Turmas e Contratos, e a aba de Mensalidades para acompanhar quem já pagou ou está com parcelas em aberto.',
    actionHint:
      'Como agir: Clique nas abas para acompanhar o financeiro das matrículas e a adimplência de cada turma.',
    placement: 'bottom',
  },
];

export const DIARIO_TUTORIAL_STEPS: TutorialStep[] = [
  {
    target: '[data-tour="ano-selector"]',
    title: '1. Ano Letivo do Diário',
    content: 'Selecione o ano letivo correspondente ao diário de classe.',
    actionHint: 'Como agir: Escolha o ano letivo para ver as turmas daquele período.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="seletor-turma-diario"]',
    title: '2. Selecionar Turma e Disciplina',
    content: 'Selecione a turma e a matéria para carregar a lista de chamada e os registros de aula.',
    actionHint: 'Como agir: Escolha a turma no menu para preencher a frequência dos alunos.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="tabela-chamada"]',
    title: '3. Chamada e Frequência',
    content: 'Registre a presença, falta justificada ou falta dos alunos no dia.',
    actionHint: 'Como agir: Clique nos botões de presença para marcar o status de cada estudante.',
    placement: 'top',
  },
];

export const AVALIACOES_TUTORIAL_STEPS: TutorialStep[] = [
  {
    target: '[data-tour="ano-selector"]',
    title: '1. Ano Letivo das Avaliações',
    content: 'Escolha o ano letivo para lançar ou consultar notas e médias.',
    actionHint: 'Como agir: Use as setas para navegar entre os anos letivos.',
    placement: 'bottom',
  },
  {
    target: '[data-tour="seletor-ciclo-avaliacoes"]',
    title: '2. Ciclos e Bimestres',
    content: 'Selecione o bimestre ou ciclo avaliativo que deseja registrar ou calcular médias.',
    actionHint: 'Como agir: Escolha o ciclo atual para lançar notas parciais ou finais.',
    placement: 'bottom',
  },
];

interface TutorialTourProps {
  isOpen: boolean;
  onClose: () => void;
  steps?: TutorialStep[];
  onComplete?: () => void;
}

export const TutorialTour: React.FC<TutorialTourProps> = ({
  isOpen,
  onClose,
  steps = PEDAGOGICO_TUTORIAL_STEPS,
  onComplete,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [popoverPos, setPopoverPos] = useState<{
    top: number;
    left: number;
    placement: 'top' | 'bottom' | 'left' | 'right';
    arrowLeft: number;
  }>({
    top: 0,
    left: 0,
    placement: 'bottom',
    arrowLeft: 24,
  });

  const popoverRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStepIndex];

  // Atualizar a posição do target e do popover
  const updatePosition = useCallback(() => {
    if (!isOpen || !step) return;

    let el = document.querySelector(step.target) as HTMLElement | null;

    // Se o elemento não existir, tenta procurar o container geral
    if (!el && step.target === '[data-tour="card-turma"]') {
      el = document.querySelector('.grid > .border-slate-200') as HTMLElement | null;
    }
    if (!el && step.target === '[data-tour="btn-turma-b"]') {
      el = document.querySelector('[data-tour="card-turma"] button') as HTMLElement | null;
    }

    if (!el) {
      setTargetRect(null);
      setPopoverPos({
        top: Math.max(80, windowHeight / 2 - 120),
        left: Math.max(16, windowWidth / 2 - 170),
        placement: 'bottom',
        arrowLeft: 160,
      });
      return;
    }

    // Scroll suave para o elemento
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

    const rect = el.getBoundingClientRect();
    setTargetRect(rect);

    const popoverWidth = 340;
    const popoverHeight = 240;
    const margin = 14;

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let calculatedPlacement: 'top' | 'bottom' | 'left' | 'right' =
      step.placement && step.placement !== 'auto' ? step.placement : 'bottom';

    // Determinar melhor posicionamento vertical caso estoure a tela
    if (calculatedPlacement === 'bottom' && rect.bottom + popoverHeight + margin > windowHeight) {
      if (rect.top - popoverHeight - margin > 0) {
        calculatedPlacement = 'top';
      }
    } else if (calculatedPlacement === 'top' && rect.top - popoverHeight - margin < 0) {
      if (rect.bottom + popoverHeight + margin < windowHeight) {
        calculatedPlacement = 'bottom';
      }
    }

    let top = 0;
    let left = 0;

    if (calculatedPlacement === 'bottom') {
      top = rect.bottom + margin;
      left = rect.left + rect.width / 2 - popoverWidth / 2;
    } else if (calculatedPlacement === 'top') {
      top = rect.top - popoverHeight - margin;
      left = rect.left + rect.width / 2 - popoverWidth / 2;
    } else if (calculatedPlacement === 'right') {
      top = rect.top + rect.height / 2 - popoverHeight / 2;
      left = rect.right + margin;
    } else {
      top = rect.top + rect.height / 2 - popoverHeight / 2;
      left = rect.left - popoverWidth - margin;
    }

    // Garantir que fique dentro da janela com padding de 12px
    const minLeft = 12;
    const maxLeft = windowWidth - popoverWidth - 12;
    const clampedLeft = Math.max(minLeft, Math.min(maxLeft, left));

    // Posição da seta apontando para o centro do elemento
    const targetCenterX = rect.left + rect.width / 2;
    const arrowLeft = Math.max(20, Math.min(popoverWidth - 28, targetCenterX - clampedLeft));

    setPopoverPos({
      top: Math.max(12, top),
      left: clampedLeft,
      placement: calculatedPlacement,
      arrowLeft,
    });
  }, [isOpen, step]);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStepIndex(0);
      setTargetRect(null);
      return;
    }

    // Timeout inicial para permitir renderização de elementos
    const timer = setTimeout(updatePosition, 120);

    const handleResize = () => updatePosition();
    const handleScroll = () => updatePosition();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, currentStepIndex, updatePosition]);

  // Teclado para navegar ou sair
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex]);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleFinish = () => {
    onClose();
    if (onComplete) {
      onComplete();
    }
    toast.success('Tutorial concluído! Você agora conhece os principais recursos desta tela.');
  };

  if (!isOpen || !step) return null;

  const isLastStep = currentStepIndex === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[9990] overflow-hidden pointer-events-auto">
      {/* Backdrop com clique para fechar */}
      <div
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-[1px] transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Caixa de Spotlight iluminando o elemento alvo com sombra de 9999px */}
      {targetRect && (
        <div
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
          className="fixed z-[9995] rounded-xl border-2 border-purple-500 shadow-[0_0_0_9999px_rgba(15,23,42,0.55)] pointer-events-none transition-all duration-300 ring-4 ring-purple-400/30"
        />
      )}

      {/* Caixa de Mensagem do Tutorial com Seta */}
      <div
        ref={popoverRef}
        style={{
          top: `${popoverPos.top}px`,
          left: `${popoverPos.left}px`,
        }}
        className="fixed z-[9999] w-[340px] max-w-[calc(100vw-24px)] bg-white dark:bg-slate-900 border-2 border-purple-300 dark:border-purple-700 rounded-2xl shadow-2xl p-4 transition-all duration-200 select-none animate-in fade-in zoom-in-95"
      >
        {/* Seta Apontando para o Alvo */}
        {popoverPos.placement === 'bottom' && (
          <div
            style={{ left: `${popoverPos.arrowLeft}px` }}
            className="absolute -top-2 w-4 h-4 bg-white dark:bg-slate-900 border-t-2 border-l-2 border-purple-300 dark:border-purple-700 rotate-45"
          />
        )}
        {popoverPos.placement === 'top' && (
          <div
            style={{ left: `${popoverPos.arrowLeft}px` }}
            className="absolute -bottom-2 w-4 h-4 bg-white dark:bg-slate-900 border-b-2 border-r-2 border-purple-300 dark:border-purple-700 rotate-45"
          />
        )}
        {popoverPos.placement === 'right' && (
          <div className="absolute -left-2 top-8 w-4 h-4 bg-white dark:bg-slate-900 border-b-2 border-l-2 border-purple-300 dark:border-purple-700 rotate-45" />
        )}
        {popoverPos.placement === 'left' && (
          <div className="absolute -right-2 top-8 w-4 h-4 bg-white dark:bg-slate-900 border-t-2 border-r-2 border-purple-300 dark:border-purple-700 rotate-45" />
        )}

        {/* Cabeçalho da Caixa de Mensagem */}
        <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge className="bg-purple-600 text-white font-bold text-[10px] px-2 py-0.5">
              Passo {currentStepIndex + 1} de {steps.length}
            </Badge>
            <span className="text-[11px] text-purple-700 dark:text-purple-300 font-semibold flex items-center gap-1">
              <Compass size={12} />
              Tutorial Interativo
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-6 w-6 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            title="Fechar Tutorial (Esc)"
          >
            <X size={14} />
          </button>
        </div>

        {/* Conteúdo Explicando Como Agir */}
        <div className="py-3 space-y-2">
          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            <Sparkles size={15} className="text-purple-600 shrink-0" />
            {step.title}
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {step.content}
          </p>

          {/* Caixa de Como Agir / Dica Prática */}
          {step.actionHint && (
            <div className="bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 p-2.5 rounded-lg flex items-start gap-2 text-[11px] text-purple-900 dark:text-purple-200 mt-2">
              <Lightbulb size={14} className="text-purple-600 shrink-0 mt-0.5" />
              <div className="leading-snug">
                <strong>Como agir:</strong> {step.actionHint.replace(/^Como agir:\s*/i, '')}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com Navegação Passo a Passo */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          {/* Indicadores de bolinhas */}
          <div className="flex items-center gap-1">
            {steps.map((_, i) => (
              <div
                key={i}
                onClick={() => setCurrentStepIndex(i)}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  i === currentStepIndex
                    ? 'w-4 bg-purple-600'
                    : 'w-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-purple-300'
                }`}
                title={`Ir para passo ${i + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            {currentStepIndex > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrev}
                className="h-7 px-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 flex items-center gap-1"
              >
                <ChevronLeft size={13} />
                Anterior
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              onClick={handleNext}
              className="h-7 px-3 text-xs bg-purple-600 hover:bg-purple-700 text-white font-medium flex items-center gap-1 shadow-sm"
            >
              {isLastStep ? (
                <>
                  <CheckCircle2 size={13} />
                  Concluir
                </>
              ) : (
                <>
                  Próximo
                  <ChevronRight size={13} />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TutorialButton: React.FC<{
  onClick: () => void;
  className?: string;
  variant?: 'outline' | 'default' | 'ghost';
  size?: 'sm' | 'default';
}> = ({ onClick, className = '', variant = 'outline', size = 'sm' }) => {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={onClick}
      className={`border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300 bg-purple-50/60 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/60 font-semibold flex items-center gap-1.5 shadow-xs transition-colors ${className}`}
      title="Iniciar tutorial passo a passo interativo"
    >
      <HelpCircle size={15} className="text-purple-600 dark:text-purple-400" />
      Tutorial
    </Button>
  );
};

