import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  CircleDollarSign,
  FileCheck2,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  Menu,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import directorImage from '@/assets/diretora-purple-edu.jpg';

const pillars = [
  {
    icon: CircleDollarSign,
    title: 'Financeiro sem planilhas soltas',
    description: 'Mensalidades, caixa, despesas, salários e relatórios reunidos em uma visão clara.',
    points: ['Acompanhamento de mensalidades', 'Relatórios financeiros diários'],
  },
  {
    icon: GraduationCap,
    title: 'Alunos sempre organizados',
    description: 'Cadastros, matrículas, responsáveis e histórico escolar acessíveis pela equipe autorizada.',
    points: ['Visão completa de cada aluno', 'Documentos e responsáveis vinculados'],
  },
  {
    icon: MessageCircle,
    title: 'Captação e WhatsApp',
    description: 'Acompanhe interessados no funil comercial e centralize conversas com as famílias.',
    points: ['CRM para novas matrículas', 'Histórico de atendimento'],
  },
  {
    icon: FileCheck2,
    title: 'Portal e rotina escolar',
    description: 'Dê às famílias acesso direto a atividades, ocorrências, boletos, eventos e datas.',
    points: ['Portal do responsável', 'Calendário e comunicados'],
  },
];

const Landing = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [studentCount, setStudentCount] = useState(450);
  const { toast } = useToast();

  const estimate = useMemo(() => {
    const monthlyHours = Math.round(studentCount * 0.12);
    const yearlyValue = Math.round(studentCount * 120);
    return { monthlyHours, yearlyValue };
  }, [studentCount]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const leadData = {
      school_name: formData.get('schoolName') as string,
      contact_name: formData.get('contactName') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      city: formData.get('city') as string,
      student_count: formData.get('studentCount') as string,
      message: formData.get('message') as string,
      source: 'landing_page',
    };

    try {
      const { error } = await supabase.from('leads').insert([leadData]);
      if (error) throw error;
      toast({ title: 'Solicitação enviada!', description: 'Em breve nossa equipe entrará em contato.' });
      form.reset();
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao enviar', description: 'Tente novamente mais tarde.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToContact = () => document.querySelector('#contato')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="min-h-screen overflow-x-hidden bg-background font-sans text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between px-4 sm:h-20 sm:px-6">
          <a href="#inicio" className="flex items-center gap-2.5" aria-label="Purple Edu - início">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/20">
              <span className="h-3.5 w-3.5 rotate-45 rounded-sm bg-primary-foreground" />
            </span>
            <span className="font-display text-xl text-foreground">Purple <span className="text-primary">Edu</span></span>
          </a>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Navegação principal">
            <a href="#solucoes" className="text-sm font-semibold text-muted-foreground transition-colors hover:text-primary">Soluções</a>
            <a href="#calculadora" className="text-sm font-semibold text-muted-foreground transition-colors hover:text-primary">Calculadora</a>
            <Link to="/login" className="text-sm font-semibold text-muted-foreground transition-colors hover:text-primary">Área do cliente</Link>
            <Button onClick={scrollToContact} className="shadow-lg shadow-primary/20">Solicitar demonstração</Button>
          </nav>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
        {menuOpen && (
          <nav className="border-t border-border bg-background px-4 py-4 md:hidden" aria-label="Navegação móvel">
            <div className="flex flex-col gap-1">
              <a href="#solucoes" onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-3 font-semibold">Soluções</a>
              <a href="#calculadora" onClick={() => setMenuOpen(false)} className="rounded-md px-3 py-3 font-semibold">Calculadora</a>
              <Link to="/login" className="rounded-md px-3 py-3 font-semibold">Área do cliente</Link>
              <Button onClick={() => { setMenuOpen(false); scrollToContact(); }} className="mt-2">Solicitar demonstração</Button>
            </div>
          </nav>
        )}
      </header>

      <main>
        <section id="inicio" className="relative overflow-hidden bg-accent/40 py-12 sm:py-20 lg:py-24">
          <div className="container grid items-center gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-7">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card px-3 py-1.5 text-xs font-bold uppercase text-primary shadow-sm">
                <Sparkles className="h-3.5 w-3.5" /> Gestão escolar em uma só plataforma
              </div>
              <h1 className="max-w-4xl font-display text-4xl leading-[1.05] text-foreground sm:text-5xl lg:text-6xl">
                A gestão escolar inteligente que devolve <span className="text-primary">tempo à sua diretoria.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                Centralize alunos, financeiro, captação e atendimento para reduzir o retrabalho e tomar decisões com mais segurança.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" onClick={scrollToContact} className="h-13 px-7 text-base shadow-xl shadow-primary/20">
                  Solicitar demonstração <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" asChild className="h-13 px-7 text-base">
                  <a href="#solucoes">Conhecer a plataforma</a>
                </Button>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" /> Demonstração personalizada</span>
                <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-success" /> Dados protegidos</span>
              </div>
            </div>

            <div className="relative lg:col-span-5">
              <div className="relative overflow-hidden rounded-[2rem] border-4 border-card bg-card shadow-2xl shadow-primary/20">
                <img
                  src={directorImage}
                  alt="Diretora usando um tablet no corredor da escola"
                  width={1200}
                  height={1500}
                  className="aspect-[4/5] w-full object-cover"
                />
                <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-border/70 bg-card/95 p-4 shadow-xl backdrop-blur sm:bottom-6 sm:left-6 sm:right-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"><Check className="h-5 w-5" /></span>
                    <div>
                      <p className="font-display text-sm text-foreground">Sua escola no controle</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Informações organizadas para decisões mais rápidas.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-card py-8">
          <div className="container grid grid-cols-1 gap-6 px-4 text-center sm:grid-cols-3 sm:px-6">
            {[
              ['Financeiro', 'mensalidades e caixa'],
              ['Alunos', 'cadastros centralizados'],
              ['Comercial', 'captação organizada'],
            ].map(([title, text]) => (
              <div key={title}>
                <p className="font-display text-lg text-foreground">{title}</p>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-background py-20 sm:py-24">
          <div className="container px-4 sm:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-bold uppercase text-primary">Antes e depois</p>
              <h2 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">Menos tarefas espalhadas. Mais visão para liderar.</h2>
            </div>
            <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-2">
              <Card className="border-destructive/20 bg-destructive/5 shadow-none">
                <CardContent className="p-7 sm:p-8">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-destructive/10 text-destructive"><X className="h-5 w-5" /></span>
                  <h3 className="mt-6 font-display text-xl">Rotina fragmentada</h3>
                  <ul className="mt-5 space-y-4 text-muted-foreground">
                    <li className="flex gap-3"><X className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />Informações divididas entre planilhas, papéis e conversas.</li>
                    <li className="flex gap-3"><X className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />Equipe repete tarefas e demora para encontrar respostas.</li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="border-success/30 bg-success/5 shadow-none ring-1 ring-success/10">
                <CardContent className="p-7 sm:p-8">
                  <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-success/15 text-success"><Check className="h-5 w-5" /></span>
                  <h3 className="mt-6 font-display text-xl">Operação conectada</h3>
                  <ul className="mt-5 space-y-4 text-muted-foreground">
                    <li className="flex gap-3"><Check className="mt-0.5 h-5 w-5 shrink-0 text-success" />Dados da escola reunidos com acesso por função.</li>
                    <li className="flex gap-3"><Check className="mt-0.5 h-5 w-5 shrink-0 text-success" />Acompanhamento mais claro do financeiro e do atendimento.</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section id="solucoes" className="bg-accent/40 py-20 sm:py-24">
          <div className="container px-4 sm:px-6">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase text-primary">Plataforma completa</p>
              <h2 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">Quatro frentes que trabalham juntas</h2>
              <p className="mt-4 text-lg text-muted-foreground">Uma visão contínua da jornada da família, do primeiro contato à rotina financeira.</p>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {pillars.map(({ icon: Icon, title, description, points }) => (
                <Card key={title} className="group border-border/70 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-xl">
                  <CardContent className="p-6">
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-105"><Icon className="h-5 w-5" /></span>
                    <h3 className="mt-6 font-display text-lg leading-snug">{title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
                    <ul className="mt-5 space-y-2">
                      {points.map((point) => <li key={point} className="flex gap-2 text-sm text-foreground"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{point}</li>)}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="calculadora" className="bg-background py-20 sm:py-24">
          <div className="container px-4 sm:px-6">
            <div className="overflow-hidden rounded-2xl bg-sidebar p-7 text-sidebar-foreground shadow-2xl sm:p-12 lg:p-16">
              <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
                <div>
                  <p className="text-sm font-bold uppercase text-sidebar-primary">Estimativa operacional</p>
                  <h2 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">Veja o potencial de uma rotina centralizada</h2>
                  <p className="mt-4 text-sidebar-foreground/70">Ajuste o número de alunos para visualizar uma projeção ilustrativa.</p>
                  <div className="mt-10">
                    <div className="mb-4 flex items-end justify-between gap-4">
                      <label htmlFor="student-range" className="text-sm font-semibold text-sidebar-foreground/75">Alunos matriculados</label>
                      <span className="font-display text-2xl text-sidebar-primary">{studentCount}</span>
                    </div>
                    <input
                      id="student-range"
                      type="range"
                      min="50"
                      max="1500"
                      step="50"
                      value={studentCount}
                      onChange={(event) => setStudentCount(Number(event.target.value))}
                      className="h-2 w-full cursor-pointer accent-primary"
                    />
                    <div className="mt-2 flex justify-between text-xs text-sidebar-foreground/50"><span>50</span><span>1.500</span></div>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-sidebar-border bg-sidebar-accent p-6">
                    <Zap className="h-6 w-6 text-sidebar-primary" />
                    <p className="mt-7 text-xs font-bold uppercase text-sidebar-foreground/60">Tempo administrativo</p>
                    <p className="mt-2 font-display text-4xl">{estimate.monthlyHours}h</p>
                    <p className="mt-2 text-sm text-sidebar-foreground/60">potencial mensal estimado</p>
                  </div>
                  <div className="rounded-xl border border-sidebar-border bg-sidebar-accent p-6">
                    <TrendingDown className="h-6 w-6 text-success" />
                    <p className="mt-7 text-xs font-bold uppercase text-sidebar-foreground/60">Valor operacional</p>
                    <p className="mt-2 font-display text-3xl">R$ {estimate.yearlyValue.toLocaleString('pt-BR')}</p>
                    <p className="mt-2 text-sm text-sidebar-foreground/60">projeção anual ilustrativa</p>
                  </div>
                  <p className="sm:col-span-2 text-xs leading-relaxed text-sidebar-foreground/45">Valores são apenas uma simulação de potencial e variam conforme processos, equipe e uso da plataforma.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-card py-20 sm:py-24">
          <div className="container grid items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
            <div>
              <p className="text-sm font-bold uppercase text-primary">Por que Purple Edu?</p>
              <h2 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">Tecnologia para a rotina real da escola</h2>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">A plataforma organiza dados e fluxos sem afastar sua equipe do relacionamento com alunos e famílias.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                [LayoutDashboard, 'Visão unificada', 'Indicadores e rotinas importantes em um só lugar.'],
                [Users, 'Acesso por função', 'Cada profissional visualiza o que precisa para trabalhar.'],
                [ShieldCheck, 'Dados separados', 'As informações permanecem organizadas por escola.'],
                [BarChart3, 'Decisões claras', 'Relatórios transformam registros em acompanhamento útil.'],
              ].map(([Icon, title, description]) => {
                const FeatureIcon = Icon as typeof LayoutDashboard;
                return (
                  <div key={title as string} className="border-l-2 border-primary/25 py-2 pl-5">
                    <FeatureIcon className="h-5 w-5 text-primary" />
                    <h3 className="mt-3 font-display text-base">{title as string}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description as string}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="contato" className="bg-accent/40 py-20 sm:py-24">
          <div className="container grid gap-12 px-4 sm:px-6 lg:grid-cols-5 lg:gap-16">
            <div className="lg:col-span-2">
              <p className="text-sm font-bold uppercase text-primary">Próximo passo</p>
              <h2 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">Veja a Purple Edu funcionando na sua realidade</h2>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">Conte um pouco sobre sua escola. Nossa equipe apresentará as áreas mais úteis para sua operação.</p>
              <div className="mt-8 space-y-4 text-sm text-foreground">
                <p className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-success" /> Conversa focada nas suas prioridades</p>
                <p className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-success" /> Sem compromisso</p>
                <p className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-success" /> Demonstração da plataforma</p>
              </div>
            </div>

            <Card className="border-primary/10 shadow-xl shadow-primary/10 lg:col-span-3">
              <CardContent className="p-6 sm:p-8">
                <h3 className="font-display text-xl">Solicitar demonstração</h3>
                <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2"><Label htmlFor="schoolName">Nome da escola *</Label><Input id="schoolName" name="schoolName" required placeholder="Sua instituição" /></div>
                    <div className="space-y-2"><Label htmlFor="contactName">Seu nome *</Label><Input id="contactName" name="contactName" required placeholder="Como podemos chamar você?" /></div>
                    <div className="space-y-2"><Label htmlFor="email">E-mail de trabalho *</Label><Input id="email" name="email" type="email" required placeholder="voce@escola.com.br" /></div>
                    <div className="space-y-2"><Label htmlFor="phone">WhatsApp / Telefone *</Label><Input id="phone" name="phone" type="tel" required placeholder="(00) 00000-0000" /></div>
                    <div className="space-y-2"><Label htmlFor="city">Cidade / UF</Label><Input id="city" name="city" placeholder="Ex: Salvador, BA" /></div>
                    <div className="space-y-2">
                      <Label htmlFor="studentCount">Número de alunos</Label>
                      <select id="studentCount" name="studentCount" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <option value="0-50">Até 50 alunos</option><option value="51-200">51 a 200 alunos</option><option value="201-500">201 a 500 alunos</option><option value="501-1000">501 a 1.000 alunos</option><option value="1000+">Mais de 1.000 alunos</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2"><Label htmlFor="message">Qual é o principal desafio hoje?</Label><Textarea id="message" name="message" rows={3} className="resize-none" placeholder="Conte brevemente sobre a rotina da sua escola" /></div>
                  <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando...</> : <>Quero conhecer a Purple Edu <ArrowRight className="ml-2 h-4 w-4" /></>}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">Usaremos seus dados apenas para responder à sua solicitação.</p>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="bg-sidebar py-10 text-sidebar-foreground">
        <div className="container flex flex-col gap-6 px-4 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary"><span className="h-3 w-3 rotate-45 rounded-sm bg-primary-foreground" /></span><span className="font-display">Purple Edu</span></div>
          <p className="text-sm text-sidebar-foreground/55">© 2026 Purple Edu. Gestão escolar conectada.</p>
          <Link to="/login" className="text-sm font-semibold text-sidebar-foreground/75 transition-colors hover:text-sidebar-primary">Área do cliente</Link>
        </div>
      </footer>
    </div>
  );
};

export default Landing;