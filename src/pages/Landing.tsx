import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  BookOpen,
  DollarSign,
  MessageSquare,
  Users,
  BarChart3,
  CheckCircle,
  ArrowRight,
  Star,
  Building2,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  TrendingUp,
  Award
} from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Landing = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
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
      toast({
        title: 'Solicitação enviada!',
        description: 'Em breve nossa equipe entrará em contato.',
      });
      (e.target as HTMLFormElement).reset();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar',
        description: 'Tente novamente mais tarde.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-xl shadow-md">
                I
              </div>
              <span className="font-bold text-2xl tracking-tight text-slate-900">Interagir ERP</span>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <a href="#solucoes" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Soluções</a>
              <a href="#depoimentos" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Depoimentos</a>
            </nav>
            <div className="flex items-center gap-4">
              <Link to="/login" className="hidden sm:block text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">
                Área do Cliente
              </Link>
              <a href="#contato">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-lg shadow-blue-500/30">
                  Fale com um Especialista
                </Button>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-28 lg:pt-32 lg:pb-40 bg-gradient-to-b from-slate-50 to-white overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-100/[0.04] bg-[size:32px_32px]"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <div className="max-w-2xl">
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 mb-6 px-3 py-1 text-sm font-medium border-0">
                🚀 O software de gestão escolar definitivo
              </Badge>
              <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1] mb-6">
                Gestão inteligente para impulsionar o <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">sucesso da sua escola</span>
              </h1>
              <p className="text-lg lg:text-xl text-slate-600 mb-8 leading-relaxed">
                Centralize o pedagógico, o financeiro e a comunicação em uma plataforma feita para reduzir a inadimplência e acabar com o retrabalho.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a href="#contato" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700 text-white h-14 px-8 text-base font-semibold shadow-xl shadow-blue-500/20">
                    Solicitar Demonstração
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </a>
                <a href="#solucoes" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full h-14 px-8 text-base font-semibold border-slate-300 text-slate-700 hover:bg-slate-50">
                    Conhecer Funcionalidades
                  </Button>
                </a>
              </div>
              <div className="mt-8 flex items-center gap-4 text-sm text-slate-500 font-medium">
                <div className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-emerald-500" /> Sem taxa de adesão</div>
                <div className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-emerald-500" /> Implantação guiada</div>
              </div>
            </div>
            
            <div className="relative lg:ml-auto w-full max-w-lg lg:max-w-none perspective-1000">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-[2.5rem] blur opacity-30 animate-pulse"></div>
              <div className="relative bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden transform lg:-rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="bg-slate-100 border-b border-slate-200 px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="mx-auto bg-white rounded-md px-3 py-1 text-xs text-slate-400 font-mono w-1/2 text-center border border-slate-200">
                    app.interagir.com.br
                  </div>
                </div>
                <img 
                  src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop" 
                  alt="Dashboard do Sistema Interagir ERP" 
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Bandeja */}
      <section className="py-10 bg-white border-y border-slate-100">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">
            ESCOLHIDO POR INSTITUIÇÕES INOVADORAS EM TODO O BRASIL
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="flex items-center gap-2 font-bold text-xl text-slate-700"><Building2 className="h-6 w-6"/> Colégio Progresso</div>
            <div className="flex items-center gap-2 font-bold text-xl text-slate-700"><BookOpen className="h-6 w-6"/> Instituto Saber</div>
            <div className="flex items-center gap-2 font-bold text-xl text-slate-700"><Award className="h-6 w-6"/> Escola Futuro</div>
            <div className="flex items-center gap-2 font-bold text-xl text-slate-700"><TrendingUp className="h-6 w-6"/> Rede Evolução</div>
          </div>
        </div>
      </section>

      {/* Pilares da Gestão (Features Alternadas) */}
      <section id="solucoes" className="py-24 bg-slate-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">Tudo o que você precisa para uma gestão de excelência</h2>
            <p className="text-lg text-slate-600">Automatize rotinas cansativas e tenha mais tempo para focar no que realmente importa: a educação.</p>
          </div>

          <div className="space-y-24">
            {/* Feature 1: Financeiro */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1 relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
                <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop" alt="Gestão Financeira" className="w-full object-cover" />
              </div>
              <div className="order-1 lg:order-2">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 mb-6">
                  <DollarSign className="h-6 w-6" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900 mb-4">Gestão Financeira Completa</h3>
                <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                  Diga adeus à inadimplência e à bagunça nas contas. Tenha total controle do seu fluxo de caixa com ferramentas feitas para escolas.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3"><CheckCircle className="h-6 w-6 text-emerald-500 shrink-0" /><span className="text-slate-700">Emissão automática de Boletos e NF-e.</span></li>
                  <li className="flex items-start gap-3"><CheckCircle className="h-6 w-6 text-emerald-500 shrink-0" /><span className="text-slate-700">Recebimentos via Pix integrados em tempo real.</span></li>
                  <li className="flex items-start gap-3"><CheckCircle className="h-6 w-6 text-emerald-500 shrink-0" /><span className="text-slate-700">Régua de cobrança automática por WhatsApp e Email.</span></li>
                </ul>
              </div>
            </div>

            {/* Feature 2: Pedagógico */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 mb-6">
                  <BookOpen className="h-6 w-6" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900 mb-4">Secretaria e Pedagógico</h3>
                <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                  Otimize o tempo dos professores e da secretaria com um sistema acadêmico intuitivo e totalmente integrado.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3"><CheckCircle className="h-6 w-6 text-blue-500 shrink-0" /><span className="text-slate-700">Diário de classe digital com lançamento de notas e faltas.</span></li>
                  <li className="flex items-start gap-3"><CheckCircle className="h-6 w-6 text-blue-500 shrink-0" /><span className="text-slate-700">Emissão de boletins, históricos e declarações em um clique.</span></li>
                  <li className="flex items-start gap-3"><CheckCircle className="h-6 w-6 text-blue-500 shrink-0" /><span className="text-slate-700">Portal exclusivo para professores gerenciarem suas turmas.</span></li>
                </ul>
              </div>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
                <img src="https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=2070&auto=format&fit=crop" alt="Gestão Pedagógica" className="w-full object-cover" />
              </div>
            </div>

            {/* Feature 3: Comunicação */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1 relative rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
                <img src="https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=1974&auto=format&fit=crop" alt="Comunicação e CRM" className="w-full object-cover" />
              </div>
              <div className="order-1 lg:order-2">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 mb-6">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900 mb-4">Comunicação e Captação</h3>
                <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                  Aproxime as famílias da escola e impulsione as matrículas com um CRM poderoso e comunicação via WhatsApp.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3"><CheckCircle className="h-6 w-6 text-indigo-500 shrink-0" /><span className="text-slate-700">Envio de avisos e comunicados em massa por WhatsApp.</span></li>
                  <li className="flex items-start gap-3"><CheckCircle className="h-6 w-6 text-indigo-500 shrink-0" /><span className="text-slate-700">CRM Educacional para acompanhar interessados e fechar mais matrículas.</span></li>
                  <li className="flex items-start gap-3"><CheckCircle className="h-6 w-6 text-indigo-500 shrink-0" /><span className="text-slate-700">Portal dos Pais para acompanhamento da vida escolar do aluno.</span></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Impact Numbers */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <div className="grid md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-blue-400/30">
            <div className="pt-8 md:pt-0">
              <div className="text-4xl md:text-5xl font-extrabold mb-2">98%</div>
              <div className="text-blue-100 font-medium">De aprovação dos clientes</div>
            </div>
            <div className="pt-8 md:pt-0">
              <div className="text-4xl md:text-5xl font-extrabold mb-2">- 40%</div>
              <div className="text-blue-100 font-medium">Redução média na inadimplência</div>
            </div>
            <div className="pt-8 md:pt-0">
              <div className="text-4xl md:text-5xl font-extrabold mb-2">+ 20h</div>
              <div className="text-blue-100 font-medium">Economizadas por semana</div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="depoimentos" className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-4">O que os diretores dizem</h2>
            <p className="text-lg text-slate-600">Não acredite apenas em nós. Veja o resultado na prática nas instituições dos nossos clientes.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-slate-50 border-0 shadow-md">
              <CardContent className="p-8">
                <div className="flex gap-1 mb-6">
                  {[1,2,3,4,5].map(i => <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-slate-700 mb-6 italic">"A transição para o Interagir foi a melhor decisão que tomamos este ano. O controle financeiro melhorou drasticamente e os pais adoram receber notificações pelo WhatsApp."</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-xl">M</div>
                  <div>
                    <h4 className="font-bold text-slate-900">Mariana Costa</h4>
                    <p className="text-sm text-slate-500">Diretora Pedagógica</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-50 border-0 shadow-md">
              <CardContent className="p-8">
                <div className="flex gap-1 mb-6">
                  {[1,2,3,4,5].map(i => <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-slate-700 mb-6 italic">"O suporte é excepcional. O sistema é muito intuitivo, o que facilitou o treinamento da nossa secretaria. Hoje geramos boletos e diários de forma 100% automatizada."</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xl">R</div>
                  <div>
                    <h4 className="font-bold text-slate-900">Roberto Almeida</h4>
                    <p className="text-sm text-slate-500">Gestor Financeiro</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-50 border-0 shadow-md">
              <CardContent className="p-8">
                <div className="flex gap-1 mb-6">
                  {[1,2,3,4,5].map(i => <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-slate-700 mb-6 italic">"Centralizar a captação de matrículas no CRM do sistema nos ajudou a aumentar o número de novos alunos em 25% já no primeiro semestre de uso."</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold text-xl">F</div>
                  <div>
                    <h4 className="font-bold text-slate-900">Fernanda Lima</h4>
                    <p className="text-sm text-slate-500">Mantenedora</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-24 bg-gradient-to-br from-slate-900 to-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 bg-blue-500 rounded-full blur-[100px] opacity-30"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-72 h-72 bg-indigo-500 rounded-full blur-[100px] opacity-30"></div>
        <div className="container mx-auto px-4 relative z-10 text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">Pronto para transformar a sua escola?</h2>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            Junte-se às instituições que já estão simplificando a gestão e focando no futuro da educação com o Interagir ERP.
          </p>
          <a href="#contato">
            <Button size="lg" className="bg-blue-500 hover:bg-blue-600 text-white h-14 px-10 text-lg font-bold">
              Falar com um Especialista Agora
            </Button>
          </a>
        </div>
      </section>

      {/* Contact Form Section */}
      <section id="contato" className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16">
            <div>
              <h2 className="text-4xl font-extrabold text-slate-900 mb-6">
                Solicite uma demonstração gratuita
              </h2>
              <p className="text-lg text-slate-600 mb-10">
                Deixe seus dados e um de nossos consultores especialistas em gestão escolar entrará em contato para entender seus desafios e mostrar como podemos ajudar.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100 text-blue-600">
                    <Phone className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Ligue para nós</p>
                    <p className="font-bold text-slate-900 text-lg">(11) 4000-0000</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100 text-blue-600">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">E-mail Comercial</p>
                    <p className="font-bold text-slate-900 text-lg">comercial@interagir.com.br</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100 text-blue-600">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Segurança</p>
                    <p className="font-bold text-slate-900 text-lg">Seus dados estão protegidos.</p>
                  </div>
                </div>
              </div>
            </div>

            <Card className="shadow-xl border-0 overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
              <CardContent className="p-8 md:p-10">
                <h3 className="text-2xl font-bold text-slate-900 mb-6">Agendar uma conversa</h3>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="schoolName" className="font-medium">Nome da instituição *</Label>
                      <Input id="schoolName" name="schoolName" required className="h-12" placeholder="Sua escola" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactName" className="font-medium">Seu nome *</Label>
                      <Input id="contactName" name="contactName" required className="h-12" placeholder="Como devemos chamá-lo?" />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="font-medium">E-mail de trabalho *</Label>
                      <Input id="email" name="email" type="email" required className="h-12" placeholder="voce@escola.com.br" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="font-medium">WhatsApp / Telefone *</Label>
                      <Input id="phone" name="phone" type="tel" required className="h-12" placeholder="(00) 00000-0000" />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="city" className="font-medium">Cidade / UF</Label>
                      <Input id="city" name="city" className="h-12" placeholder="Ex: São Paulo, SP" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="studentCount" className="font-medium">Nº de alunos estimado</Label>
                      <select 
                        id="studentCount" 
                        name="studentCount" 
                        className="flex h-12 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="0-50">Até 50 alunos</option>
                        <option value="51-200">De 51 a 200 alunos</option>
                        <option value="201-500">De 201 a 500 alunos</option>
                        <option value="501-1000">De 501 a 1000 alunos</option>
                        <option value="1000+">Mais de 1000 alunos</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message" className="font-medium">Quais os principais desafios hoje?</Label>
                    <Textarea id="message" name="message" rows={3} className="resize-none" placeholder="Conte-nos um pouco sobre a sua realidade atual..." />
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-bold mt-2" disabled={isSubmitting}>
                    {isSubmitting ? 'Enviando sua solicitação...' : 'Solicitar Demonstração Gratuita'}
                  </Button>
                  <p className="text-xs text-center text-slate-500">
                    Ao enviar, você concorda com nossos Termos de Uso e Política de Privacidade.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 text-white font-bold">
                  I
                </div>
                <span className="font-bold text-xl text-white">Interagir ERP</span>
              </div>
              <p className="text-sm text-slate-400 max-w-sm mb-6">
                O software completo para simplificar a rotina da sua escola, reduzir a inadimplência e melhorar a comunicação com as famílias.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Soluções</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-blue-400">Gestão Pedagógica</a></li>
                <li><a href="#" className="hover:text-blue-400">Gestão Financeira</a></li>
                <li><a href="#" className="hover:text-blue-400">Comunicação</a></li>
                <li><a href="#" className="hover:text-blue-400">Captação de Alunos</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-blue-400">Sobre nós</a></li>
                <li><a href="#" className="hover:text-blue-400">Blog</a></li>
                <li><a href="#" className="hover:text-blue-400">Contato</a></li>
                <li><a href="#" className="hover:text-blue-400">Suporte</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              © 2026 Interagir ERP. Todos os direitos reservados.
            </p>
            <div className="flex gap-4 text-sm text-slate-500">
              <a href="#" className="hover:text-white">Termos de Serviço</a>
              <a href="#" className="hover:text-white">Política de Privacidade</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
