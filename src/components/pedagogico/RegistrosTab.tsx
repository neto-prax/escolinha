import { useMemo, useState, useRef } from 'react';
import { driveAction } from '@/lib/googleDrive';
import { uploadToDrive } from '@/lib/driveUpload';
import type { Json } from '@/integrations/supabase/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { DEFAULT_TURMAS_PEDAGOGICO, TurmaPedagogica } from '@/types/pedagogico';
import { useGoogleDriveStatus } from '@/components/settings/GoogleDriveSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, ExternalLink, Film, Image as ImageIcon, Loader2, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

interface Arquivo {
  drive_file_id: string;
  nome: string;
  mime_type: string;
  tamanho_bytes: number;
  web_view_link?: string;
}
interface Registro {
  id: string;
  turma_id: string;
  turma_nome: string;
  titulo: string;
  descricao: string | null;
  tags: string[];
  data_registro: string;
  professor_id: string;
  professor_nome: string | null;
  arquivos: Arquivo[];
}

const formatSize = (b: number) => (b > 1e9 ? `${(b / 1e9).toFixed(1)} GB` : `${(b / 1e6).toFixed(1)} MB`);

export const RegistrosTab = () => {
  const { user, profile } = useAuth();
  const schoolId = profile?.school_id;
  const qc = useQueryClient();
  const [turmas] = useLocalStorage<TurmaPedagogica[]>('escolinha_turmas_pedagogico_v1', DEFAULT_TURMAS_PEDAGOGICO);
  const { data: drive } = useGoogleDriveStatus();

  const [filtroTurma, setFiltroTurma] = useState('all');
  const [busca, setBusca] = useState('');
  const [open, setOpen] = useState(false);

  const { data: registros = [], isLoading, error: recordsError } = useQuery({
    queryKey: ['pedagogico-registros', schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase
        .from('pedagogico_registros')
        .select('*')
        .eq('school_id', schoolId)
        .order('data_registro', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as Registro[];
    },
  });

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase();
    return registros.filter(
      (r) =>
        (filtroTurma === 'all' || r.turma_id === filtroTurma) &&
        (!q || r.titulo.toLowerCase().includes(q) || r.tags.some((t) => t.toLowerCase().includes(q)) || (r.descricao ?? '').toLowerCase().includes(q))
    );
  }, [registros, filtroTurma, busca]);

  const excluir = async (id: string) => {
    if (!confirm('Excluir este registro? Os arquivos permanecem no Google Drive.')) return;
    const { error } = await supabase.from('pedagogico_registros').delete().eq('id', id);
    if (error) return toast.error('Sem permissão para excluir.');
    qc.invalidateQueries({ queryKey: ['pedagogico-registros'] });
  };

  return (
    <div className="space-y-4">
      {drive && !drive.connected && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
          O Google Drive da escola ainda não foi conectado. A direção precisa conectá-lo em Configurações → Pedagógico → Google Drive.
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1 min-w-0">
          <Select value={filtroTurma} onValueChange={setFiltroTurma}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Turma" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as turmas</SelectItem>
              {turmas.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Buscar por título ou etiqueta" value={busca} onChange={(e) => setBusca(e.target.value)} className="max-w-xs" />
        </div>
        <Button onClick={() => setOpen(true)} disabled={!drive?.connected}>
          <Plus size={16} className="mr-1" /> Novo registro
        </Button>
      </div>

      {recordsError ? <p className="text-destructive">Não foi possível carregar os registros.</p> : isLoading ? (
        <Loader2 className="animate-spin text-muted-foreground" />
      ) : filtrados.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Camera className="mx-auto mb-2" /> Nenhum registro ainda.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between gap-2">
                  <div>
                    <h3 className="font-semibold break-words">{r.titulo}</h3>
                    <p className="text-xs text-muted-foreground">
                      {r.turma_nome} · {new Date(r.data_registro + 'T12:00:00').toLocaleDateString('pt-BR')}
                      {r.professor_nome ? ` · ${r.professor_nome}` : ''}
                    </p>
                  </div>
                  {r.professor_id === user?.id && (
                    <Button size="icon" variant="ghost" aria-label="Excluir registro" onClick={() => excluir(r.id)}><Trash2 size={14} /></Button>
                  )}
                </div>
                {r.descricao && <p className="text-sm whitespace-pre-line">{r.descricao}</p>}
                {r.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">{r.tags.map((t) => <Badge key={t} variant="secondary">#{t}</Badge>)}</div>
                )}
                <div className="space-y-1 pt-1">
                  {r.arquivos[0] && <iframe title={`Visualização: ${r.titulo}`} src={`https://drive.google.com/file/d/${encodeURIComponent(r.arquivos[0].drive_file_id)}/preview`} className="w-full aspect-video rounded border border-border" allow="fullscreen" loading="lazy" />}
                  {r.arquivos.map((a) => (
                    <a key={a.drive_file_id} href={a.web_view_link || `https://drive.google.com/file/d/${a.drive_file_id}/view`} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline">
                      {a.mime_type.startsWith('video') ? <Film size={14} /> : <ImageIcon size={14} />}
                      <span className="truncate flex-1">{a.nome}</span>
                      <ExternalLink size={12} />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <NovoRegistroDialog
        open={open}
        onOpenChange={setOpen}
        turmas={turmas}
        onSaved={() => qc.invalidateQueries({ queryKey: ['pedagogico-registros'] })}
      />
    </div>
  );
};

const NovoRegistroDialog = ({ open, onOpenChange, turmas, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; turmas: TurmaPedagogica[]; onSaved: () => void;
}) => {
  const { user, profile } = useAuth();
  const [turmaId, setTurmaId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);
  const completed = useRef(new Map<File, Arquivo>());

  const reset = () => {
    setTurmaId(''); setTitulo(''); setDescricao(''); setTags([]); setTagInput(''); setFiles([]); setProgress({}); completed.current.clear();
  };

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, '');
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  };

  const salvar = async () => {
    if (!user || !profile?.school_id) return toast.error('Faça login novamente para salvar.');
    const turma = turmas.find((t) => t.id === turmaId);
    if (!turma || !titulo.trim() || files.length === 0) return toast.error('Informe turma, título e pelo menos um arquivo.');
    if (!data) return toast.error('Informe a data do registro.');
    if (files.some(f => !/^(image|video)\//.test(f.type) || !f.size)) return toast.error('Selecione apenas fotos e vídeos não vazios.');
    setSaving(true);
    try {
      const arquivos: Arquivo[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const uploaded = completed.current.get(f);
        if (uploaded) { arquivos.push(uploaded); continue; }
        const sess = await driveAction<{ upload_url: string }>({ action: 'upload-session', turma_id: turma.id, turma_nome: turma.nome, file_name: f.name, mime_type: f.type, size: f.size, origin: window.location.origin });
        const result = await uploadToDrive(sess.upload_url, f, (p) => setProgress((prev) => ({ ...prev, [i]: p })));
        const arquivo: Arquivo = { drive_file_id: result.id, nome: result.name || f.name, mime_type: result.mimeType || f.type, tamanho_bytes: f.size, web_view_link: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view` };
        completed.current.set(f, arquivo);
        arquivos.push(arquivo);
      }
      const finalTag = tagInput.trim().replace(/^#/, '');
      const { error } = await supabase.from('pedagogico_registros').insert({
        school_id: profile.school_id, turma_id: turma.id, turma_nome: turma.nome, titulo: titulo.trim(),
        descricao: descricao.trim() || null, tags: finalTag && !tags.includes(finalTag) ? [...tags, finalTag] : tags, data_registro: data, professor_id: user.id,
        professor_nome: profile.full_name ?? null, arquivos: arquivos as unknown as Json,
      });
      if (error) throw error;
      toast.success('Registro salvo no Google Drive!');
      reset(); onOpenChange(false); onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar registro');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>Novo registro do dia</DialogTitle></DialogHeader>
        <fieldset disabled={saving} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Turma</Label>
              <Select value={turmaId} onValueChange={(id) => { if (completed.current.size) { toast.error('Conclua este registro antes de trocar a turma.'); return; } setTurmaId(id); }}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{turmas.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Data</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
          </div>
          <div><Label>Título</Label><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={200} /></div>
          <div><Label>Descrição</Label><Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} /></div>
          <div>
            <Label>Etiquetas</Label>
            <div className="flex gap-2">
              <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="ex.: artes"
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }} />
              <Button type="button" variant="outline" onClick={addTag}>Adicionar</Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {tags.map((t) => (
                <Badge key={t} variant="secondary" className="gap-1">#{t}
                  <X size={12} className="cursor-pointer" onClick={() => setTags(tags.filter((x) => x !== t))} />
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <Label>Fotos e vídeos</Label>
            <Input type="file" multiple accept="image/*,video/*" onChange={(e) => setFiles([...files, ...Array.from(e.target.files ?? [])])} />
            <div className="space-y-2 mt-2">
              {files.map((f, i) => (
                <div key={i} className="text-sm">
                  <div className="flex items-center gap-2">
                    <span className="truncate flex-1">{f.name}</span>
                    <span className="text-xs text-muted-foreground">{formatSize(f.size)}</span>
                    {!saving && <X size={14} className="cursor-pointer" onClick={() => setFiles(files.filter((_, j) => j !== i))} />}
                  </div>
                  {saving && <Progress value={(progress[i] ?? 0) * 100} className="h-1.5 mt-1" />}
                </div>
              ))}
            </div>
          </div>
        </fieldset>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving}>
            {saving && <Loader2 className="mr-2 animate-spin" size={16} />} Salvar registro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
