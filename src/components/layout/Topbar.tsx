import { Bell, Search, Menu, LogOut, User, Settings, Shield, Briefcase, MapPin, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { ROLE_LABELS } from '@/types/auth';
import { Logo } from '@/components/common/Logo';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useNavigate } from 'react-router-dom';
import { useSedes } from '@/hooks/useSedes';

export const Topbar = () => {
  const { user, profile, roles, school, signOut } = useAuth();
  const { sedes, activeSedeId, activeSede, setActiveSedeId } = useSedes();
  const navigate = useNavigate();
  const isDirector = roles.includes('director') || roles.length === 0;

  const activeSedesList = sedes.filter((s) => s.ativa);

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  const primaryRole = roles[0];

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-topbar px-4 lg:px-6 print:hidden">
      <SidebarTrigger />

      {/* Logo oficial da página inicial & Seletor de Sedes no Nome Purple Edu (Seta Verde e Seta Preta) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-purple-100/70 dark:hover:bg-purple-950/60 transition-all border border-purple-200/70 dark:border-purple-900/60 bg-purple-50/60 dark:bg-purple-950/30 text-left cursor-pointer group outline-none focus-visible:ring-2 focus-visible:ring-[#6b26d9]"
            title="Clique para alternar entre as sedes da instituição"
          >
            <Logo size="sm" iconOnly />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-[#6b26d9] transition-colors leading-none">
                  Purple Edu
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-[#6b26d9] transition-transform group-data-[state=open]:rotate-180" />
              </div>
              <span className="text-[11px] text-[#6b26d9] dark:text-[#a78bfa] font-medium truncate max-w-[150px] sm:max-w-[210px] mt-0.5">
                {activeSedeId === 'todas' ? 'Todas as Sedes' : activeSede?.nome || school?.name || 'Sede Principal'}
              </span>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 p-1.5 shadow-lg border-purple-100">
          <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1.5">
            Alternar Unidade Escolar
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="flex items-center justify-between cursor-pointer text-xs py-2 px-2.5 rounded-md hover:bg-purple-50 dark:hover:bg-purple-950/40"
            onClick={() => setActiveSedeId('todas')}
          >
            <div className="flex flex-col">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Todas as Sedes</span>
              <span className="text-[10px] text-muted-foreground">Visão geral consolidada</span>
            </div>
            {activeSedeId === 'todas' && <Check className="h-4 w-4 text-[#6b26d9]" />}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {activeSedesList.map((sede) => (
            <DropdownMenuItem
              key={sede.id}
              className="flex items-center justify-between cursor-pointer text-xs py-2 px-2.5 rounded-md hover:bg-purple-50 dark:hover:bg-purple-950/40"
              onClick={() => setActiveSedeId(sede.id)}
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-slate-800 dark:text-slate-200">{sede.nome}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-[#6b26d9] dark:text-[#c4b5fd] rounded font-semibold">
                    {sede.tipo}
                  </span>
                </div>
                {sede.cidade && (
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    {sede.cidade} {sede.estado ? `• ${sede.estado}` : ''}
                  </span>
                )}
              </div>
              {activeSedeId === sede.id && <Check className="h-4 w-4 text-[#6b26d9]" />}
            </DropdownMenuItem>
          ))}
          {isDirector && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-xs text-[#6b26d9] font-medium cursor-pointer py-2 px-2.5 rounded-md hover:bg-purple-50 dark:hover:bg-purple-950/50"
                onClick={() => navigate('/app/configuracoes?tab=sedes')}
              >
                <Settings className="h-3.5 w-3.5 mr-1.5 text-[#6b26d9]" />
                Gerenciar Sedes & Unidades
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Busca global */}
      <div className="flex-1 max-w-md mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar alunos, turmas, documentos..."
            className="pl-9 bg-secondary/50 border-0 focus-visible:ring-1"
          />
        </div>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2">
        {/* Notificações */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
            3
          </Badge>
        </Button>

        {/* Menu do usuário */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden lg:flex flex-col items-start">
                <span className="text-sm font-medium">{profile?.full_name || 'Usuário'}</span>
                {primaryRole && (
                  <span className="text-xs text-muted-foreground">
                    {ROLE_LABELS[primaryRole]}
                  </span>
                )}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/app/perfil')}>
              <User className="mr-2 h-4 w-4" />
              Meu Perfil
            </DropdownMenuItem>
            {isDirector && (
              <DropdownMenuItem onClick={() => navigate('/app/perfil?tab=comissao')}>
                <Briefcase className="mr-2 h-4 w-4 text-purple-600" />
                Comissão & Indicações
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => navigate('/app/configuracoes')}>
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </DropdownMenuItem>
            {user?.email === 'sport@gmail.com' && (
              <DropdownMenuItem onClick={() => navigate('/super-admin')}>
                <Shield className="mr-2 h-4 w-4" />
                Superadmin
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
