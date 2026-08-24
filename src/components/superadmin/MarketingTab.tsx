import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Image, Upload, Trash2, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Banner {
  id: string;
  title: string;
  url: string;
  type: 'banner' | 'flyer';
}

export function MarketingTab() {
  const [items, setItems] = useState<Banner[]>([
    {
      id: '1',
      title: 'Banner Promocional Verão',
      url: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=300&auto=format&fit=crop',
      type: 'banner',
    },
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'banner' | 'flyer'>('banner');
  const [newImage, setNewImage] = useState<string | null>(null);

  const handleUpload = () => {
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    toast.success('Item removido com sucesso!');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddMaterial = () => {
    if (!newTitle || !newImage) {
      toast.error('Preencha todos os campos e selecione uma imagem.');
      return;
    }
    
    const newItem: Banner = {
      id: Math.random().toString(36).substr(2, 9),
      title: newTitle,
      type: newType,
      url: newImage
    };
    
    setItems(prev => [newItem, ...prev]);
    toast.success('Material adicionado com sucesso!');
    setIsDialogOpen(false);
    setNewTitle('');
    setNewImage(null);
    setNewType('banner');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Marketing e Banners</CardTitle>
            <CardDescription>Gerencie os banners e flyers exibidos no sistema</CardDescription>
          </div>
          <Button onClick={handleUpload}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Material
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Banners Ativos</h3>
            {items.filter(i => i.type === 'banner').length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum banner cadastrado.</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.filter(i => i.type === 'banner').map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <div className="aspect-video w-full bg-muted relative">
                    <img 
                      src={item.url} 
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="font-medium text-sm truncate">{item.title}</span>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Flyers Ativos</h3>
            {items.filter(i => i.type === 'flyer').length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum flyer cadastrado.</p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.filter(i => i.type === 'flyer').map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <div className="aspect-[3/4] w-full bg-muted relative">
                    <img 
                      src={item.url} 
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="font-medium text-sm truncate">{item.title}</span>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Novo Material</DialogTitle>
            <DialogDescription>
              Faça o upload de um novo banner ou flyer para o sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Material</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newType} 
                onChange={(e) => setNewType(e.target.value as 'banner' | 'flyer')}
              >
                <option value="banner">Banner (Horizontal)</option>
                <option value="flyer">Flyer (Vertical)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Título</Label>
              <Input 
                placeholder="Ex: Campanha de Inverno" 
                value={newTitle} 
                onChange={(e) => setNewTitle(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Imagem</Label>
              <Input 
                type="file" 
                accept="image/*" 
                onChange={handleImageChange} 
              />
              {newImage && (
                <div className="mt-2 relative rounded-md overflow-hidden bg-muted border" style={{ maxHeight: '200px' }}>
                  <img src={newImage} alt="Preview" className="w-full h-full object-contain" />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddMaterial}>Salvar Material</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
