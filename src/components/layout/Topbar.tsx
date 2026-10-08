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
import { cn } from '@/lib/utils';
import { useSedes } from '@/hooks/useSedes';

export const Topbar = () => {
  const { user, profile, roles, school, signOut, isSuperAdmin, availableSchools, selectSchool } = useAuth();
  const {
    sedes,
    userAllowedSedes,
    activeSedeId,
    activeSede,
    setActiveSedeId,
    canAccessAllSedes,
    isRestrictedToSingleSede,
    canSwitchSedes,
  } = useSedes();
  const navigate = useNavigate();
  const isDirector = roles.includes('director') || roles.length === 0 || isSuperAdmin;

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
            title={
              isRestrictedToSingleSede
                ? `Acesso exclusivo à unidade ${activeSede?.nome || 'fixa'}`
                : 'Clique para alternar entre as sedes autorizadas'
            }
          >
            <Logo size="sm" iconOnly />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-[#6b26d9] transition-colors leading-none">
                  Purple Edu
                </span>
                {canSwitchSedes ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-[#6b26d9] transition-transform group-data-[state=open]:rotate-180" />
                ) : (
                  <MapPin className="h-3 w-3 text-[#6b26d9]" />
                )}
              </div>
              <span className="text-[11px] text-[#6b26d9] dark:text-[#a78bfa] font-medium truncate max-w-[150px] sm:max-w-[210px] mt-0.5">
                {activeSedeId === 'todas' ? 'Todas as Sedes' : activeSede?.nome || school?.name || 'Sede Principal'}
              </span>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 p-1.5 shadow-lg border-purple-100">
          {isRestrictedToSingleSede ? (
            <div className="p-2 space-y-2">
              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 py-0.5">
                Sua Unidade Autorizada
              </DropdownMenuLabel>
              <div className="p-2.5 bg-purple-50/80 dark:bg-purple-950/40 rounded-lg border border-purple-200/60 dark:border-purple-900/60">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-xs text-purple-950 dark:text-purple-100 flex items-center gap-1.5 truncate">
                    <MapPin className="h-3.5 w-3.5 text-[#6b26d9] shrink-0" />
                    {activeSede?.nome}
                  </span>
                  <Badge className="bg-[#6b26d9] text-white text-[9px] px-1.5 py-0 h-4 shrink-0">
                    {activeSede?.tipo || 'Unidade'}
                  </Badge>
                </div>
                {activeSede?.endereco && (
                  <p className="text-[11px] text-muted-foreground mt-1 truncate">
                    {activeSede.endereco}
                  </p>
                )}
                <div className="mt-2 pt-2 border-t border-purple-200/50 text-[10px] text-purple-700 dark:text-purple-300 font-medium">
                  🔒 Acesso exclusivo configurado para esta unidade.
                </div>
              </div>
            </div>
          ) : (
            <>
              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1.5">
                Alternar Unidade Escolar
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {canAccessAllSedes && (
                <>
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
                </>
              )}
              {userAllowedSedes.map((sede) => (
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
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Seletor Global de Escolas para o Super Admin */}
      {isSuperAdmin && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-200 font-medium text-xs transition-all shadow-xs cursor-pointer group outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              title="Alternar escola em visualização (Modo Super Admin)"
            >
              <Shield className="h-4 w-4 fill-amber-500 text-amber-600 shrink-0" />
              <div className="flex flex-col text-left min-w-0">
                <span className="text-[9px] uppercase font-extrabold tracking-wider text-amber-600 dark:text-amber-400 leading-none">
                  Super Admin
                </span>
                <span className="font-semibold text-xs text-foreground truncate max-w-[130px] sm:max-w-[170px] leading-tight mt-0.5">
                  {school?.name || 'Selecione a Escola'}
                </span>
              </div>
              <ChevronDown className="h-3 w-3 text-amber-600 dark:text-amber-400 opacity-70 group-data-[state=open]:rotate-180 transition-transform shrink-0 ml-0.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72 max-h-80 overflow-y-auto p-1.5 shadow-lg border-amber-200">
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1.5 flex items-center justify-between">
              <span>Escolas da Rede</span>
              <Badge className="bg-amber-500 text-white text-[9px] px-1.5 py-0 h-4">
                Total: {availableSchools.length}
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {availableSchools.map((s) => (
              <DropdownMenuItem
                key={s.id}
                className={cn(
                  'flex items-center justify-between cursor-pointer text-xs py-2 px-2.5 rounded-md',
                  school?.id === s.id
                    ? 'bg-amber-100/80 dark:bg-amber-950/60 font-semibold text-amber-900 dark:text-amber-200'
                    : 'hover:bg-amber-50 dark:hover:bg-amber-950/30'
                )}
                onClick={() => selectSchool(s.id)}
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="truncate">{s.name}</span>
                  <span className="text-[10px] text-muted-foreground truncate">{s.slug}</span>
                </div>
                {school?.id === s.id && <Check className="h-4 w-4 text-amber-600 shrink-0" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => navigate('/super-admin')}
              className="text-xs font-semibold text-amber-600 dark:text-amber-400 cursor-pointer py-2"
            >
              <Settings className="mr-2 h-3.5 w-3.5" />
              Painel Global Super Admin
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

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
                {isSuperAdmin ? (
                  <span className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                    <Shield className="h-3 w-3 fill-amber-500 text-amber-500" /> Super Admin
                  </span>
                ) : primaryRole ? (
                  <span className="text-xs text-muted-foreground">
                    {ROLE_LABELS[primaryRole]}
                  </span>
                ) : null}
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
            {isSuperAdmin && (
              <DropdownMenuItem onClick={() => navigate('/super-admin')} className="font-semibold text-amber-600 dark:text-amber-400">
                <Shield className="mr-2 h-4 w-4 text-amber-500 fill-amber-500/20" />
                Painel Super Admin
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
