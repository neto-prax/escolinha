import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, School, Users, GraduationCap, Trash2, Key, Settings, Shield, Search, AlertTriangle, RefreshCw, Ban, Check, DollarSign } from 'lucide-react';
import { BillingTab } from '@/components/superadmin/BillingTab';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SchoolWithCounts {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  settings: Record<string, boolean | string> | null;
  created_at: string;
  user_count: number;
  student_count: number;
}

interface UserWithDetails {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_super_admin: boolean;
  school_id: string | null;
  school_name: string | null;
  roles: string[];
  created_at: string;
}

const FEATURE_FLAGS = [
  { key: 'whatsapp_enabled', label: 'WhatsApp/Mensagens', description: 'Habilita integração com WhatsApp' },
  { key: 'crm_enabled', label: 'CRM de Matrículas', description: 'Habilita o módulo de CRM' },
  { key: 'financial_enabled', label: 'Módulo Financeiro', description: 'Habilita gestão financeira' },
  { key: 'reports_enabled', label: 'Relatórios Avançados', description: 'Habilita relatórios detalhados' },
];

const ROLE_LABELS: Record<string, string> = {
  teacher: 'Professor',
  secretary: 'Secretaria',
  admin: 'Administrativo',
  director: 'Diretor',
};

const ROLE_COLORS: Record<string, string> = {
  teacher: 'bg-blue-500',
  secretary: 'bg-green-500',
  admin: 'bg-purple-500',
  director: 'bg-amber-500',
};

export default function SuperAdmin() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [schools, setSchools] = useState<SchoolWithCounts[]>([]);
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [searchSchool, setSearchSchool] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>('all');
  
  // Dialogs
  const [deleteSchoolDialog, setDeleteSchoolDialog] = useState<SchoolWithCounts | null>(null);
  const [resetPasswordDialog, setResetPasswordDialog] = useState<UserWithDetails | null>(null);
  const [settingsDialog, setSettingsDialog] = useState<SchoolWithCounts | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schoolSettings, setSchoolSettings] = useState<Record<string, boolean>>({});

  // Check if user is super admin
  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (!user) {
        setIsSuperAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('super_admins')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (error || !data) {
          setIsSuperAdmin(false);
        } else {
          setIsSuperAdmin(true);
          loadData();
        }
      } catch {
        setIsSuperAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    if (!authLoading) {
      checkSuperAdmin();
    }
  }, [user, authLoading]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [schoolsRes, usersRes] = await Promise.all([
        supabase.functions.invoke('super-admin', {
          body: { action: 'list_schools' },
        }),
        supabase.functions.invoke('super-admin', {
          body: { action: 'list_users' },
        }),
      ]);

      if (schoolsRes.error) throw schoolsRes.error;
      if (usersRes.error) throw usersRes.error;

      setSchools(schoolsRes.data.schools || []);
      setUsers(usersRes.data.users || []);
    } catch (error: any) {
      toast.error('Erro ao carregar dados: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSchool = async () => {
    if (!deleteSchoolDialog) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('super-admin', {
        body: { action: 'delete_school', schoolId: deleteSchoolDialog.id },
      });

      if (error) throw error;

      toast.success(`Escola "${deleteSchoolDialog.name}" excluída com sucesso`);
      setDeleteSchoolDialog(null);
      loadData();
    } catch (error: any) {
      toast.error('Erro ao excluir escola: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordDialog) return;
    
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('super-admin', {
        body: { action: 'reset_password', userId: resetPasswordDialog.id, newPassword },
      });

      if (error) throw error;

      toast.success(`Senha de "${resetPasswordDialog.full_name}" alterada com sucesso`);
      setResetPasswordDialog(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error('Erro ao alterar senha: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleUserActive = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.functions.invoke('super-admin', {
        body: { action: 'toggle_user_active', userId, isActive: !currentStatus },
      });

      if (error) throw error;

      toast.success(currentStatus ? 'Usuário desativado' : 'Usuário ativado');
      loadData();
    } catch (error: any) {
      toast.error('Erro ao alterar status: ' + error.message);
    }
  };

  const handleToggleSuperAdmin = async (userItem: UserWithDetails) => {
    const newStatus = !userItem.is_super_admin;
    try {
      const { data, error } = await supabase.functions.invoke('super-admin', {
        body: { action: 'toggle_super_admin', userId: userItem.id, isSuperAdmin: newStatus },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success(newStatus 
        ? `${userItem.full_name} agora é Super Admin` 
        : `${userItem.full_name} não é mais Super Admin`
      );
      loadData();
    } catch (error: any) {
      toast.error('Erro ao alterar Super Admin: ' + error.message);
    }
  };

  const handleOpenSettings = (school: SchoolWithCounts) => {
    const settings: Record<string, boolean> = {};
    FEATURE_FLAGS.forEach((flag) => {
      settings[flag.key] = (school.settings as Record<string, boolean>)?.[flag.key] ?? true;
    });
    setSchoolSettings(settings);
    setSettingsDialog(school);
  };

  const handleSaveSettings = async () => {
    if (!settingsDialog) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('super-admin', {
        body: { action: 'update_school_settings', schoolId: settingsDialog.id, settings: schoolSettings },
      });

      if (error) throw error;

      toast.success('Configurações salvas com sucesso');
      setSettingsDialog(null);
      loadData();
    } catch (error: any) {
      toast.error('Erro ao salvar configurações: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredSchools = schools.filter(
    (s) =>
      s.name.toLowerCase().includes(searchSchool.toLowerCase()) ||
      s.slug.toLowerCase().includes(searchSchool.toLowerCase())
  );

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(searchUser.toLowerCase()) ||
      (u.email?.toLowerCase().includes(searchUser.toLowerCase()) ?? false);
    const matchesSchool = selectedSchoolFilter === 'all' || u.school_id === selectedSchoolFilter;
    return matchesSearch && matchesSchool;
  });

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando acesso...</p>
        </div>
      </div>
    );
  }

  // Access denied
  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <Shield className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>
              Você não tem permissão para acessar esta área. 
              Esta página é restrita a Super Administradores do sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate('/app/dashboard')}>
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          title="Super Admin"
          description="Painel administrativo global do sistema"
        >
          <Button variant="outline" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </PageHeader>

        {/* Summary Cards */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Escolas</CardTitle>
              <School className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{schools.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {schools.reduce((acc, s) => acc + s.student_count, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="schools" className="mt-6">
          <TabsList>
            <TabsTrigger value="schools">
              <School className="mr-2 h-4 w-4" />
              Escolas
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="mr-2 h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="billing">
              <DollarSign className="mr-2 h-4 w-4" />
              Cobrança
            </TabsTrigger>
          </TabsList>

          {/* Schools Tab */}
          <TabsContent value="schools">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Escolas Cadastradas</CardTitle>
                    <CardDescription>Gerencie todas as escolas do sistema</CardDescription>
                  </div>
                  <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar escola..."
                      value={searchSchool}
                      onChange={(e) => setSearchSchool(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Escola</TableHead>
                      <TableHead>Usuários</TableHead>
                      <TableHead>Alunos</TableHead>
                      <TableHead>Criada em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSchools.map((school) => (
                      <TableRow key={school.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={school.logo_url || ''} />
                              <AvatarFallback>{getInitials(school.name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{school.name}</p>
                              <p className="text-sm text-muted-foreground">{school.slug}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{school.user_count}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{school.student_count}</Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(school.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenSettings(school)}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setDeleteSchoolDialog(school)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredSchools.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Nenhuma escola encontrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle>Usuários do Sistema</CardTitle>
                    <CardDescription>Gerencie usuários de todas as escolas</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <select
                      className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={selectedSchoolFilter}
                      onChange={(e) => setSelectedSchoolFilter(e.target.value)}
                    >
                      <option value="all">Todas as escolas</option>
                      {schools.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <div className="relative w-64">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar usuário..."
                        value={searchUser}
                        onChange={(e) => setSearchUser(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Escola</TableHead>
                      <TableHead>Perfis</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((userItem) => (
                      <TableRow key={userItem.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={userItem.avatar_url || ''} />
                              <AvatarFallback>{getInitials(userItem.full_name)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{userItem.full_name}</p>
                              <p className="text-sm text-muted-foreground">{userItem.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{userItem.school_name || '—'}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {userItem.roles.map((role) => (
                              <Badge
                                key={role}
                                className={`${ROLE_COLORS[role] || 'bg-gray-500'} text-white`}
                              >
                                {ROLE_LABELS[role] || role}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={userItem.is_active ? 'default' : 'secondary'}>
                            {userItem.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setResetPasswordDialog(userItem)}
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button
                              variant={userItem.is_active ? 'secondary' : 'default'}
                              size="sm"
                              onClick={() => handleToggleUserActive(userItem.id, userItem.is_active)}
                            >
                              {userItem.is_active ? (
                                <Ban className="h-4 w-4" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredUsers.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Nenhum usuário encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing">
            <BillingTab schools={schools.map(s => ({ id: s.id, name: s.name, slug: s.slug }))} />
          </TabsContent>
        </Tabs>

        {/* Delete School Dialog */}
        <Dialog open={!!deleteSchoolDialog} onOpenChange={() => setDeleteSchoolDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Excluir Escola
              </DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir a escola <strong>{deleteSchoolDialog?.name}</strong>?
                <br /><br />
                <span className="text-destructive font-medium">
                  Esta ação é irreversível e excluirá todos os dados associados:
                </span>
                <ul className="mt-2 list-disc pl-5 text-sm">
                  <li>{deleteSchoolDialog?.user_count} usuários</li>
                  <li>{deleteSchoolDialog?.student_count} alunos</li>
                  <li>Todas as turmas, matrículas e registros</li>
                </ul>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteSchoolDialog(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteSchool}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Excluir Escola
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog open={!!resetPasswordDialog} onOpenChange={() => setResetPasswordDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Redefinir Senha</DialogTitle>
              <DialogDescription>
                Defina uma nova senha para <strong>{resetPasswordDialog?.full_name}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResetPasswordDialog(null)}>
                Cancelar
              </Button>
              <Button onClick={handleResetPassword} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Senha
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* School Settings Dialog */}
        <Dialog open={!!settingsDialog} onOpenChange={() => setSettingsDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configurações da Escola</DialogTitle>
              <DialogDescription>
                Gerencie as funcionalidades disponíveis para <strong>{settingsDialog?.name}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {FEATURE_FLAGS.map((flag) => (
                <div key={flag.key} className="flex items-center justify-between">
                  <div>
                    <Label>{flag.label}</Label>
                    <p className="text-sm text-muted-foreground">{flag.description}</p>
                  </div>
                  <Switch
                    checked={schoolSettings[flag.key] ?? true}
                    onCheckedChange={(checked) =>
                      setSchoolSettings({ ...schoolSettings, [flag.key]: checked })
                    }
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSettingsDialog(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveSettings} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
