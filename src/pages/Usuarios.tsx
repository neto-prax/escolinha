import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
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
import { UserCog, Plus, MoreHorizontal, Pencil, UserX, UserCheck, Shield, Building2, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
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

const ROLE_LABELS: Record<AppRole, string> = {
  director: 'Diretor(a)',
  admin: 'Administrativo',
  secretary: 'Secretaria',
  teacher: 'Professor(a)',
};

const ROLE_COLORS: Record<AppRole, string> = {
  director: 'bg-purple-500',
  admin: 'bg-blue-500',
  secretary: 'bg-green-500',
  teacher: 'bg-orange-500',
};

const Usuarios = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { data: users = [], isLoading } = useUsers();
  const updateProfile = useUpdateProfile();
  const updateRoles = useUpdateUserRoles();
  const toggleActive = useToggleUserActive();
  const createUser = useCreateUser();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRolesOpen, setIsRolesOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);

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
    try {
      await updateRoles.mutateAsync({
        userId: selectedUser.id,
        roles: rolesForm,
      });
      toast.success('Permissões atualizadas!');
      setIsRolesOpen(false);
      
      if (selectedUser.id === user?.id) {
        await refreshProfile();
      }
    } catch (error) {
      toast.error('Erro ao atualizar permissões');
    }
  };

  const handleToggleActive = async (userToToggle: UserWithRoles) => {
    try {
      await toggleActive.mutateAsync({
        id: userToToggle.id,
        is_active: !userToToggle.is_active,
      });
      toast.success(userToToggle.is_active ? 'Usuário desativado' : 'Usuário ativado');
    } catch (error) {
      toast.error('Erro ao alterar status');
    }
  };

  const handleCreateUser = async () => {
    try {
      await createUser.mutateAsync(createForm);
      toast.success('Usuário criado com sucesso!');
      setIsCreateOpen(false);
      setCreateForm({ email: '', password: '', full_name: '', phone: '', roles: [] });
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao criar usuário');
    }
  };

  const toggleRole = (role: AppRole, form: AppRole[], setForm: (roles: AppRole[]) => void) => {
    if (form.includes(role)) {
      setForm(form.filter((r) => r !== role));
    } else {
      setForm([...form, role]);
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
      <PageHeader title="Usuários" description="Gerencie os usuários e permissões da escola" />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                Equipe
              </CardTitle>
              <CardDescription>
                {users.length} usuário(s) cadastrado(s)
              </CardDescription>
            </div>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum usuário encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Permissões</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} className={!u.is_active ? 'opacity-50' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={u.avatar_url || undefined} />
                          <AvatarFallback>{getInitials(u.full_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{u.full_name}</div>
                          {u.id === user?.id && (
                            <span className="text-xs text-muted-foreground">(você)</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.phone || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.roles.length === 0 ? (
                          <span className="text-muted-foreground text-sm">Sem permissões</span>
                        ) : (
                          u.roles.map((role) => (
                            <Badge
                              key={role}
                              variant="secondary"
                              className={`${ROLE_COLORS[role]} text-white`}
                            >
                              {ROLE_LABELS[role]}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.is_active ? 'default' : 'secondary'}>
                        {u.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
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
                            Permissões
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

      {/* Roles Dialog */}
      <Dialog open={isRolesOpen} onOpenChange={setIsRolesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Permissões</DialogTitle>
            <DialogDescription>
              Configure as permissões de {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {(Object.keys(ROLE_LABELS) as AppRole[]).map((role) => (
              <div key={role} className="flex items-center space-x-3">
                <Checkbox
                  id={role}
                  checked={rolesForm.includes(role)}
                  onCheckedChange={() => toggleRole(role, rolesForm, setRolesForm)}
                />
                <Label htmlFor={role} className="flex items-center gap-2 cursor-pointer">
                  <Badge className={`${ROLE_COLORS[role]} text-white`}>
                    {ROLE_LABELS[role]}
                  </Badge>
                </Label>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRolesOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRolesSave} disabled={updateRoles.isPending}>
              {updateRoles.isPending ? 'Salvando...' : 'Salvar'}
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
    </div>
  );
};

export default Usuarios;
