import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  Users,
  GraduationCap,
  Building2,
  MessageSquare,
  Layers,
  Briefcase,
  DollarSign,
  BarChart3,
  Settings,
  UserCog,
  ChevronDown,
  Contact,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  module: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    label: 'Principal',
    items: [
      { title: 'Dashboard', url: '/app/dashboard', icon: LayoutDashboard, module: 'dashboard' },
    ],
  },
  {
    label: 'Pedagógico',
    items: [
      { title: 'Diário', url: '/app/diario', icon: ClipboardList, module: 'diario' },
      { title: 'Turmas', url: '/app/turmas', icon: Users, module: 'turmas' },
      { title: 'Pedagógico', url: '/app/pedagogico', icon: BookOpen, module: 'pedagogico' },
    ],
  },
  {
    label: 'Secretaria',
    items: [
      { title: 'Alunos', url: '/app/alunos', icon: GraduationCap, module: 'alunos' },
      { title: 'Responsáveis', url: '/app/responsaveis', icon: Users, module: 'secretaria' },
      { title: 'Secretaria', url: '/app/secretaria', icon: Building2, module: 'secretaria' },
      { title: 'CRM Matrículas', url: '/app/crm-matriculas', icon: Users, module: 'secretaria' },
    ],
  },
  {
    label: 'Comunicação',
    items: [
      { title: 'Mensagens', url: '/app/mensagens', icon: MessageSquare, module: 'mensagens' },
      { title: 'Contatos', url: '/app/contatos', icon: Contact, module: 'mensagens' },
      { title: 'Setores', url: '/app/setores', icon: Layers, module: 'setores' },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { title: 'Administrativo', url: '/app/administrativo', icon: Briefcase, module: 'administrativo' },
      { title: 'Financeiro', url: '/app/financeiro', icon: DollarSign, module: 'financeiro' },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { title: 'Relatórios', url: '/app/relatorios', icon: BarChart3, module: 'relatorios' },
      { title: 'Usuários', url: '/app/usuarios', icon: UserCog, module: 'usuarios' },
      { title: 'Configurações', url: '/app/configuracoes', icon: Settings, module: 'configuracoes' },
    ],
  },
];

export const AppSidebar = () => {
  const { hasPermission, school, roles } = useAuth();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  // Filter navigation items based on user permissions
  // Se não há roles definidas, mostra tudo (modo desenvolvimento/setup inicial)
  const hasAnyRoles = roles.length > 0;
  
  const filteredGroups = navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.module === 'dashboard') return true;
        // Mostra todos os itens se não há roles definidas
        if (!hasAnyRoles) return true;
        return hasPermission(item.module);
      }),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className={cn('flex items-center gap-3', isCollapsed && 'justify-center')}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold text-xl">
            I
          </div>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="font-semibold text-sidebar-foreground truncate">
                Interagir ERP
              </span>
              {school && (
                <span className="text-xs text-sidebar-muted truncate">
                  {school.name}
                </span>
              )}
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2">
        {filteredGroups.map((group) => (
          <Collapsible key={group.label} defaultOpen className="group/collapsible">
            <SidebarGroup>
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent/50 rounded-md transition-colors">
                  {!isCollapsed && (
                    <>
                      <span>{group.label}</span>
                      <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=closed]/collapsible:rotate-[-90deg]" />
                    </>
                  )}
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton asChild tooltip={item.title}>
                          <NavLink
                            to={item.url}
                            className="flex items-center gap-3 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            {!isCollapsed && <span>{item.title}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {!isCollapsed && (
          <div className="text-xs text-sidebar-muted text-center">
            © 2025 Interagir ERP
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};
