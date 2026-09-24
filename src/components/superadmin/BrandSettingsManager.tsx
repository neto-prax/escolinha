import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sparkles,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  Save,
  Check,
  Globe,
  Eye,
  CheckCircle2,
  FileCode,
  Laptop,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSystemBranding, DEFAULT_BRANDING } from '@/hooks/useSystemBranding';

function processImageFile(file: File, maxWidth = 800, maxHeight = 800): Promise<string> {
  return new Promise((resolve, reject) => {
    // SVGs e ICOs não devem ser reamostrados em canvas para não perder vetor/atributos
    if (file.type === 'image/svg+xml' || file.name.endsWith('.ico') || file.type.includes('icon')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL(file.type || 'image/png', 0.92));
      };
      img.onerror = () => resolve(reader.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const BrandSettingsManager: React.FC = () => {
  const { branding, updateBranding, resetBranding } = useSystemBranding();

  const [logoUrl, setLogoUrl] = useState(branding.logoUrl);
  const [faviconUrl, setFaviconUrl] = useState(branding.faviconUrl);
  const [brandName, setBrandName] = useState(branding.brandName || 'Purple Edu');
  const [isSaving, setIsSaving] = useState(false);

  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const faviconFileInputRef = useRef<HTMLInputElement>(null);

  // Sincroniza estado inicial se o branding mudar externamente
  useEffect(() => {
    setLogoUrl(branding.logoUrl);
    setFaviconUrl(branding.faviconUrl);
    setBrandName(branding.brandName || 'Purple Edu');
  }, [branding]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast.loading('Processando logotipo...', { id: 'logo-proc' });
      const base64 = await processImageFile(file, 600, 600);
      setLogoUrl(base64);
      toast.success('Imagem da logo carregada com sucesso!', { id: 'logo-proc' });
    } catch (err) {
      toast.error('Não foi possível ler o arquivo de imagem.', { id: 'logo-proc' });
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      toast.loading('Processando favicon...', { id: 'fav-proc' });
      const base64 = await processImageFile(file, 128, 128);
      setFaviconUrl(base64);
      toast.success('Arquivo do favicon carregado com sucesso!', { id: 'fav-proc' });
    } catch (err) {
      toast.error('Não foi possível ler o arquivo do favicon.', { id: 'fav-proc' });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateBranding({
        logoUrl: logoUrl.trim() || DEFAULT_BRANDING.logoUrl,
        faviconUrl: faviconUrl.trim() || DEFAULT_BRANDING.faviconUrl,
        brandName: brandName.trim() || DEFAULT_BRANDING.brandName,
      });
      toast.success('Identidade visual atualizada e aplicada em todo o sistema!');
    } catch (err) {
      toast.error('Erro ao salvar as configurações visuais.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Deseja restaurar a logo e o favicon originais do sistema?')) return;
    setIsSaving(true);
    try {
      await resetBranding();
      setLogoUrl(DEFAULT_BRANDING.logoUrl);
      setFaviconUrl(DEFAULT_BRANDING.faviconUrl);
      setBrandName(DEFAULT_BRANDING.brandName);
      toast.success('Logo e favicon restaurados para os padrões originais!');
    } catch (err) {
      toast.error('Erro ao restaurar configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-purple-200/80 shadow-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-purple-50 via-purple-50/60 to-white dark:from-purple-950/30 dark:via-purple-950/10 dark:to-transparent border-b border-purple-100 dark:border-purple-900/40 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#6b26d9]" /> Identidade Visual da Plataforma
              </CardTitle>
              <Badge className="bg-[#6b26d9] text-white hover:bg-[#581c87] text-[10px] font-semibold">
                SuperAdmin
              </Badge>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Configure o logotipo oficial e o favicon da barra de abas do navegador para personalização global do sistema.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isSaving}
              className="text-xs text-muted-foreground hover:text-destructive border-dashed"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Restaurar Padrões
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#6b26d9] hover:bg-[#581c87] text-white text-xs font-semibold shadow-sm"
            >
              <Save className="h-3.5 w-3.5 mr-1.5" /> {isSaving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-8">
        {/* NOME DA MARCA / SISTEMA */}
        <div className="space-y-2 max-w-md">
          <Label htmlFor="brand-name" className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Nome da Plataforma / Sistema
          </Label>
          <Input
            id="brand-name"
            placeholder="Ex: Purple Edu"
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            className="font-semibold text-sm"
          />
          <p className="text-[11px] text-muted-foreground">
            Exibido no cabeçalho do sistema, tela de login, barra lateral e título das páginas.
          </p>
        </div>

        <Separator />

        {/* SEÇÃO 1: LOGOTIPO OFICIAL */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-[#6b26d9]" /> Logotipo Oficial
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Utilizado no cabeçalho (Topbar), menu lateral (Sidebar), tela de login e portal do responsável.
              </p>
            </div>
            {logoUrl !== DEFAULT_BRANDING.logoUrl && (
              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 bg-emerald-50">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Logo Customizado Ativo
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Controles de Entrada da Logo */}
            <div className="lg:col-span-7 space-y-4">
              <input
                ref={logoFileInputRef}
                type="file"
                accept="image/png,image/svg+xml,image/jpeg,image/webp"
                onChange={handleLogoUpload}
                className="hidden"
              />

              <div className="p-4 border-2 border-dashed border-purple-200 dark:border-purple-900/60 rounded-xl bg-purple-50/30 dark:bg-purple-950/10 flex flex-col items-center justify-center text-center gap-2 hover:bg-purple-50/60 transition-colors">
                <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/40 text-[#6b26d9] flex items-center justify-center">
                  <Upload className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Clique para selecionar um novo arquivo de logotipo
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Formatos aceitos: PNG transparente, SVG, JPG ou WEBP (Max 2MB)
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => logoFileInputRef.current?.click()}
                  className="mt-1 h-8 text-xs font-medium border-purple-300 text-[#6b26d9] hover:bg-purple-100/50"
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" /> Escolher Arquivo do Computador
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="logo-url-input" className="text-xs font-medium text-muted-foreground">
                  Ou insira a URL direta da imagem da Logo:
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="logo-url-input"
                    placeholder="https://exemplo.com/minha-logo.png ou /logo.png"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    className="text-xs font-mono"
                  />
                  {logoUrl !== DEFAULT_BRANDING.logoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setLogoUrl(DEFAULT_BRANDING.logoUrl)}
                      className="text-xs text-muted-foreground"
                      title="Voltar para logo padrão"
                    >
                      Padrão
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Pré-visualização em Tempo Real da Logo */}
            <div className="lg:col-span-5 space-y-2">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5 text-muted-foreground" /> Pré-visualização da Logo
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {/* Fundo Claro */}
                <div className="p-4 rounded-xl border bg-white flex flex-col items-center justify-center min-h-[120px] shadow-xs">
                  <span className="text-[10px] text-muted-foreground font-medium mb-3 uppercase tracking-wider">
                    Fundo Claro
                  </span>
                  <div className="flex items-center gap-2">
                    <img
                      src={logoUrl}
                      alt="Logo Preview"
                      className="h-10 w-10 object-contain rounded-lg shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_BRANDING.logoUrl;
                      }}
                    />
                    <div className="flex flex-col leading-none">
                      <span className="font-bold text-sm text-slate-900">{brandName}</span>
                      <span className="text-[10px] text-muted-foreground">Gestão Escolar</span>
                    </div>
                  </div>
                </div>

                {/* Fundo Escuro / Roxo */}
                <div className="p-4 rounded-xl border bg-[#1e1338] text-white flex flex-col items-center justify-center min-h-[120px] shadow-xs">
                  <span className="text-[10px] text-purple-300 font-medium mb-3 uppercase tracking-wider">
                    Fundo Escuro / Sidebar
                  </span>
                  <div className="flex items-center gap-2">
                    <img
                      src={logoUrl}
                      alt="Logo Preview"
                      className="h-10 w-10 object-contain rounded-lg shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_BRANDING.logoUrl;
                      }}
                    />
                    <div className="flex flex-col leading-none">
                      <span className="font-bold text-sm text-white">{brandName}</span>
                      <span className="text-[10px] text-purple-300/80">Gestão Escolar</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* SEÇÃO 2: FAVICON DO NAVEGADOR */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Globe className="h-4 w-4 text-[#6b26d9]" /> Favicon do Navegador
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ícone exibido na aba do navegador ao lado do título da página e nos favoritos.
              </p>
            </div>
            {faviconUrl !== DEFAULT_BRANDING.faviconUrl && (
              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 bg-emerald-50">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Favicon Customizado Ativo
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Controles de Entrada do Favicon */}
            <div className="lg:col-span-7 space-y-4">
              <input
                ref={faviconFileInputRef}
                type="file"
                accept=".ico,image/x-icon,image/png,image/svg+xml,image/jpeg"
                onChange={handleFaviconUpload}
                className="hidden"
              />

              <div className="p-4 border-2 border-dashed border-purple-200 dark:border-purple-900/60 rounded-xl bg-purple-50/30 dark:bg-purple-950/10 flex flex-col items-center justify-center text-center gap-2 hover:bg-purple-50/60 transition-colors">
                <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/40 text-[#6b26d9] flex items-center justify-center">
                  <Upload className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Clique para selecionar um novo arquivo de Favicon
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Formatos recomendados: .ICO, PNG (32x32px ou 64x64px) ou SVG
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => faviconFileInputRef.current?.click()}
                  className="mt-1 h-8 text-xs font-medium border-purple-300 text-[#6b26d9] hover:bg-purple-100/50"
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" /> Escolher Arquivo do Computador (.ico / .png / .svg)
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="favicon-url-input" className="text-xs font-medium text-muted-foreground">
                  Ou insira a URL direta do Favicon:
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="favicon-url-input"
                    placeholder="https://exemplo.com/favicon.ico ou /favicon.ico"
                    value={faviconUrl}
                    onChange={(e) => setFaviconUrl(e.target.value)}
                    className="text-xs font-mono"
                  />
                  {faviconUrl !== DEFAULT_BRANDING.faviconUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFaviconUrl(DEFAULT_BRANDING.faviconUrl)}
                      className="text-xs text-muted-foreground"
                      title="Voltar para favicon padrão"
                    >
                      Padrão
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Pré-visualização Realista da Aba do Navegador */}
            <div className="lg:col-span-5 space-y-2">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Laptop className="h-3.5 w-3.5 text-muted-foreground" /> Prévia na Aba do Navegador
              </Label>
              <div className="rounded-xl border border-slate-300 dark:border-slate-800 bg-slate-200 dark:bg-slate-900 p-2.5 shadow-sm">
                {/* Janela Simulada */}
                <div className="flex items-center gap-1.5 mb-2 px-1">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
                  <span className="text-[10px] text-muted-foreground font-mono ml-2">Navegador Web</span>
                </div>

                {/* Aba Ativa Simulada */}
                <div className="bg-white dark:bg-slate-950 rounded-t-lg px-3 py-2 flex items-center justify-between border-t border-x border-slate-300 dark:border-slate-800 shadow-xs max-w-[240px]">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={faviconUrl}
                      alt="Favicon Preview"
                      className="h-4 w-4 object-contain rounded shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_BRANDING.faviconUrl;
                      }}
                    />
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                      {brandName} — Início
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground ml-2 hover:text-slate-800 cursor-pointer">✕</span>
                </div>

                {/* Corpo da página simulada */}
                <div className="bg-white dark:bg-slate-950 p-4 rounded-b-lg border border-slate-300 dark:border-slate-800 text-center space-y-1">
                  <div className="inline-flex items-center justify-center p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 mb-1">
                    <img
                      src={faviconUrl}
                      alt="Favicon"
                      className="h-8 w-8 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_BRANDING.faviconUrl;
                      }}
                    />
                  </div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Favicon Ativo na Aba
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Ao salvar, o ícone da sua aba no navegador é trocado em tempo real.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BARRA INFERIOR DE CONFIRMAÇÃO */}
        <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>As alterações são aplicadas instantaneamente para todos os usuários da plataforma.</span>
          </div>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#6b26d9] hover:bg-[#581c87] text-white text-xs font-semibold px-6 shadow-sm w-full sm:w-auto"
          >
            <Save className="h-4 w-4 mr-2" /> {isSaving ? 'Salvando...' : 'Salvar Logo & Favicon'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

