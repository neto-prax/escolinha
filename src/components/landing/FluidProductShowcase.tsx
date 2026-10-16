import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  CircleDollarSign,
  GraduationCap,
  MessageCircle,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  TrendingUp,
  FileText,
  Bot,
  Calendar,
  Check,
  Building2,
  Clock,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ProductItem {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  highlights: string[];
  metricLabel: string;
  metricValue: string;
  metricDetail: string;
  previewType: 'financeiro' | 'alunos' | 'whatsapp' | 'pedagogico' | 'portal';
}

const PRODUCTS: ProductItem[] = [
  {
    id: 'financeiro',
    badge: 'Módulo 01 • Gestão Financeira',
    title: 'Financeiro Escolar Sem Planilhas Soltas',
    subtitle: 'Cobrança inteligente, controle de caixa e inadimplência sob controle',
    description:
      'Automatize a emissão de boletos e Pix, conciliação bancária, fluxo de caixa diário e régua de cobrança automática via WhatsApp para diminuir a inadimplência.',
    icon: CircleDollarSign,
    highlights: [
      'Geração e baixa automática de boletos e chave Pix com QR Code',
      'Régua de cobrança preventiva e notificações automáticas',
      'DRE e relatórios de fluxo de caixa em tempo real para a diretoria',
    ],
    metricLabel: 'Redução de Inadimplência',
    metricValue: '-42%',
    metricDetail: 'média registrada nas escolas no 1º trimestre',
    previewType: 'financeiro',
  },
  {
    id: 'alunos',
    badge: 'Módulo 02 • Secretaria & Alunos',
    title: 'Alunos Sempre Organizados & Prontuário Digital',
    subtitle: 'Cadastros 360°, turmas, matrículas e documentos centralizados',
    description:
      'Reúna matrículas, documentos escaneados, vínculos de responsáveis, fichas de saúde e histórico escolar em um único prontuário digital acessível pela equipe autorizada.',
    icon: GraduationCap,
    highlights: [
      'Visão 360° com histórico acadêmico e responsáveis vinculados',
      'Matrículas e rematrículas rápidas com contrato gerado',
      'Emissão de declarações de matrícula e atestados com 1 clique',
    ],
    metricLabel: 'Tempo de Secretaria',
    metricValue: '4x Mais Rápido',
    metricDetail: 'para localizar documentos e fichas de alunos',
    previewType: 'alunos',
  },
  {
    id: 'whatsapp',
    badge: 'Módulo 03 • CRM & WhatsApp WA-AKG',
    title: 'Captação & Atendimento Centralizado no WhatsApp',
    subtitle: 'Funil de captação de alunos e autoatendimento integrado',
    description:
      'Centralize conversas do WhatsApp da escola sem depender do celular pessoal da recepcionista. Responda interessados no funil comercial e acione gatilhos inteligentes.',
    icon: MessageCircle,
    highlights: [
      'Kanban de turmas para captação de novos alunos e matrículas',
      'Central de atendimento WhatsApp conectada com a instância oficial da escola',
      'Gatilhos rápidos e respostas automáticas para dúvidas frequentes e 2ª via',
    ],
    metricLabel: 'Conversão de Matrículas',
    metricValue: '+38%',
    metricDetail: 'aumento na velocidade de resposta aos interessados',
    previewType: 'whatsapp',
  },
  {
    id: 'pedagogico',
    badge: 'Módulo 04 • Coordenação Pedagógica',
    title: 'Acompanhamento Pedagógico & Rotina Escolar',
    subtitle: 'Diário de classe, ocorrências, frequência e fotos com Google Drive',
    description:
      'Controle de notas, avaliações descritivas, registro de ocorrências e fotos de atividades pedagógicas sincronizadas com segurança no Google Drive oficial da escola.',
    icon: Sparkles,
    highlights: [
      'Diário de classe digital com controle de presença e faltas',
      'Boletins acadêmicos e pareceres descritivos automatizados',
      'Armazenamento seguro de fotos pedagógicas sem sobrecarregar celulares',
    ],
    metricLabel: 'Rotina Pedagógica',
    metricValue: '100% Digital',
    metricDetail: 'avaliações e ocorrências registradas sem papel',
    previewType: 'pedagogico',
  },
  {
    id: 'portal',
    badge: 'Módulo 05 • Portal da Família',
    title: 'A Escola na Palma da Mão dos Responsáveis',
    subtitle: 'Aplicativo web para acompanhar notas, comunicados e mensalidades',
    description:
      'Ofereça às famílias um portal exclusivo no smartphone para consultar boletos, notas, ocorrências e calendário escolar com total transparência e sem filas.',
    icon: ShieldCheck,
    highlights: [
      'Acesso direto pelo smartphone sem necessidade de instalar aplicativos pesados',
      'Emissão de 2ª via de boleto e código Pix instantâneo pelos pais',
      'Transparência na comunicação de atividades de casa e comunicados escolares',
    ],
    metricLabel: 'Satisfação das Famílias',
    metricValue: '9.4 / 10',
    metricDetail: 'na avaliação dos pais sobre a facilidade de acesso',
    previewType: 'portal',
  },
];

interface FluidProductShowcaseProps {
  onSelectCta?: () => void;
}

export function FluidProductShowcase({ onSelectCta }: FluidProductShowcaseProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartYRef = useRef<number | null>(null);

  const goToProduct = useCallback(
    (index: number) => {
      if (index === activeIndex || isAnimating) return;
      setIsAnimating(true);
      setActiveIndex(index);
      setTimeout(() => setIsAnimating(false), 500);
    },
    [activeIndex, isAnimating]
  );

  const nextProduct = useCallback(() => {
    goToProduct((activeIndex + 1) % PRODUCTS.length);
  }, [activeIndex, goToProduct]);

  const prevProduct = useCallback(() => {
    goToProduct((activeIndex - 1 + PRODUCTS.length) % PRODUCTS.length);
  }, [activeIndex, goToProduct]);

  // Gestos de Touch no mobile: rolar pra cima (swipe up) avança para o produto seguinte!
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartYRef.current - touchEndY;

    // Se arrastou pra cima mais de 40px: avança para o produto seguinte
    if (diff > 40) {
      nextProduct();
    } else if (diff < -40) {
      prevProduct();
    }
    touchStartYRef.current = null;
  };

  // Suporte a wheel com debounce suave quando o mouse está sobre a área dos produtos
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let lastWheelTime = 0;

    const handleWheel = (e: WheelEvent) => {
      // Apenas intercepta se o scroll for expressivo e com intervalo para fluidez
      const now = Date.now();
      if (Math.abs(e.deltaY) < 30 || now - lastWheelTime < 600) return;

      if (e.deltaY > 0) {
        // Rolando pra baixo / deslizando pra cima: avança se não for o último
        if (activeIndex < PRODUCTS.length - 1) {
          e.preventDefault();
          lastWheelTime = now;
          nextProduct();
        }
      } else {
        // Rolando pra cima: volta se não for o primeiro
        if (activeIndex > 0) {
          e.preventDefault();
          lastWheelTime = now;
          prevProduct();
        }
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [activeIndex, nextProduct, prevProduct]);

  const current = PRODUCTS[activeIndex];
  const CurrentIcon = current.icon;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative w-full rounded-3xl border border-primary/20 bg-gradient-to-b from-card via-card/95 to-muted/30 p-4 sm:p-8 md:p-10 shadow-2xl overflow-hidden backdrop-blur-xl"
    >
      {/* Luz ambiente de fundo */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      {/* ---------------- BARRA SUPERIOR DE NAVEGAÇÃO ENTRE PRODUTOS ---------------- */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 fill-primary text-primary" />
            Ecossistema Completo Purple Edu
          </span>
          <h3 className="text-lg sm:text-xl font-bold font-display text-foreground mt-0.5">
            Conheça os Módulos da Plataforma
          </h3>
        </div>

        {/* Controles de Navegação e Contador */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
          <span className="text-xs font-semibold text-muted-foreground mr-1">
            <span className="text-foreground font-bold">{activeIndex + 1}</span> de {PRODUCTS.length}
          </span>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full border-border/80 hover:bg-primary/10 hover:text-primary transition-all"
              onClick={prevProduct}
              title="Produto anterior (Rolar para baixo)"
              aria-label="Produto anterior"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full border-border/80 hover:bg-primary/10 hover:text-primary transition-all"
              onClick={nextProduct}
              title="Próximo produto (Rolar para cima)"
              aria-label="Próximo produto"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ---------------- CHIPS / ABAS DE SELEÇÃO RÁPIDA ---------------- */}
      <div className="flex items-center gap-2 overflow-x-auto py-4 no-scrollbar border-b border-border/40">
        {PRODUCTS.map((prod, index) => {
          const isActive = index === activeIndex;
          const ProdIcon = prod.icon;
          return (
            <button
              key={prod.id}
              type="button"
              onClick={() => goToProduct(index)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-102'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <ProdIcon className="w-3.5 h-3.5" />
              <span>{prod.id === 'whatsapp' ? 'Captação & WhatsApp' : prod.title.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* ---------------- CORPO DO PRODUTO ATIVO (ANIMAÇÃO FLUIDA) ---------------- */}
      <div className="relative min-h-[460px] lg:min-h-[440px] pt-6 sm:pt-8">
        <div
          key={current.id}
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center animate-in fade-in slide-in-from-bottom-5 duration-500 fill-mode-forwards"
        >
          {/* Coluna da Esquerda: Informações e Benefícios */}
          <div className="lg:col-span-6 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <CurrentIcon className="w-3.5 h-3.5" />
              <span>{current.badge}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-foreground leading-tight">
              {current.title}
            </h2>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {current.description}
            </p>

            {/* Pontos de Destaque com Ícones de Check */}
            <ul className="space-y-2.5 pt-2">
              {current.highlights.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mt-0.5">
                    <Check className="h-3 w-3 stroke-[2.5]" />
                  </span>
                  <span className="leading-snug">{item}</span>
                </li>
              ))}
            </ul>

            {/* Métrica de Impacto & Botão CTA */}
            <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="border-l-2 border-primary/40 pl-3">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  {current.metricLabel}
                </span>
                <span className="text-xl sm:text-2xl font-display font-extrabold text-primary">
                  {current.metricValue}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  {current.metricDetail}
                </span>
              </div>

              <Button
                type="button"
                onClick={onSelectCta}
                className="shadow-lg shadow-primary/20 font-semibold gap-2 h-11 px-5"
              >
                <span>Solicitar Demonstração</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Coluna da Direita: Mockup Visual Ilustrativo do Módulo */}
          <div className="lg:col-span-6">
            <div className="relative rounded-2xl border border-border/80 bg-background/95 p-4 sm:p-6 shadow-xl ring-1 ring-border/50 overflow-hidden">
              {/* Barra superior de janela estilo macOS */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-border/60">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                </div>
                <span className="text-[10px] font-mono font-medium text-muted-foreground flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-primary" /> Purple Edu • {current.title.split(' ')[0]}
                </span>
              </div>

              {/* CONTEÚDO SIMULADO POR TIPO DE PRODUTO */}
              {current.previewType === 'financeiro' && (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 space-y-1">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase">Receita Prevista</span>
                      <p className="text-xl font-display font-bold text-foreground">R$ 148.500</p>
                      <span className="text-[10px] text-emerald-600 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> 94% arrecadado no prazo
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/60 border border-border space-y-1">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase">Inadimplência</span>
                      <p className="text-xl font-display font-bold text-emerald-600">2,1%</p>
                      <span className="text-[10px] text-muted-foreground">Baixo risco histórico</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border bg-card space-y-2">
                    <span className="text-[11px] font-semibold text-foreground block">
                      Últimas Mensalidades Liquidadas via Pix / Boleto
                    </span>
                    <div className="space-y-1.5 font-mono text-[11px]">
                      <div className="flex justify-between items-center py-1 border-b border-border/40">
                        <span>Aluno: Enzo Gabriel (3º Ano)</span>
                        <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-300 text-[10px]">
                          ✓ Pix Pago
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-border/40">
                        <span>Aluna: Sophia Martins (1º Ano)</span>
                        <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-300 text-[10px]">
                          ✓ Boleto Baixado
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span>Aluna: Alice Ferreira (Maternal)</span>
                        <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">
                          🕒 Aguardando Vencimento
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {current.previewType === 'alunos' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-muted/60 border border-border flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold text-base">
                      LS
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">Lucas Silva</h4>
                      <p className="text-[11px] text-muted-foreground">5º Ano Fundamental • Turma A • Matrícula #2026-089</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-300 text-[9px]">
                          Matrícula Ativa
                        </Badge>
                        <Badge variant="outline" className="text-[9px]">
                          Mensalidade em Dia
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2.5 rounded-lg border bg-card">
                      <span className="text-[10px] text-muted-foreground block">Responsável Financeiro</span>
                      <strong className="text-foreground">Carlos Silva (Pai)</strong>
                      <p className="text-[10px] text-muted-foreground mt-0.5">(75) 99823-4411</p>
                    </div>
                    <div className="p-2.5 rounded-lg border bg-card">
                      <span className="text-[10px] text-muted-foreground block">Frequência Escolar</span>
                      <strong className="text-emerald-600 text-sm">98.5%</strong>
                      <p className="text-[10px] text-muted-foreground mt-0.5">2 faltas justificadas</p>
                    </div>
                  </div>
                </div>
              )}

              {current.previewType === 'whatsapp' && (
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-semibold text-emerald-700 dark:text-emerald-300 text-[11px]">
                        WA-AKG Conectado • Instância Oficial
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[9px] bg-background">
                      Setor: Captação & Vendas
                    </Badge>
                  </div>

                  {/* Balões de conversa WhatsApp */}
                  <div className="space-y-2 p-3 rounded-xl bg-muted/40 border">
                    <div className="flex flex-col items-start">
                      <div className="bg-card border rounded-2xl rounded-bl-xs p-2.5 max-w-[85%] text-[11px] space-y-0.5 shadow-xs">
                        <span className="font-semibold text-foreground text-[10px]">Mariana (Interessada):</span>
                        <p className="text-muted-foreground">
                          Olá! Gostaria de saber os horários e valores para matrícula no 2º ano.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-xs p-2.5 max-w-[85%] text-[11px] space-y-0.5 shadow-xs">
                        <span className="font-semibold flex items-center gap-1 text-[10px] opacity-90">
                          <Bot className="w-3 h-3" /> Purple Bot • Gatilho Automático:
                        </span>
                        <p className="leading-relaxed">
                          Olá Mariana! Que alegria seu contato! Nossas matrículas estão com condições especiais. Estou transferindo para nossa coordenadora de admissões!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {current.previewType === 'pedagogico' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-card border space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-foreground">Diário Pedagógico • 2º Trimestre</span>
                      <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 text-[10px]">
                        Google Drive Sincronizado
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Todas as fotos de rotina e atividades de alfabetização salvas na pasta da turma.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 rounded-lg border bg-muted/40">
                      <span className="text-[10px] text-muted-foreground block">Aulas dadas</span>
                      <strong className="text-sm text-foreground">64 aulas</strong>
                    </div>
                    <div className="p-2.5 rounded-lg border bg-muted/40">
                      <span className="text-[10px] text-muted-foreground block">Média Turma</span>
                      <strong className="text-sm text-emerald-600">8.8</strong>
                    </div>
                    <div className="p-2.5 rounded-lg border bg-muted/40">
                      <span className="text-[10px] text-muted-foreground block">Fotos & Mídias</span>
                      <strong className="text-sm text-primary">128 arquivos</strong>
                    </div>
                  </div>
                </div>
              )}

              {current.previewType === 'portal' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-card border space-y-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span className="font-semibold text-foreground text-[11px]">
                        Portal dos Pais • Smartphone
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Acesso seguro e simplificado para mães, pais e responsáveis acompanharem o aluno.
                    </p>
                  </div>

                  <div className="space-y-1.5 text-[11px]">
                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex justify-between items-center">
                      <span>Boleto Outubro/2026 Disponível</span>
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 bg-background">
                        Copiar Pix
                      </Button>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50 border flex justify-between items-center">
                      <span>Boletim do 2º Trimestre Liberado</span>
                      <span className="text-[10px] text-primary font-semibold">Ver notas →</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Dica de usabilidade interativa */}
              <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ChevronDown className="w-3.5 h-3.5 text-primary" />
                  Role para cima / deslize para ver o próximo módulo
                </span>
                <span className="font-mono text-[10px]">{activeIndex + 1}/{PRODUCTS.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- BARRA DE PROGRESSO FLUIDA NO RODAPÉ ---------------- */}
      <div className="mt-8 pt-4 border-t border-border/50">
        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
            style={{ width: `${((activeIndex + 1) / PRODUCTS.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

