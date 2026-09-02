import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_LABELS } from '@/types/auth';
import { toast } from 'sonner';
import { User, Mail, Shield, KeyRound, Bell, Camera, Save, CheckCircle2, Building2, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Perfil: React.FC = () => {
  const { user, profile, roles, school } = useAuth();
  const navigate = useNavigate();

  const primaryRole = roles[0] || 'director';

  // Form states
  const [fullName, setFullName] = useState(profile?.full_name || 'Neto Oliver');
  const [email] = useState(user?.email || 'neto.oliver@interagir.edu.br');
  const [phone, setPhone] = useState('(75) 99876-5432');
  const [bio, setBio] = useState('Gestor e Diretor Pedagógico responsável pela coordenação dos diários e turmas.');
  
  // Security states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Preference toggles
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyDaily, setNotifyDaily] = useState(true);

  // Banner state from SuperAdmin
  const [banner, setBanner] = useState<{
    title: string;
    subtitle: string;
    imageUrl: string;
    buttonText: string;
    buttonUrl: string;
    enabled: boolean;
  } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('purple_edu_banner');
      if (saved) {
        setBanner(JSON.parse(saved));
      } else {
        setBanner({
          title: 'Comunicado Oficial Purple Edu 🚀',
          subtitle: 'Confira as diretrizes pedagógicas e mantenha os diários de classe atualizados para as turmas de 2026.',
          imageUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=600&auto=format&fit=crop',
          buttonText: 'Ver Planejamento',
          buttonUrl: '/app/pedagogico',
          enabled: true,
        });
      }
    } catch {
      // fallback
    }
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Perfil atualizado com sucesso!');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem ou são inválidas.');
      return;
    }
    toast.success('Senha alterada com sucesso!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Meu Perfil"
        description="Gerencie suas informações pessoais, preferências de sistema e segurança da conta."
      />

      {/* HERO USER CARD */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-950 text-white shadow-md rounded-2xl overflow-hidden">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-5 text-center md:text-left">
            <div className="relative group cursor-pointer">
              <Avatar className="h-24 w-24 border-4 border-purple-300/40 shadow-xl">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-purple-600 text-white font-bold text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-6 w-6 text-white" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <h2 className="text-2xl font-bold tracking-tight text-white">{fullName}</h2>
                <Badge className="bg-purple-500/30 text-purple-200 border-purple-400/40 hover:bg-purple-500/40">
                  {ROLE_LABELS[primaryRole] || 'Diretora'}
                </Badge>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Conta Ativa
                </Badge>
              </div>

              <p className="text-sm text-purple-200/90 flex items-center justify-center md:justify-start gap-1.5">
                <Mail className="h-3.5 w-3.5 text-purple-300" /> {email}
              </p>

              <p className="text-xs text-purple-300/80 flex items-center justify-center md:justify-start gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-purple-300" /> {school?.name || 'Colégio Interagir - Unidade Papagaio'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => toast.info('Sua conta está integrada ao Purple Edu.')}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm text-xs font-semibold"
            >
              Plano Pro Ativo
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUNA ESQUERDA (PRINCIPAL) - 2 COLUNAS DE LARGURA */}
        <div className="lg:col-span-2 space-y-6">
          {/* DADOS PESSOAIS */}
          <Card className="border-purple-100 shadow-sm rounded-xl">
            <CardHeader className="border-b border-purple-50 pb-4">
              <CardTitle className="text-base font-bold text-purple-950 flex items-center gap-2">
                <User className="h-5 w-5 text-purple-600" /> Dados Pessoais
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Atualize suas informações de contato e apresentação pública no sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Nome Completo</Label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="mt-1 h-9 text-xs focus-visible:ring-purple-500"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700">E-mail Cadastrado</Label>
                    <Input
                      value={email}
                      disabled
                      className="mt-1 h-9 text-xs bg-slate-50 text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Telefone / WhatsApp</Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1 h-9 text-xs focus-visible:ring-purple-500"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Cargo / Função</Label>
                    <Input
                      value={ROLE_LABELS[primaryRole] || 'Diretora'}
                      disabled
                      className="mt-1 h-9 text-xs bg-slate-50 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Biografia / Apresentação</Label>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="mt-1 h-24 text-xs focus-visible:ring-purple-500"
                    placeholder="Escreva um breve resumo sobre suas atribuições pedagógicas..."
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" size="sm" className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5 font-bold text-xs">
                    <Save className="h-4 w-4" /> Salvar Alterações
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* ALTERAR SENHA (MAIS LARGO COM GRID 3 COLUNAS DE CAMPOS) */}
          <Card className="border-purple-100 shadow-sm rounded-xl">
            <CardHeader className="border-b border-purple-50 pb-4">
              <CardTitle className="text-base font-bold text-purple-950 flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-purple-600" /> Alterar Senha
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Para sua segurança, escolha uma senha forte com números e letras.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Senha Atual</Label>
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="mt-1 h-9 text-xs focus-visible:ring-purple-500"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Nova Senha</Label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="mt-1 h-9 text-xs focus-visible:ring-purple-500"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Confirmar Nova Senha</Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="mt-1 h-9 text-xs focus-visible:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" size="sm" variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50 text-xs font-bold gap-1.5">
                    <Shield className="h-4 w-4 text-purple-600" /> Atualizar Senha
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* PREFERÊNCIAS */}
          <Card className="border-purple-100 shadow-sm rounded-xl">
            <CardHeader className="border-b border-purple-50 pb-4">
              <CardTitle className="text-base font-bold text-purple-950 flex items-center gap-2">
                <Bell className="h-5 w-5 text-purple-600" /> Preferências de Notificação
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Configure como deseja receber avisos sobre o planejamento e diário de classe.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50/50 border border-purple-100">
                <div>
                  <h4 className="text-xs font-bold text-purple-950">Alertas por E-mail</h4>
                  <p className="text-[11px] text-slate-500">Receba resumos diários de aulas preenchidas e avisos institucionais.</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.checked)}
                  className="h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50/50 border border-purple-100">
                <div>
                  <h4 className="text-xs font-bold text-purple-950">Notificações do Diário de Classe</h4>
                  <p className="text-[11px] text-slate-500">Avisar quando novos exercícios forem anexados no banco de atividades.</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifyDaily}
                  onChange={(e) => setNotifyDaily(e.target.checked)}
                  className="h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* COLUNA DIREITA (SIDEBAR) - BANNER DO SUPERADMIN DA ALTURA DA COLUNA */}
        <div className="space-y-6">
          {banner && banner.enabled && (
            <Card className="border-0 shadow-lg rounded-xl overflow-hidden bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-950 text-white relative h-full min-h-[350px] flex flex-col justify-between">
              {banner.imageUrl && (
                <div className="absolute inset-0 opacity-30 mix-blend-overlay">
                  <img
                    src={banner.imageUrl}
                    alt="Banner Institucional"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardHeader className="p-6 relative z-10 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge className="bg-purple-500/40 text-purple-100 border-purple-300/40 text-xs px-3 py-1">
                    <Sparkles className="h-3.5 w-3.5 mr-1" /> Comunicado SuperAdmin
                  </Badge>
                </div>
                <CardTitle className="text-xl font-bold text-white leading-snug mt-3">
                  {banner.title}
                </CardTitle>
              </CardHeader>

              <CardContent className="p-6 relative z-10 space-y-5 text-sm flex-1 flex flex-col justify-between">
                <p className="text-purple-100/90 leading-relaxed text-sm">
                  {banner.subtitle}
                </p>

                {banner.buttonText && (
                  <Button
                    onClick={() => navigate(banner.buttonUrl || '/app/pedagogico')}
                    size="lg"
                    className="w-full bg-white hover:bg-purple-50 text-purple-950 font-bold text-xs shadow-md gap-2 mt-4"
                  >
                    {banner.buttonText} <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Perfil;
