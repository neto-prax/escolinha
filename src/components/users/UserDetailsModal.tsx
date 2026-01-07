import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { User, Building2, Wallet, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { UserWithRoles } from '@/hooks/useUsers';
import {
  useEmployeeDetails,
  useUserSectors,
  useSectors,
  useUpdateEmployeeDetails,
  useUpdateUserSectors,
} from '@/hooks/useEmployeeDetails';

interface UserDetailsModalProps {
  user: UserWithRoles | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserDetailsModal({ user, open, onOpenChange }: UserDetailsModalProps) {
  const { data: employeeDetails, isLoading: loadingDetails } = useEmployeeDetails(user?.id ?? null);
  const { data: userSectors = [], isLoading: loadingSectors } = useUserSectors(user?.id ?? null);
  const { data: allSectors = [] } = useSectors();
  const updateEmployeeDetails = useUpdateEmployeeDetails();
  const updateUserSectors = useUpdateUserSectors();

  const [activeTab, setActiveTab] = useState('sectors');
  const [selectedSectorIds, setSelectedSectorIds] = useState<string[]>([]);
  const [detailsForm, setDetailsForm] = useState({
    position: '',
    department: '',
    hire_date: '',
    salary: '',
    salary_type: 'monthly',
    bank_name: '',
    bank_agency: '',
    bank_account: '',
    pix_key: '',
    notes: '',
  });

  // Load user sectors when data is fetched
  useEffect(() => {
    if (userSectors) {
      setSelectedSectorIds(userSectors.map((us) => us.sector_id));
    }
  }, [userSectors]);

  // Load employee details when data is fetched
  useEffect(() => {
    if (employeeDetails) {
      setDetailsForm({
        position: employeeDetails.position || '',
        department: employeeDetails.department || '',
        hire_date: employeeDetails.hire_date || '',
        salary: employeeDetails.salary?.toString() || '',
        salary_type: employeeDetails.salary_type || 'monthly',
        bank_name: employeeDetails.bank_name || '',
        bank_agency: employeeDetails.bank_agency || '',
        bank_account: employeeDetails.bank_account || '',
        pix_key: employeeDetails.pix_key || '',
        notes: employeeDetails.notes || '',
      });
    } else {
      setDetailsForm({
        position: '',
        department: '',
        hire_date: '',
        salary: '',
        salary_type: 'monthly',
        bank_name: '',
        bank_agency: '',
        bank_account: '',
        pix_key: '',
        notes: '',
      });
    }
  }, [employeeDetails]);

  const toggleSector = (sectorId: string) => {
    setSelectedSectorIds((prev) =>
      prev.includes(sectorId)
        ? prev.filter((id) => id !== sectorId)
        : [...prev, sectorId]
    );
  };

  const handleSaveSectors = async () => {
    if (!user) return;
    try {
      await updateUserSectors.mutateAsync({
        userId: user.id,
        sectorIds: selectedSectorIds,
      });
      toast.success('Setores atualizados!');
    } catch (error) {
      toast.error('Erro ao atualizar setores');
    }
  };

  const handleSaveDetails = async () => {
    if (!user) return;
    try {
      await updateEmployeeDetails.mutateAsync({
        userId: user.id,
        details: {
          position: detailsForm.position || null,
          department: detailsForm.department || null,
          hire_date: detailsForm.hire_date || null,
          salary: detailsForm.salary ? parseFloat(detailsForm.salary) : null,
          salary_type: detailsForm.salary_type || null,
          bank_name: detailsForm.bank_name || null,
          bank_agency: detailsForm.bank_agency || null,
          bank_account: detailsForm.bank_account || null,
          pix_key: detailsForm.pix_key || null,
          notes: detailsForm.notes || null,
        },
      });
      toast.success('Informações salariais atualizadas!');
    } catch (error) {
      toast.error('Erro ao atualizar informações');
    }
  };

  const isLoading = loadingDetails || loadingSectors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Detalhes do Colaborador
          </DialogTitle>
          <DialogDescription>
            {user?.full_name}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Carregando...</div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sectors" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Setores
              </TabsTrigger>
              <TabsTrigger value="salary" className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Informações Salariais
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sectors" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Setores Vinculados</Label>
                <p className="text-sm text-muted-foreground">
                  Selecione os setores que este colaborador pode atender
                </p>
              </div>

              {allSectors.length === 0 ? (
                <div className="py-4 text-center text-muted-foreground">
                  Nenhum setor cadastrado. Crie setores em Configurações → Setores.
                </div>
              ) : (
                <div className="grid gap-2">
                  {allSectors.map((sector) => (
                    <div
                      key={sector.id}
                      className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleSector(sector.id)}
                    >
                      <Checkbox
                        checked={selectedSectorIds.includes(sector.id)}
                        onCheckedChange={() => toggleSector(sector.id)}
                      />
                      <Label className="cursor-pointer flex-1">{sector.name}</Label>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSaveSectors}
                  disabled={updateUserSectors.isPending}
                >
                  {updateUserSectors.isPending ? 'Salvando...' : 'Salvar Setores'}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="salary" className="space-y-6 mt-4">
              {/* Position & Department */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="position">Cargo</Label>
                  <Input
                    id="position"
                    value={detailsForm.position}
                    onChange={(e) => setDetailsForm({ ...detailsForm, position: e.target.value })}
                    placeholder="Ex: Professora, Secretária"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Departamento</Label>
                  <Input
                    id="department"
                    value={detailsForm.department}
                    onChange={(e) => setDetailsForm({ ...detailsForm, department: e.target.value })}
                    placeholder="Ex: Pedagógico, Administrativo"
                  />
                </div>
              </div>

              {/* Hire Date */}
              <div className="space-y-2">
                <Label htmlFor="hire_date">Data de Admissão</Label>
                <Input
                  id="hire_date"
                  type="date"
                  value={detailsForm.hire_date}
                  onChange={(e) => setDetailsForm({ ...detailsForm, hire_date: e.target.value })}
                />
              </div>

              <Separator />

              {/* Salary Info */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Informações de Pagamento
                </h4>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="salary">Salário (R$)</Label>
                    <Input
                      id="salary"
                      type="number"
                      step="0.01"
                      value={detailsForm.salary}
                      onChange={(e) => setDetailsForm({ ...detailsForm, salary: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salary_type">Tipo</Label>
                    <Select
                      value={detailsForm.salary_type}
                      onValueChange={(value) => setDetailsForm({ ...detailsForm, salary_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Mensal</SelectItem>
                        <SelectItem value="hourly">Por Hora</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Bank Info */}
              <div className="space-y-4">
                <h4 className="font-medium">Dados Bancários</h4>

                <div className="space-y-2">
                  <Label htmlFor="bank_name">Banco</Label>
                  <Input
                    id="bank_name"
                    value={detailsForm.bank_name}
                    onChange={(e) => setDetailsForm({ ...detailsForm, bank_name: e.target.value })}
                    placeholder="Ex: Nubank, Bradesco"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="bank_agency">Agência</Label>
                    <Input
                      id="bank_agency"
                      value={detailsForm.bank_agency}
                      onChange={(e) => setDetailsForm({ ...detailsForm, bank_agency: e.target.value })}
                      placeholder="0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank_account">Conta</Label>
                    <Input
                      id="bank_account"
                      value={detailsForm.bank_account}
                      onChange={(e) => setDetailsForm({ ...detailsForm, bank_account: e.target.value })}
                      placeholder="00000-0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pix_key">Chave PIX</Label>
                  <Input
                    id="pix_key"
                    value={detailsForm.pix_key}
                    onChange={(e) => setDetailsForm({ ...detailsForm, pix_key: e.target.value })}
                    placeholder="CPF, e-mail, telefone ou chave aleatória"
                  />
                </div>
              </div>

              <Separator />

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={detailsForm.notes}
                  onChange={(e) => setDetailsForm({ ...detailsForm, notes: e.target.value })}
                  placeholder="Anotações sobre o colaborador..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSaveDetails}
                  disabled={updateEmployeeDetails.isPending}
                >
                  {updateEmployeeDetails.isPending ? 'Salvando...' : 'Salvar Informações'}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
