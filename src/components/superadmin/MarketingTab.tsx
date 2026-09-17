import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Image, Upload, Save, Sparkles, Megaphone, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export interface SystemBanner {
  title: string;
  subtitle: string;
  imageUrl: string;
  buttonText: string;
  buttonUrl: string;
  enabled: boolean;
}

const DEFAULT_BANNER: SystemBanner = {
  title: 'Comunicado Oficial Purple Edu 🚀',
  subtitle: 'Confira as diretrizes pedagógicas e mantenha os diários de classe atualizados para as turmas de 2026.',
  imageUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?q=80&w=600&auto=format&fit=crop',
  buttonText: 'Ver Planejamento',
  buttonUrl: '/app/pedagogico',
  enabled: true,
};

export function MarketingTab() {
  const { school } = useAuth();
  const [banner, setBanner] = useState<SystemBanner>(() => {
    try {
      const saved = localStorage.getItem(`s_${school?.id}_purple_edu_banner`);
      return saved ? JSON.parse(saved) : DEFAULT_BANNER;
    } catch {
      return DEFAULT_BANNER;
    }
  });

  const handleSave = () => {
    try {
      localStorage.setItem(`s_${school?.id}_purple_edu_banner`, JSON.stringify(banner));
      toast.success('Banner do sistema atualizado com sucesso!');
    } catch (e) {
      toast.error('Erro ao salvar configurações do banner.');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBanner((prev) => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-purple-200 shadow-sm">
        <CardHeader className="bg-purple-50/50 border-b border-purple-100">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold text-purple-950 flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-purple-600" /> Banner Promocional do Perfil & Sistema
              </CardTitle>
              <CardDescription className="text-xs text-purple-700/80">
                Configure o banner informativo exibido na coluna da direita da página de perfil de todos os usuários.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-lg border border-purple-200 shadow-sm">
              <Label className="text-xs font-semibold text-purple-900">Exibir Banner</Label>
              <Switch
                checked={banner.enabled}
                onCheckedChange={(checked) => setBanner((prev) => ({ ...prev, enabled: checked }))}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* FORMULÁRIO DE EDIÇÃO */}
            <div className="space-y-4">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Título do Banner</Label>
                <Input
                  value={banner.title}
                  onChange={(e) => setBanner((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Novo Ano Letivo 2026"
                  className="mt-1 text-xs focus-visible:ring-purple-500"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Texto / Subtítulo</Label>
                <Textarea
                  value={banner.subtitle}
                  onChange={(e) => setBanner((prev) => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="Descreva o comunicado..."
                  className="mt-1 text-xs h-20 focus-visible:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Texto do Botão</Label>
                  <Input
                    value={banner.buttonText}
                    onChange={(e) => setBanner((prev) => ({ ...prev, buttonText: e.target.value }))}
                    placeholder="Ex: Saiba Mais"
                    className="mt-1 text-xs focus-visible:ring-purple-500"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Link do Botão (URL)</Label>
                  <Input
                    value={banner.buttonUrl}
                    onChange={(e) => setBanner((prev) => ({ ...prev, buttonUrl: e.target.value }))}
                    placeholder="Ex: /app/pedagogico"
                    className="mt-1 text-xs focus-visible:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Upload de Imagem de Fundo</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="text-xs"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Ou cole um link direto de imagem abaixo:
                </p>
                <Input
                  value={banner.imageUrl}
                  onChange={(e) => setBanner((prev) => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="https://..."
                  className="mt-1 text-xs focus-visible:ring-purple-500"
                />
              </div>

              <Button
                onClick={handleSave}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-2 mt-2"
              >
                <Save className="h-4 w-4" /> Salvar Banner do SuperAdmin
              </Button>
            </div>

            {/* PREVIEW DO BANNER */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-purple-900 block">Pré-visualização (Perfil)</Label>
              <div className="border border-purple-200 rounded-xl overflow-hidden shadow-sm bg-white p-2">
                <Card className="border-0 shadow-md rounded-lg overflow-hidden bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-950 text-white relative">
                  {banner.imageUrl && (
                    <div className="absolute inset-0 opacity-25 mix-blend-overlay">
                      <img
                        src={banner.imageUrl}
                        alt="Banner Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader className="p-4 relative z-10 space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-purple-500/40 text-purple-100 border-purple-300/40 text-[10px] px-2 py-0.5">
                        <Sparkles className="h-3 w-3 mr-1" /> Informativo SuperAdmin
                      </Badge>
                      <Badge variant={banner.enabled ? 'default' : 'secondary'} className="text-[10px]">
                        {banner.enabled ? 'Ativo' : 'Oculto'}
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-bold text-white leading-tight mt-1">
                      {banner.title || 'Título do Banner'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 relative z-10 space-y-3 text-xs">
                    <p className="text-purple-100/90 text-xs leading-relaxed">
                      {banner.subtitle || 'Subtítulo do informativo exibido no perfil...'}
                    </p>
                    {banner.buttonText && (
                      <Button
                        size="sm"
                        className="w-full bg-white hover:bg-purple-50 text-purple-950 font-bold text-xs shadow-sm"
                      >
                        {banner.buttonText}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
