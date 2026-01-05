import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  BookOpen,
  Users,
  DollarSign,
  MessageSquare,
  BarChart3,
  Shield,
  CheckCircle,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Star,
} from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const features = [
  {
    icon: BookOpen,
    title: 'Gestão Pedagógica',
    description: 'Controle de turmas, diário de classe, notas, frequência e planejamento semanal.',
  },
  {
    icon: Users,
    title: 'Secretaria Digital',
    description: 'Matrículas, documentos, cadastros de alunos e responsáveis em um só lugar.',
  },
  {
    icon: DollarSign,
    title: 'Financeiro Completo',
    description: 'Mensalidades, inadimplência, régua de cobrança e relatórios financeiros.',
  },
  {
    icon: MessageSquare,
    title: 'WhatsApp Integrado',
    description: 'Comunicação em massa com responsáveis, recebimento de mensagens por setor.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios Inteligentes',
    description: 'Dashboards e relatórios para acompanhar todos os indicadores da escola.',
  },
  {
    icon: Shield,
    title: 'Segurança de Dados',
    description: 'Controle de acesso por perfil, auditoria e proteção total das informações.',
  },
];

const benefits = [
  'Acesso de qualquer lugar',
  'Suporte dedicado',
  'Atualizações constantes',
  'Backup automático',
  'Multi-unidades',
  'Personalização',
];

const testimonials = [
  {
    name: 'Maria Silva',
    role: 'Diretora',
    school: 'Escola São José',
    content: 'O Interagir ERP revolucionou nossa gestão. Economizamos horas de trabalho toda semana!',
    rating: 5,
  },
  {
    name: 'João Santos',
    role: 'Coordenador',
    school: 'Colégio Lumiar',
    content: 'A integração com WhatsApp facilitou muito nossa comunicação com os pais.',
    rating: 5,
  },
  {
    name: 'Ana Costa',
    role: 'Secretária',
    school: 'Instituto Educar',
    content: 'Finalmente um sistema fácil de usar que realmente atende nossas necessidades.',
    rating: 5,
  },
];

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              I
            </div>
            <span className="font-bold text-xl">Interagir ERP</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Recursos
            </a>
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Depoimentos
            </a>
            <a href="#contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Contato
            </a>
          </nav>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link to="/login">
              <Button>Começar agora</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-24 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <Badge variant="secondary" className="text-sm">
              ✨ Novo: Integração com WhatsApp
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight">
              Gestão escolar{' '}
              <span className="text-primary">completa</span> e{' '}
              <span className="text-primary">inteligente</span>
            </h1>
            <p className="text-xl text-muted-foreground">
              Simplifique a administração da sua escola com uma plataforma que integra
              pedagógico, financeiro, comunicação e muito mais em um só lugar.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="#contact">
                <Button size="lg" className="w-full sm:w-auto">
                  Solicitar demonstração
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
              <Link to="/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Acessar plataforma
                </Button>
              </Link>
            </div>
            <div className="flex flex-wrap gap-3">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-success" />
                  {benefit}
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div className="aspect-video rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border shadow-2xl flex items-center justify-center">
              <div className="text-center p-8">
                <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-4xl mb-4">
                  I
                </div>
                <p className="text-lg font-medium">Dashboard Interativo</p>
                <p className="text-sm text-muted-foreground">Visão completa da sua escola</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-secondary/50 py-24">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Tudo que sua escola precisa
            </h2>
            <p className="text-lg text-muted-foreground">
              Recursos completos para gestão pedagógica, administrativa e financeira.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="card-interactive">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              O que dizem sobre nós
            </h2>
            <p className="text-lg text-muted-foreground">
              Escolas de todo o Brasil confiam no Interagir ERP.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.name}>
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4">"{testimonial.content}"</p>
                  <div>
                    <p className="font-medium">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.role} • {testimonial.school}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section id="contact" className="bg-secondary/50 py-24">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Solicite uma demonstração
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Preencha o formulário e nossa equipe entrará em contato para apresentar
                como o Interagir ERP pode transformar a gestão da sua escola.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-medium">(11) 99999-9999</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">contato@interagir.com.br</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Endereço</p>
                    <p className="font-medium">São Paulo, SP</p>
                  </div>
                </div>
              </div>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Fale conosco</CardTitle>
                <CardDescription>
                  Preencha os dados e entraremos em contato
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="schoolName">Nome da escola *</Label>
                      <Input id="schoolName" name="schoolName" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactName">Seu nome *</Label>
                      <Input id="contactName" name="contactName" required />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input id="email" name="email" type="email" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input id="phone" name="phone" type="tel" />
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade</Label>
                      <Input id="city" name="city" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="studentCount">Quantidade de alunos</Label>
                      <Input id="studentCount" name="studentCount" placeholder="Ex: 100-500" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Mensagem</Label>
                    <Textarea id="message" name="message" rows={4} />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? 'Enviando...' : 'Enviar solicitação'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                I
              </div>
              <span className="font-bold">Interagir ERP</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 Interagir ERP. Todos os direitos reservados.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                Termos de Uso
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                Privacidade
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
