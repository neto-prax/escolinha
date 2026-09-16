import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
// Duplicate supabase import removed
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserCog, Plus, MoreHorizontal, Pencil, UserX, UserCheck, Shield, Building2, KeyRound, Trash2, Layers, CheckCircle2, Briefcase, Link2, Unlink, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { AppRole } from '@/types/auth';
import {
  useUsers,
  useUpdateProfile,
  useUpdateUserRoles,
  useToggleUserActive,
  useCreateUser,
  UserWithRoles,
} from '@/hooks/useUsers';
import { UserDetailsModal } from '@/components/users/UserDetailsModal';
import {
  usePermissions,
  APP_SCREENS,
  UserVisibilityConfig,
  getDefaultPermissionsForRoles,
} from '@/hooks/usePermissions';

const ROLE_LABELS: Record<AppRole, string> = {
  director: 'Diretor(a)',
  admin: 'Administrativo',
  secretary: 'Secretaria',
  teacher: 'Professor(a)',
  seller: 'Vendedor(a)',
};

const ROLE_COLORS: Record<AppRole, string> = {
  director: 'bg-purple-500',
  admin: 'bg-blue-500',
  secretary: 'bg-green-500',
  teacher: 'bg-orange-500',
  seller: 'bg-indigo-500',
};

const KPI_SCREENS = [
  {
    id: 'dashboard',
    label: 'Dashboard Principal',
    description: 'Cards de Alunos Ativos, Receita Realizada, Inadimplência e Previsão Contratual.',
  },
  {
    id: 'comercial',
    label: 'Comercial / CRM',
    description: 'Cards de Funil de Vendas (Leads, Contatos, Visitas, Matrículas) e Metas de Matrículas.',
  },
  {
    id: 'alunos',
    label: 'Alunos e Turmas',
    description: 'Cards de Alunos Matriculados, Turmas Ativas, Capacidade Total e Vagas Disponíveis.',
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    description: 'Cards de Receitas Totais (incluindo mensalidades), Despesas do Período e Saldo Líquido.',
  },
  {
    id: 'administrativo',
    label: 'Administrativo / RH',
    description: 'Cards de Total de Colaboradores, Professores Ativos e Resumo Salarial.',
  },
];

const Usuarios = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { data: users = [], isLoading } = useUsers();
  const updateProfile = useUpdateProfile();
  const updateRoles = useUpdateUserRoles();
  const toggleActive = useToggleUserActive();
  const createUser = useCreateUser();

  const [isRolesOpen, setIsRolesOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Estados e Funções para Vincular Usuário a Colaborador
  const [employees, setEmployees] = useLocalStorage<any[]>('escolinha_employees_v2', []);
  const [isLinkEmployeeOpen, setIsLinkEmployeeOpen] = useState(false);
  const [userToLink, setUserToLink] = useState<UserWithRoles | null>(null);
  const [selectedEmployeeIdToLink, setSelectedEmployeeIdToLink] = useState<string>('none');

  const handleOpenLinkEmployee = (targetUser: UserWithRoles) => {
    setUserToLink(targetUser);
    const existing = employees.find((e) => e.userId === targetUser.id);
    setSelectedEmployeeIdToLink(existing ? existing.id : 'none');
    setIsLinkEmployeeOpen(true);
  };

  const handleSaveLinkEmployee = () => {
    if (!userToLink) return;

    if (selectedEmployeeIdToLink === 'none') {
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.userId === userToLink.id
            ? { ...emp, userId: undefined, userName: undefined, userEmail: undefined }
            : emp
        )
      );
      toast.success(`Vínculo de colaborador removido do usuário ${userToLink.full_name}.`);
    } else {
      setEmployees((prev) =>
        prev.map((emp) => {
          if (emp.id === selectedEmployeeIdToLink) {
            return {
              ...emp,
              userId: userToLink.id,
              userName: userToLink.full_name,
              userEmail: userToLink.email,
            };
          }
          if (emp.userId === userToLink.id) {
            return {
              ...emp,
              userId: undefined,
              userName: undefined,
              userEmail: undefined,
            };
          }
          return emp;
        })
      );
      const empObj = employees.find((e) => e.id === selectedEmployeeIdToLink);
      toast.success(`Usuário ${userToLink.full_name} conectado ao colaborador ${empObj?.name || ''}!`);
    }

    setIsLinkEmployeeOpen(false);
    setUserToLink(null);
  };

  const handleBulkDelete = async () => {
    if (selectedUserIds.length === 0) return;
    if (!window.confirm(`Tem certeza que deseja deletar ${selectedUserIds.length} usuário(s)?`)) return;
    try {
      const { error } = await supabase.from('profiles').delete().in('id', selectedUserIds);
      if (error) throw error;
      toast.success('Usuários deletados com sucesso');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao deletar usuários');
    } finally {
      setSelectedUserIds([]);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Tem certeza que deseja deletar este usuário?')) return;
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) throw error;
      toast.success('Usuário deletado com sucesso');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao deletar usuário');
    }
  };

  const [editForm, setEditForm] = useState({ full_name: '', phone: '', email: '' });
  const [rolesForm, setRolesForm] = useState<AppRole[]>([]);
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    roles: [] as AppRole[],
  });
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Hook de permissões de visibilidade de telas e abas
  const {
    saveUserPermissions,
    resetUserPermissions,
    getUserPermissions,
    permissionsStore,
    APP_SCREENS,
  } = usePermissions();

  const [permissionsTab, setPermissionsTab] = useState<'roles' | 'screens' | 'kpis'>('roles');
  const [customVisibility, setCustomVisibility] = useState(false);
  const [visibilityForm, setVisibilityForm] = useState<UserVisibilityConfig>({
    screens: [],
    tabs: {},
  });

  const handleDetailsOpen = (userToView: UserWithRoles) => {
    setSelectedUser(userToView);
    setIsDetailsOpen(true);
  };

  const handleEditOpen = (userToEdit: UserWithRoles) => {
    setSelectedUser(userToEdit);
    setEditForm({
      full_name: userToEdit.full_name,
      phone: userToEdit.phone || '',
      email: userToEdit.email || '',
    });
    setIsEditOpen(true);
  };

  const handleRolesOpen = (userToEdit: UserWithRoles) => {
    setSelectedUser(userToEdit);
    setRolesForm([...userToEdit.roles]);
    const isCustom = !!permissionsStore[userToEdit.id];
    setCustomVisibility(isCustom);
    setVisibilityForm(getUserPermissions(userToEdit.id, userToEdit.roles));
    setPermissionsTab('roles');
    setIsRolesOpen(true);
  };

  const handlePasswordOpen = (userToEdit: UserWithRoles) => {
    setSelectedUser(userToEdit);
    setPasswordForm({ newPassword: '', confirmPassword: '' });
    setIsPasswordOpen(true);
  };

  const handlePasswordSave = async () => {
    if (!selectedUser) return;
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }
    
    setIsChangingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-user-password', {
        body: {
          userId: selectedUser.id,
          newPassword: passwordForm.newPassword,
        },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success('Senha alterada com sucesso!');
      setIsPasswordOpen(false);
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao alterar senha');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleEditSave = async () => {
    if (!selectedUser) return;
    try {
      if (editForm.email && editForm.email !== selectedUser.email) {
        const { data, error } = await supabase.functions.invoke('update-user-email', {
          body: {
            userId: selectedUser.id,
            newEmail: editForm.email,
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      }

      await updateProfile.mutateAsync({
        id: selectedUser.id,
        full_name: editForm.full_name,
        phone: editForm.phone || undefined,
      });
      toast.success('Perfil atualizado!');
      setIsEditOpen(false);
      
      // Refresh own profile if editing self
      if (selectedUser.id === user?.id) {
        await refreshProfile();
      }
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao atualizar perfil');
    }
  };

  const handleRolesSave = async () => {
    if (!selectedUser) return;

    // 1. Sempre salva as regras de visualização de telas e abas
    try {
      if (customVisibility) {
        saveUserPermissions(selectedUser.id, visibilityForm);
      } else {
        resetUserPermissions(selectedUser.id);
      }
    } catch (visErr) {
      console.error('Erro ao salvar visibilidade de telas/abas:', visErr);
    }

    // 2. Atualiza os papéis no Supabase de forma protegida
    let rolesUpdated = false;
    let rolesErrorMsg = '';

    try {
      await updateRoles.mutateAsync({
        userId: selectedUser.id,
        roles: rolesForm,
      });
      rolesUpdated = true;
    } catch (error: any) {
      console.error('Erro ao atualizar cargos no banco:', error);
      rolesErrorMsg = error?.message || 'Permissão negada pelo banco de dados';
    }

    if (rolesUpdated) {
      toast.success('Permissões e visibilidade de telas/abas salvas com sucesso!');
      setIsRolesOpen(false);

      if (selectedUser.id === user?.id) {
        await refreshProfile();
      }
    } else {
      toast.warning(
        `Visibilidade de telas/abas salva! Atenção: os cargos no banco não foram alterados (${rolesErrorMsg}).`
      );
      setIsRolesOpen(false);
    }
  };

  const handleToggleActive = async (userToToggle: UserWithRoles) => {
    try {
      await toggleActive.mutateAsync({
        id: userToToggle.id,
        is_active: !userToToggle.is_active,
      });
      toast.success(
        userToToggle.is_active ? 'Usuário desativado' : 'Usuário ativado'
      );
    } catch (error) {
      toast.error('Erro ao alterar status do usuário');
    }
  };

  const handleCreateUser = async () => {
    if (!createForm.email || !createForm.password || !createForm.full_name) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      await createUser.mutateAsync(createForm);
      toast.success('Usuário criado com sucesso!');
      setIsCreateOpen(false);
      setCreateForm({
        email: '',
        password: '',
        full_name: '',
        phone: '',
        roles: [],
      });
    } catch (error) {
      toast.error('Erro ao criar usuário');
    }
  };

  const toggleRole = (
    role: AppRole,
    currentRoles: AppRole[],
    setRoles: (roles: AppRole[]) => void
  ) => {
    if (currentRoles.includes(role)) {
      setRoles(currentRoles.filter((r) => r !== role));
    } else {
      setRoles([...currentRoles, role]);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuários"
        description="Gerencie os usuários e suas permissões de acesso"
      >
        <div className="flex gap-2">
          {selectedUserIds.length > 0 && (
            <Button variant="destructive" onClick={handleBulkDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir ({selectedUserIds.length})
            </Button>
          )}
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Usuário
          </Button>
        </div>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
          <CardDescription>
            Total de {users.length} usuário(s) cadastrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Carregando usuários...
            </div>
          ) : users.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Nenhum usuário cadastrado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedUserIds.length === users.length && users.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedUserIds(users.map((u) => u.id));
                        } else {
                          setSelectedUserIds([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Cargos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Colaborador Vinculado</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUserIds.includes(u.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedUserIds([...selectedUserIds, u.id]);
                          } else {
                            setSelectedUserIds(selectedUserIds.filter((id) => id !== u.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={u.avatar_url || undefined} />
                          <AvatarFallback>
                            {u.full_name
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium leading-none">{u.full_name}</p>
                          {u.id === user?.id && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              Você
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{u.email || '-'}</TableCell>
                    <TableCell>{u.phone || '-'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0 ? (
                          <span className="text-muted-foreground text-sm">
                            Sem cargo
                          </span>
                        ) : (
                          u.roles.map((role) => (
                            <Badge
                              key={role}
                              className={`${ROLE_COLORS[role]} text-white`}
                            >
                              {ROLE_LABELS[role]}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={u.is_active ? 'default' : 'secondary'}
                        className={u.is_active ? 'bg-green-500' : ''}
                      >
                        {u.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const linkedEmp = employees.find((e) => e.userId === u.id);
                        if (linkedEmp) {
                          return (
                            <Badge
                              variant="outline"
                              onClick={() => handleOpenLinkEmployee(u)}
                              className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 cursor-pointer flex items-center gap-1.5 w-fit"
                              title="Clique para gerenciar vínculo com colaborador"
                            >
                              <Briefcase className="h-3 w-3 text-indigo-600" />
                              <span className="font-semibold">{linkedEmp.name}</span>
                              <span className="text-[10px] text-indigo-500">({linkedEmp.role})</span>
                            </Badge>
                          );
                        }
                        return (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenLinkEmployee(u)}
                            className="text-[11px] h-6 px-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-dashed border-slate-200"
                          >
                            <Plus className="h-3 w-3 mr-1" /> Conectar
                          </Button>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenLinkEmployee(u)} className="text-indigo-700 font-medium">
                            <Briefcase className="h-4 w-4 mr-2 text-indigo-600" />
                            Vincular a Colaborador
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDetailsOpen(u)}>
                            <Building2 className="h-4 w-4 mr-2" />
                            Detalhes do Colaborador
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleEditOpen(u)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar Perfil
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRolesOpen(u)}>
                            <Shield className="h-4 w-4 mr-2" />
                            Permissões & Telas
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePasswordOpen(u)}>
                            <KeyRound className="h-4 w-4 mr-2" />
                            Alterar Senha
                          </DropdownMenuItem>
                          {u.id !== user?.id && (
                            <DropdownMenuItem onClick={() => handleToggleActive(u)}>
                              {u.is_active ? (
                                <>
                                  <UserX className="h-4 w-4 mr-2" />
                                  Desativar
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Ativar
                                </>
                              )}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
            <DialogDescription>
              Atualize as informações do usuário
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input
                id="full_name"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditSave} disabled={updateProfile.isPending}>
              {updateProfile.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Roles & Visibilidade Dialog */}
      <Dialog open={isRolesOpen} onOpenChange={setIsRolesOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-600" />
              Permissões e Visibilidade
            </DialogTitle>
            <DialogDescription>
              Configure o cargo no sistema e personalize quais telas e abas {selectedUser?.full_name} poderá acessar.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={permissionsTab} onValueChange={(v) => setPermissionsTab(v as 'roles' | 'screens' | 'kpis')} className="flex-1 flex flex-col overflow-hidden mt-1">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="roles" className="flex items-center gap-1.5 text-xs">
                <Shield className="h-3.5 w-3.5" /> Cargos
              </TabsTrigger>
              <TabsTrigger value="screens" className="flex items-center gap-1.5 text-xs">
                <Layers className="h-3.5 w-3.5" /> Telas e Abas ({visibilityForm.screens.length})
              </TabsTrigger>
              <TabsTrigger value="kpis" className="flex items-center gap-1.5 text-xs">
                <Eye className="h-3.5 w-3.5" /> Totais (KPIs)
              </TabsTrigger>
            </TabsList>

            {/* ABA 1: CARGOS */}
            <TabsContent value="roles" className="space-y-4 py-4 overflow-y-auto">
              <p className="text-xs text-muted-foreground">
                Selecione os cargos atribuídos a este usuário na escola:
              </p>
              <div className="space-y-3">
                {(Object.keys(ROLE_LABELS) as AppRole[]).map((role) => (
                  <div key={role} className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-slate-50">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id={role}
                        checked={rolesForm.includes(role)}
                        onCheckedChange={() => {
                          const nextRoles = rolesForm.includes(role)
                            ? rolesForm.filter((r) => r !== role)
                            : [...rolesForm, role];
                          setRolesForm(nextRoles);
                          if (!customVisibility) {
                            setVisibilityForm(getDefaultPermissionsForRoles(nextRoles));
                          }
                        }}
                      />
                      <Label htmlFor={role} className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                        <Badge className={`${ROLE_COLORS[role]} text-white`}>
                          {ROLE_LABELS[role]}
                        </Badge>
                      </Label>
                    </div>
                    <span className="text-xs text-slate-400">
                      {role === 'director' ? 'Acesso Total Padrão' : 'Acesso Setorial'}
                    </span>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* ABA 2: TELAS E ABAS */}
            <TabsContent value="screens" className="space-y-3 py-3 flex-1 overflow-hidden flex flex-col">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 bg-purple-50/70 border border-purple-200 rounded-lg shrink-0">
                <div>
                  <span className="text-xs font-semibold text-purple-900 block">Modo de Visibilidade:</span>
                  <span className="text-[11px] text-purple-700">
                    {customVisibility
                      ? 'Personalizado: apenas as telas e abas marcadas abaixo estarão visíveis.'
                      : 'Automático: seguindo as permissões padrão dos cargos selecionados.'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={customVisibility ? 'outline' : 'secondary'}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => {
                      if (!customVisibility) {
                        setCustomVisibility(true);
                      } else {
                        setCustomVisibility(false);
                        setVisibilityForm(getDefaultPermissionsForRoles(rolesForm));
                      }
                    }}
                  >
                    {customVisibility ? 'Voltar ao Padrão' : 'Ativar Personalização'}
                  </Button>
                </div>
              </div>

              {/* Botões de Ação Rápida */}
              <div className="flex items-center justify-between gap-2 shrink-0 py-1">
                <span className="text-xs text-slate-500 font-medium">Selecione as telas e suas abas:</span>
                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-[11px] h-6 px-2 text-purple-700 hover:bg-purple-50"
                    onClick={() => {
                      setCustomVisibility(true);
                      const allScreens = APP_SCREENS.map((s) => s.id);
                      const allTabs: Record<string, string[]> = {};
                      APP_SCREENS.forEach((s) => {
                        if (s.tabs) allTabs[s.id] = s.tabs.map((t) => t.id);
                      });
                      setVisibilityForm({ screens: allScreens, tabs: allTabs });
                    }}
                  >
                    Liberar Tudo
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-[11px] h-6 px-2 text-slate-500 hover:bg-slate-100"
                    onClick={() => {
                      setCustomVisibility(true);
                      setVisibilityForm({ screens: ['dashboard'], tabs: {} });
                    }}
                  >
                    Desmarcar Tudo
                  </Button>
                </div>
              </div>

              {/* Lista de Telas e Abas */}
              <div className="space-y-2.5 overflow-y-auto pr-1 flex-1 max-h-[380px]">
                {APP_SCREENS.map((screen) => {
                  const isScreenChecked = visibilityForm.screens.includes(screen.id);
                  const screenTabs = screen.tabs || [];
                  const currentTabs = visibilityForm.tabs[screen.id] || [];

                  return (
                    <div
                      key={screen.id}
                      className={`border rounded-lg p-3 transition-all ${
                        isScreenChecked ? 'bg-white border-slate-300 shadow-sm' : 'bg-slate-50/60 border-slate-200 opacity-80'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                          <Checkbox
                            checked={isScreenChecked}
                            onCheckedChange={(checked) => {
                              setCustomVisibility(true);
                              const isChecked = !!checked;
                              const newScreens = isChecked
                                ? [...visibilityForm.screens.filter((s) => s !== screen.id), screen.id]
                                : visibilityForm.screens.filter((s) => s !== screen.id);

                              const newTabs = { ...visibilityForm.tabs };
                              if (isChecked) {
                                newTabs[screen.id] = screenTabs.map((t) => t.id);
                              } else {
                                delete newTabs[screen.id];
                              }

                              setVisibilityForm({ screens: newScreens, tabs: newTabs });
                            }}
                          />
                          <span className="font-semibold text-sm text-slate-800">{screen.label}</span>
                        </label>
                        {screenTabs.length > 0 && (
                          <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            {isScreenChecked ? `${currentTabs.length} de ${screenTabs.length} abas` : 'Tela Oculta'}
                          </span>
                        )}
                      </div>

                      {/* Abas da Tela */}
                      {screenTabs.length > 0 && isScreenChecked && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-100 pl-4 bg-slate-50/70 p-2 rounded-md">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5 tracking-wider">
                            Abas Visíveis nesta Tela:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {screenTabs.map((tab) => {
                              const isTabChecked = currentTabs.includes(tab.id);
                              return (
                                <label
                                  key={tab.id}
                                  className="flex items-center space-x-2 cursor-pointer text-xs text-slate-700 hover:text-slate-900 select-none py-0.5"
                                >
                                  <Checkbox
                                    checked={isTabChecked}
                                    onCheckedChange={(checked) => {
                                      setCustomVisibility(true);
                                      const isChecked = !!checked;
                                      const nextTabsForScreen = isChecked
                                        ? [...currentTabs.filter((t) => t !== tab.id), tab.id]
                                        : currentTabs.filter((t) => t !== tab.id);

                                      setVisibilityForm({
                                        ...visibilityForm,
                                        tabs: {
                                          ...visibilityForm.tabs,
                                          [screen.id]: nextTabsForScreen,
                                        },
                                      });
                                    }}
                                  />
                                  <span>{tab.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* ABA 3: TOTAIS (KPIS) */}
            <TabsContent value="kpis" className="space-y-4 py-3 flex-1 overflow-y-auto">
              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-lg">
                <span className="text-xs font-semibold text-purple-900 block mb-1">
                  Exibição de Cards de Totais e Resumos (KPIs)
                </span>
                <p className="text-[11px] text-purple-700 leading-relaxed">
                  Defina quais telas terão os cartões de indicadores consolidados e totais financeiros visíveis para este usuário.
                  Se desativado, o usuário acessará normalmente a tela com suas tabelas e rotinas operacionais, mas os blocos de números agregados ficarão ocultos.
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 py-1">
                <span className="text-xs text-slate-500 font-medium">Controle de exibição por tela:</span>
                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-[11px] h-6 px-2 text-purple-700 hover:bg-purple-50"
                    onClick={() => {
                      setCustomVisibility(true);
                      const allVisible: Record<string, boolean> = {};
                      KPI_SCREENS.forEach((s) => {
                        allVisible[s.id] = true;
                      });
                      setVisibilityForm({ ...visibilityForm, kpis: allVisible });
                    }}
                  >
                    Exibir Todos
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-[11px] h-6 px-2 text-slate-600 hover:bg-slate-100"
                    onClick={() => {
                      setCustomVisibility(true);
                      const allHidden: Record<string, boolean> = {};
                      KPI_SCREENS.forEach((s) => {
                        allHidden[s.id] = false;
                      });
                      setVisibilityForm({ ...visibilityForm, kpis: allHidden });
                    }}
                  >
                    Ocultar Todos
                  </Button>
                </div>
              </div>

              <div className="space-y-2.5">
                {KPI_SCREENS.map((kpiScreen) => {
                  const isVisible = visibilityForm.kpis?.[kpiScreen.id] !== false;
                  return (
                    <div
                      key={kpiScreen.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-slate-300 bg-white"
                    >
                      <div className="space-y-0.5 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-800">{kpiScreen.label}</span>
                          <Badge
                            variant={isVisible ? 'default' : 'secondary'}
                            className={`text-[10px] h-4 px-1.5 ${
                              isVisible ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {isVisible ? 'Visível' : 'Oculto'}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{kpiScreen.description}</p>
                      </div>

                      <Switch
                        checked={isVisible}
                        onCheckedChange={(checked) => {
                          setCustomVisibility(true);
                          setVisibilityForm({
                            ...visibilityForm,
                            kpis: {
                              ...(visibilityForm.kpis || {}),
                              [kpiScreen.id]: checked,
                            },
                          });
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-3 border-t mt-2">
            <Button variant="outline" onClick={() => setIsRolesOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRolesSave} disabled={updateRoles.isPending} className="bg-purple-600 hover:bg-purple-700 text-white">
              {updateRoles.isPending ? 'Salvando...' : 'Salvar Permissões'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>
              Crie um novo usuário para a escola
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create_name">Nome Completo *</Label>
              <Input
                id="create_name"
                value={createForm.full_name}
                onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create_email">E-mail *</Label>
              <Input
                id="create_email"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create_password">Senha *</Label>
              <Input
                id="create_password"
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create_phone">Telefone</Label>
              <Input
                id="create_phone"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label>Permissões</Label>
              <div className="space-y-2">
                {(Object.keys(ROLE_LABELS) as AppRole[]).map((role) => (
                  <div key={role} className="flex items-center space-x-3">
                    <Checkbox
                      id={`create_${role}`}
                      checked={createForm.roles.includes(role)}
                      onCheckedChange={() =>
                        toggleRole(role, createForm.roles, (roles) =>
                          setCreateForm({ ...createForm, roles })
                        )
                      }
                    />
                    <Label htmlFor={`create_${role}`} className="cursor-pointer">
                      {ROLE_LABELS[role]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateUser} 
              disabled={createUser.isPending || !createForm.email || !createForm.password || !createForm.full_name}
            >
              {createUser.isPending ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Details Modal */}
      <UserDetailsModal
        user={selectedUser}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
      />

      {/* Change Password Dialog */}
      <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>
              Defina uma nova senha para {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new_password">Nova Senha</Label>
              <Input
                id="new_password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirmar Senha</Label>
              <Input
                id="confirm_password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="Repita a nova senha"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handlePasswordSave} 
              disabled={isChangingPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
            >
              {isChangingPassword ? 'Alterando...' : 'Alterar Senha'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Vínculo com Colaborador */}
      <Dialog open={isLinkEmployeeOpen} onOpenChange={setIsLinkEmployeeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-indigo-600" />
              Vincular a Colaborador
            </DialogTitle>
            <DialogDescription>
              Conecte este usuário do sistema a um registro de funcionário/colaborador do módulo Administrativo.
            </DialogDescription>
          </DialogHeader>

          {userToLink && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-slate-50">
                <Avatar className="h-10 w-10 border border-slate-200">
                  <AvatarImage src={userToLink.avatar_url || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {getInitials(userToLink.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-slate-800 truncate">{userToLink.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{userToLink.email}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {userToLink.roles.map((r) => (
                      <Badge key={r} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                        {ROLE_LABELS[r]}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="employee_select">Colaborador / Funcionário</Label>
                <Select
                  value={selectedEmployeeIdToLink}
                  onValueChange={setSelectedEmployeeIdToLink}
                >
                  <SelectTrigger id="employee_select">
                    <SelectValue placeholder="Selecione um colaborador..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-muted-foreground italic">
                      -- Nenhum (Desconectar usuário) --
                    </SelectItem>
                    {employees.map((emp) => {
                      const isLinkedToAnother = emp.userId && emp.userId !== userToLink.id;
                      return (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name} ({emp.role} - {emp.department})
                          {isLinkedToAnother ? ' [Já vinculado a outro]' : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Ao vincular, o usuário do sistema terá correspondência direta com a ficha do funcionário no Administrativo.
                </p>
              </div>

              {selectedEmployeeIdToLink !== 'none' && (() => {
                const previewEmp = employees.find((e) => e.id === selectedEmployeeIdToLink);
                if (!previewEmp) return null;
                return (
                  <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-md text-xs space-y-1">
                    <div className="font-semibold text-indigo-900 flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-indigo-600" />
                      {previewEmp.name}
                    </div>
                    <div className="text-indigo-700 grid grid-cols-2 gap-1 pt-1">
                      <div><span className="font-medium text-slate-500">Cargo:</span> {previewEmp.role}</div>
                      <div><span className="font-medium text-slate-500">Depto:</span> {previewEmp.department}</div>
                      <div><span className="font-medium text-slate-500">Contrato:</span> {previewEmp.contract_type}</div>
                      <div><span className="font-medium text-slate-500">Tel:</span> {previewEmp.phone || 'Não inf.'}</div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsLinkEmployeeOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveLinkEmployee} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              Salvar Vínculo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Usuarios;
