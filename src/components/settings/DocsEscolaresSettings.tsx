import React, { useState, useRef } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  DocumentoEscolarTemplate,
  DEFAULT_DOCUMENTOS_ESCOLARES,
  TAGS_DISPONIVEIS_DOCUMENTO,
  TipoVinculoDocumento,
} from '@/types/documentoEscolar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  Eye,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Code,
  Tag,
  Scissors,
  CheckCircle2,
  FileDown,
} from 'lucide-react';
import { toast } from 'sonner';

export const DocsEscolaresSettings: React.FC = () => {
  const [documentos, setDocumentos] = useLocalStorage<DocumentoEscolarTemplate[]>(
    'escolinha_documentos_escolares',
    DEFAULT_DOCUMENTOS_ESCOLARES
  );

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentoEscolarTemplate | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentoEscolarTemplate | null>(null);

  // Form states
  const [formTitulo, setFormTitulo] = useState('');
  const [formTipoVinculo, setFormTipoVinculo] = useState<TipoVinculoDocumento>('todos');
  const [formDescricao, setFormDescricao] = useState('');
  const [formConteudoHtml, setFormConteudoHtml] = useState('');
  const [isHtmlSourceMode, setIsHtmlSourceMode] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);

  const handleOpenNew = () => {
    setEditingDoc(null);
    setFormTitulo('');
    setFormTipoVinculo('todos');
    setFormDescricao('');
    setFormConteudoHtml(
      `<div style="font-family: 'Times New Roman', serif; line-height: 1.6; color: #111;">\n  <h2 style="text-align: center; text-transform: uppercase;">{{escola_nome}}</h2>\n  <h3 style="text-align: center;">TÍTULO DO DOCUMENTO</h3>\n  <p>Conteúdo do documento aqui...</p>\n</div>`
    );
    setIsHtmlSourceMode(false);
    setIsEditModalOpen(true);
  };

  const handleOpenEdit = (doc: DocumentoEscolarTemplate) => {
    setEditingDoc(doc);
    setFormTitulo(doc.titulo);
    setFormTipoVinculo(doc.tipoVinculo);
    setFormDescricao(doc.descricao || '');
    setFormConteudoHtml(doc.conteudoHtml);
    setIsHtmlSourceMode(false);
    setIsEditModalOpen(true);
  };

  const handleSaveDoc = () => {
    if (!formTitulo.trim()) {
      toast.error('Informe o título do documento');
      return;
    }

    let finalHtml = formConteudoHtml;
    if (editorRef.current && !isHtmlSourceMode) {
      finalHtml = editorRef.current.innerHTML;
    }

    if (editingDoc) {
      setDocumentos(
        documentos.map((d) =>
          d.id === editingDoc.id
            ? {
                ...d,
                titulo: formTitulo,
                tipoVinculo: formTipoVinculo,
                descricao: formDescricao,
                conteudoHtml: finalHtml,
              }
            : d
        )
      );
      toast.success('Modelo de documento atualizado com sucesso!');
    } else {
      const novo: DocumentoEscolarTemplate = {
        id: `doc-${Date.now()}`,
        titulo: formTitulo,
        tipoVinculo: formTipoVinculo,
        descricao: formDescricao,
        conteudoHtml: finalHtml,
        ativo: true,
        ordem: documentos.length + 1,
      };
      setDocumentos([...documentos, novo]);
      toast.success('Novo modelo de documento criado!');
    }

    setIsEditModalOpen(false);
  };

  const handleDeleteDoc = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este modelo de documento?')) {
      setDocumentos(documentos.filter((d) => d.id !== id));
      toast.success('Modelo removido.');
    }
  };

  const handleResetDefaults = () => {
    if (confirm('Restaurar todos os modelos padrão (Contrato, Adendo Contraturno, Ficha de Matrícula e Termo de Imagem)?')) {
      setDocumentos(DEFAULT_DOCUMENTOS_ESCOLARES);
      toast.success('Modelos restaurados para o padrão.');
    }
  };

  const handleToggleAtivo = (id: string, ativo: boolean) => {
    setDocumentos(documentos.map((d) => (d.id === id ? { ...d, ativo } : d)));
  };

  // Funções da barra de ferramentas do Editor Rico (WordPress style)
  const execCmd = (command: string, value: string | undefined = undefined) => {
    if (isHtmlSourceMode) return;
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setFormConteudoHtml(editorRef.current.innerHTML);
    }
  };

  const insertTagAtCursor = (tag: string) => {
    if (isHtmlSourceMode) {
      setFormConteudoHtml((prev) => prev + tag);
      return;
    }

    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand('insertText', false, tag);
      setFormConteudoHtml(editorRef.current.innerHTML);
    }
  };

  const insertPageBreak = () => {
    const pageBreakHtml = `<div style="page-break-after: always; break-after: page; border-top: 2px dashed #94a3b8; margin: 24px 0; text-align: center; color: #64748b; font-size: 11px; font-family: sans-serif;">[QUEBRA DE PÁGINA PARA IMPRESSÃO]</div><p>&nbsp;</p>`;
    if (isHtmlSourceMode) {
      setFormConteudoHtml((prev) => prev + '\n' + pageBreakHtml);
    } else {
      document.execCommand('insertHTML', false, pageBreakHtml);
      if (editorRef.current) {
        setFormConteudoHtml(editorRef.current.innerHTML);
      }
    }
  };

  const getBadgeVinculo = (tipo: TipoVinculoDocumento) => {
    switch (tipo) {
      case 'todos':
        return <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">Obrigatório (Geral)</Badge>;
      case 'contraturno':
        return <Badge className="bg-blue-600 text-white hover:bg-blue-700">Somente Contraturno</Badge>;
      case 'opcional':
        return <Badge variant="outline" className="text-slate-600 border-slate-300">Opcional na Matrícula</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-purple-600 h-5 w-5" />
            Documentos Escolares & Contratos
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure os modelos impressos na matrícula (Contratos, Fichas, Adendo de Contraturno e Termos) com editor rico e tags dinâmicas.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleResetDefaults} className="gap-1.5 text-xs text-slate-600">
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar Padrões
          </Button>
          <Button size="sm" onClick={handleOpenNew} className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white">
            <Plus className="h-4 w-4" />
            Novo Documento
          </Button>
        </div>
      </div>

      {/* Lista de Modelos Cadastrados */}
      <div className="grid gap-4 md:grid-cols-2">
        {documentos.map((doc) => (
          <Card key={doc.id} className={`transition-all ${!doc.ativo ? 'opacity-60 bg-slate-50' : 'hover:shadow-md'}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-600 shrink-0" />
                    <span>{doc.titulo}</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {doc.descricao || 'Modelo pronto para impressão na matrícula.'}
                  </CardDescription>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {getBadgeVinculo(doc.tipoVinculo)}
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="flex items-center justify-between border-t pt-3 mt-2 text-xs">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={doc.ativo}
                    onCheckedChange={(checked) => handleToggleAtivo(doc.id, checked)}
                    id={`active-${doc.id}`}
                  />
                  <Label htmlFor={`active-${doc.id}`} className="text-xs cursor-pointer text-slate-600">
                    {doc.ativo ? 'Ativo na Matrícula' : 'Inativo'}
                  </Label>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPreviewDoc(doc);
                      setIsPreviewModalOpen(true);
                    }}
                    className="h-7 text-xs text-slate-600 hover:text-purple-700"
                    title="Visualizar Impressão"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    Visualizar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(doc)}
                    className="h-7 text-xs gap-1"
                  >
                    <Pencil className="h-3 w-3" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteDoc(doc.id)}
                    className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Excluir"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* MODAL DO EDITOR RICO ESTILO WORDPRESS */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b bg-slate-50">
            <DialogTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileText className="text-purple-600 h-5 w-5" />
              {editingDoc ? `Editar Modelo: ${editingDoc.titulo}` : 'Criar Novo Modelo de Documento'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold">Título do Documento *</Label>
                <Input
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  placeholder="Ex: Contrato de Prestação de Serviços"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Vínculo na Matrícula *</Label>
                <Select
                  value={formTipoVinculo}
                  onValueChange={(val) => setFormTipoVinculo(val as TipoVinculoDocumento)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Sempre (Geral / Obrigatório)</SelectItem>
                    <SelectItem value="contraturno">Somente se Contraturno</SelectItem>
                    <SelectItem value="opcional">Opcional na Matrícula</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Descrição / Finalidade</Label>
              <Input
                value={formDescricao}
                onChange={(e) => setFormDescricao(e.target.value)}
                placeholder="Breve instrução sobre quando e como este documento é utilizado"
              />
            </div>

            {/* BARRA DE FERRAMENTAS DO EDITOR RICO (ESTILO WORDPRESS) */}
            <div className="border rounded-xl bg-white shadow-sm overflow-hidden flex flex-col">
              <div className="bg-slate-100 p-2 border-b flex flex-wrap items-center gap-1 text-xs">
                {/* Cabeçalhos */}
                <button
                  type="button"
                  onClick={() => execCmd('formatBlock', '<h2>')}
                  className="p-1.5 hover:bg-white rounded text-slate-700 font-bold"
                  title="Título 1 (H2)"
                >
                  <Heading1 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execCmd('formatBlock', '<h3>')}
                  className="p-1.5 hover:bg-white rounded text-slate-700 font-semibold"
                  title="Título 2 (H3)"
                >
                  <Heading2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execCmd('formatBlock', '<h4>')}
                  className="p-1.5 hover:bg-white rounded text-slate-700"
                  title="Título 3 (H4)"
                >
                  <Heading3 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execCmd('formatBlock', '<p>')}
                  className="px-2 py-1 hover:bg-white rounded text-slate-700 font-serif"
                  title="Parágrafo Normal"
                >
                  Texto Normal
                </button>

                <div className="h-4 w-px bg-slate-300 mx-1" />

                {/* Formatações Básicas */}
                <button
                  type="button"
                  onClick={() => execCmd('bold')}
                  className="p-1.5 hover:bg-white rounded text-slate-700 font-bold"
                  title="Negrito"
                >
                  <Bold className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execCmd('italic')}
                  className="p-1.5 hover:bg-white rounded text-slate-700 italic"
                  title="Itálico"
                >
                  <Italic className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execCmd('underline')}
                  className="p-1.5 hover:bg-white rounded text-slate-700 underline"
                  title="Sublinhado"
                >
                  <Underline className="h-4 w-4" />
                </button>

                <div className="h-4 w-px bg-slate-300 mx-1" />

                {/* Alinhamento */}
                <button
                  type="button"
                  onClick={() => execCmd('justifyLeft')}
                  className="p-1.5 hover:bg-white rounded text-slate-700"
                  title="Alinhar à Esquerda"
                >
                  <AlignLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execCmd('justifyCenter')}
                  className="p-1.5 hover:bg-white rounded text-slate-700"
                  title="Centralizar"
                >
                  <AlignCenter className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execCmd('justifyRight')}
                  className="p-1.5 hover:bg-white rounded text-slate-700"
                  title="Alinhar à Direita"
                >
                  <AlignRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execCmd('justifyFull')}
                  className="p-1.5 hover:bg-white rounded text-slate-700"
                  title="Justificar"
                >
                  <AlignJustify className="h-4 w-4" />
                </button>

                <div className="h-4 w-px bg-slate-300 mx-1" />

                {/* Listas */}
                <button
                  type="button"
                  onClick={() => execCmd('insertUnorderedList')}
                  className="p-1.5 hover:bg-white rounded text-slate-700"
                  title="Lista com Marcadores"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execCmd('insertOrderedList')}
                  className="p-1.5 hover:bg-white rounded text-slate-700"
                  title="Lista Numerada"
                >
                  <ListOrdered className="h-4 w-4" />
                </button>

                <div className="h-4 w-px bg-slate-300 mx-1" />

                {/* Quebra de Página para Impressão */}
                <button
                  type="button"
                  onClick={insertPageBreak}
                  className="px-2 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 rounded font-medium flex items-center gap-1"
                  title="Inserir quebra de folha na impressão"
                >
                  <Scissors className="h-3.5 w-3.5 text-amber-600" />
                  Quebra de Página
                </button>

                {/* Alternador Código HTML */}
                <button
                  type="button"
                  onClick={() => {
                    if (!isHtmlSourceMode && editorRef.current) {
                      setFormConteudoHtml(editorRef.current.innerHTML);
                    }
                    setIsHtmlSourceMode(!isHtmlSourceMode);
                  }}
                  className={`ml-auto px-2 py-1 rounded font-medium flex items-center gap-1 ${
                    isHtmlSourceMode ? 'bg-purple-600 text-white' : 'hover:bg-white text-slate-700'
                  }`}
                  title="Alternar entre Visual e Código HTML"
                >
                  <Code className="h-3.5 w-3.5" />
                  {isHtmlSourceMode ? 'Visual' : 'Código HTML'}
                </button>
              </div>

              {/* PAINEL DE TAGS DINÂMICAS DISPONÍVEIS */}
              <div className="bg-slate-50/80 p-2.5 border-b">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 mb-1.5">
                  <Tag className="h-3.5 w-3.5 text-purple-600" />
                  <span>Clique nas variáveis para inserir no cursor:</span>
                </div>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                  {TAGS_DISPONIVEIS_DOCUMENTO.map((t) => (
                    <button
                      key={t.tag}
                      type="button"
                      onClick={() => insertTagAtCursor(t.tag)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 border border-slate-200 rounded text-[11px] text-slate-700 font-mono transition-colors"
                      title={t.label}
                    >
                      <span className="font-bold text-purple-600">{t.tag}</span>
                      <span className="text-[10px] text-slate-400">({t.label})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ÁREA DE EDIÇÃO */}
              <div className="p-4 min-h-[360px] max-h-[500px] overflow-y-auto bg-white">
                {isHtmlSourceMode ? (
                  <Textarea
                    value={formConteudoHtml}
                    onChange={(e) => setFormConteudoHtml(e.target.value)}
                    className="font-mono text-xs h-[360px] w-full"
                    placeholder="Código HTML do documento..."
                  />
                ) : (
                  <div
                    ref={editorRef}
                    contentEditable
                    dangerouslySetInnerHTML={{ __html: formConteudoHtml }}
                    onBlur={() => {
                      if (editorRef.current) {
                        setFormConteudoHtml(editorRef.current.innerHTML);
                      }
                    }}
                    className="outline-none min-h-[360px] font-serif text-sm leading-relaxed p-4 border border-dashed rounded-lg bg-slate-50/30 focus:bg-white focus:border-purple-300"
                  />
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 border-t bg-slate-50">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveDoc} className="bg-purple-600 hover:bg-purple-700 text-white">
              Salvar Modelo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE PRÉ-VISUALIZAÇÃO DE IMPRESSÃO EM FOLHA A4 */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0">
          <DialogHeader className="p-4 border-b bg-slate-50">
            <DialogTitle className="text-base font-bold flex items-center justify-between">
              <span>Visualização: {previewDoc?.titulo}</span>
              <Badge variant="outline" className="text-xs">Visualização A4</Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
            <div
              className="bg-white p-8 rounded shadow-md max-w-2xl mx-auto min-h-[600px] border"
              dangerouslySetInnerHTML={{ __html: previewDoc?.conteudoHtml || '' }}
            />
          </div>

          <DialogFooter className="p-4 border-t bg-slate-50">
            <Button variant="outline" onClick={() => setIsPreviewModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
