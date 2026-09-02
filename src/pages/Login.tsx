import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, Building2, User, Mail, Phone, MapPin, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { resetSchoolIdCache } from '@/lib/cloudState';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

const signupSchema = z.object({
  // User data
  fullName: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string(),
  // School data
  schoolName: z.string().min(3, 'Nome da escola deve ter pelo menos 3 caracteres'),
  schoolAddress: z.string().optional(),
  schoolPhone: z.string().optional(),
  schoolEmail: z.string().email('Email inválido').optional().or(z.literal('')),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não conferem',
  path: ['confirmPassword'],
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [signupStep, setSignupStep] = useState<'school' | 'user'>('school');
  const navigate = useNavigate();
  const { signIn, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      schoolName: '',
      schoolAddress: '',
      schoolPhone: '',
      schoolEmail: '',
    },
  });

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/app/dashboard" replace />;
  }

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    const { error } = await signIn(data.email, data.password);
    setIsLoading(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao entrar',
        description: error.message === 'Invalid login credentials'
          ? 'Email ou senha incorretos'
          : error.message,
      });
      return;
    }

    toast({
      title: 'Bem-vindo!',
      description: 'Login realizado com sucesso.',
    });
    navigate('/app/dashboard');
  };

  const handleSignup = async (data: SignupFormData) => {
    setIsLoading(true);

    try {
      const { data: result, error } = await supabase.functions.invoke('signup-with-school', {
        body: {
          email: data.email,
          password: data.password,
          full_name: data.fullName,
          phone: data.phone || null,
          school_name: data.schoolName,
          school_address: data.schoolAddress || null,
          school_phone: data.schoolPhone || null,
          school_email: data.schoolEmail || null,
        },
      });

      if (error) {
        // Extrai a mensagem real retornada pela função (status 400 etc.)
        let message = error.message;
        const response = (error as { context?: Response }).context;
        if (response && typeof response.text === 'function') {
          try {
            const body = await response.clone().text();
            const parsed = JSON.parse(body) as { error?: string };
            if (parsed?.error) message = parsed.error;
          } catch { /* mantém a mensagem original */ }
        }
        throw new Error(message);
      }

      if (result?.error) {
        throw new Error(result.error);
      }

      toast({
        title: 'Conta criada com sucesso!',
        description: 'Sua escola foi cadastrada. Entrando...',
      });

      // Garante que a escola do novo usuário seja resolvida do zero
      resetSchoolIdCache();

      // Auto-login after signup
      const { error: loginError } = await signIn(data.email, data.password);
      if (loginError) {
        // Se o login automático falhar, volta ao início do cadastro
        setSignupStep('school');
        toast({
          variant: 'destructive',
          title: 'Conta criada, mas não foi possível entrar',
          description: 'Use a aba "Entrar" com seu email e senha.',
        });
      }
      // Autenticado: o próprio redirecionamento da tela leva ao painel
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao criar conta';
      toast({
        variant: 'destructive',
        title: 'Erro ao cadastrar',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextStep = async () => {
    const schoolNameValid = await signupForm.trigger('schoolName');
    if (schoolNameValid) {
      setSignupStep('user');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary items-center justify-center p-12">
        <div className="max-w-md text-primary-foreground">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-foreground/20 text-primary-foreground font-bold text-2xl">
              I
            </div>
            <span className="text-2xl font-bold">Interagir ERP</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">
            Gestão escolar completa em um só lugar
          </h1>
          <p className="text-lg opacity-90">
            Simplifique a administração da sua escola com nossa plataforma integrada.
            Pedagógico, financeiro, comunicação e muito mais.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background overflow-y-auto">
        <Card className="w-full max-w-md border-0 shadow-lg my-4">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4 lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-2xl">
                I
              </div>
            </div>
            <CardTitle className="text-2xl">Acesse sua conta</CardTitle>
            <CardDescription>
              Entre ou crie uma conta para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full" onValueChange={() => setSignupStep('school')}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar conta</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      {...loginForm.register('email')}
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-sm text-destructive">
                        {loginForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        {...loginForm.register('password')}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-destructive">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                  {signupStep === 'school' ? (
                    <>
                      {/* Step indicator */}
                      <div className="flex items-center gap-2 mb-4">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                          1
                        </div>
                        <span className="text-sm font-medium">Dados da Escola</span>
                        <div className="flex-1 h-px bg-border" />
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-bold">
                          2
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="school-name" className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Nome da Escola *
                        </Label>
                        <Input
                          id="school-name"
                          placeholder="Ex: Escola Municipal ABC"
                          {...signupForm.register('schoolName')}
                        />
                        {signupForm.formState.errors.schoolName && (
                          <p className="text-sm text-destructive">
                            {signupForm.formState.errors.schoolName.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="school-address" className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Endereço
                        </Label>
                        <Input
                          id="school-address"
                          placeholder="Rua, número, bairro, cidade"
                          {...signupForm.register('schoolAddress')}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="school-phone" className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            Telefone
                          </Label>
                          <Input
                            id="school-phone"
                            placeholder="(00) 0000-0000"
                            {...signupForm.register('schoolPhone')}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="school-email" className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Email
                          </Label>
                          <Input
                            id="school-email"
                            type="email"
                            placeholder="escola@email.com"
                            {...signupForm.register('schoolEmail')}
                          />
                        </div>
                      </div>

                      <Button 
                        type="button" 
                        className="w-full" 
                        onClick={handleNextStep}
                      >
                        Continuar
                      </Button>
                    </>
                  ) : (
                    <>
                      {/* Step indicator */}
                      <div className="flex items-center gap-2 mb-4">
                        <button 
                          type="button"
                          onClick={() => setSignupStep('school')}
                          className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold hover:opacity-80"
                        >
                          ✓
                        </button>
                        <span className="text-sm text-muted-foreground">Escola</span>
                        <div className="flex-1 h-px bg-primary" />
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                          2
                        </div>
                        <span className="text-sm font-medium">Seus Dados</span>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-name" className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Nome completo *
                        </Label>
                        <Input
                          id="signup-name"
                          placeholder="Seu nome"
                          {...signupForm.register('fullName')}
                        />
                        {signupForm.formState.errors.fullName && (
                          <p className="text-sm text-destructive">
                            {signupForm.formState.errors.fullName.message}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="signup-email">Email *</Label>
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="seu@email.com"
                            {...signupForm.register('email')}
                          />
                          {signupForm.formState.errors.email && (
                            <p className="text-sm text-destructive">
                              {signupForm.formState.errors.email.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="signup-phone">Telefone</Label>
                          <Input
                            id="signup-phone"
                            placeholder="(00) 00000-0000"
                            {...signupForm.register('phone')}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Senha *</Label>
                        <div className="relative">
                          <Input
                            id="signup-password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            {...signupForm.register('password')}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                        {signupForm.formState.errors.password && (
                          <p className="text-sm text-destructive">
                            {signupForm.formState.errors.password.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-confirm">Confirmar senha *</Label>
                        <Input
                          id="signup-confirm"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          {...signupForm.register('confirmPassword')}
                        />
                        {signupForm.formState.errors.confirmPassword && (
                          <p className="text-sm text-destructive">
                            {signupForm.formState.errors.confirmPassword.message}
                          </p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          type="button" 
                          variant="outline"
                          className="flex-1" 
                          onClick={() => setSignupStep('school')}
                        >
                          Voltar
                        </Button>
                        <Button type="submit" className="flex-1" disabled={isLoading}>
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Criando...
                            </>
                          ) : (
                            'Criar conta'
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground text-center">
              Ao continuar, você concorda com nossos{' '}
              <a href="#" className="text-primary hover:underline">
                Termos de Uso
              </a>{' '}
              e{' '}
              <a href="#" className="text-primary hover:underline">
                Política de Privacidade
              </a>
              .
            </p>
            <div className="flex items-center gap-4">
              <Link to="/" className="text-sm text-primary hover:underline">
                ← Voltar para o site
              </Link>
              <Link to="/super-admin" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Super Admin
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Login;
