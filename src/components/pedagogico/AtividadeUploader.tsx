import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Paperclip, FileText, Trash2, Plus, FileUp, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export interface AtividadeAnexo {
  id: string;
  nome: string;
  descricao?: string;
  arquivoNome?: string;
  arquivoTamanho?: string;
  arquivoUrl?: string;
}

interface AtividadeUploaderProps {
  atividades: AtividadeAnexo[];
  onAddAtividade: (atv: AtividadeAnexo) => void;
  onRemoveAtividade: (id: string) => void;
}

export const AtividadeUploader: React.FC<AtividadeUploaderProps> = ({
  atividades,
  onAddAtividade,
  onRemoveAtividade,
}) => {
  const [nomeAtividade, setNomeAtividade] = useState('');
  const [descricao, setDescricao] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ nome: string; tamanho: string; url: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const tamanhoFormatted = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
      const fakeUrl = URL.createObjectURL(file);
      setSelectedFile({
        nome: file.name,
        tamanho: tamanhoFormatted,
        url: fakeUrl,
      });
      toast.success(`Arquivo "${file.name}" anexado!`);
    }
  };

  const handleCreateAtividade = () => {
    if (!nomeAtividade.trim()) {
      toast.error('Digite o nome da atividade.');
      return;
    }

    const newAtv: AtividadeAnexo = {
      id: crypto.randomUUID(),
      nome: nomeAtividade.trim(),
      descricao: descricao.trim() || undefined,
      arquivoNome: selectedFile?.nome,
      arquivoTamanho: selectedFile?.tamanho,
      arquivoUrl: selectedFile?.url,
    };

    onAddAtividade(newAtv);
    toast.success(`Atividade "${newAtv.nome}" criada! Você pode mencioná-la usando @${newAtv.nome}`);

    // Reset Form
    setNomeAtividade('');
    setDescricao('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-800">Atividades & Materiais Anexos</h4>
          <p className="text-xs text-slate-500">
            Cadastre atividades da aula para mencioná-las no conteúdo usando <code className="text-emerald-700 font-bold">@nome</code>.
          </p>
        </div>
      </div>

      {/* Form de Criação de Atividade */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-slate-200">
        <div>
          <Label className="text-xs font-medium text-slate-700">Nome da Atividade *</Label>
          <Input
            value={nomeAtividade}
            onChange={(e) => setNomeAtividade(e.target.value)}
            placeholder="Ex: Circuito Motor, Passe em Dupla"
            className="h-9 text-xs mt-1"
          />
        </div>

        <div>
          <Label className="text-xs font-medium text-slate-700">Arquivo Anexo (PDF, Doc, Imagem)</Label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip"
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="h-9 text-xs gap-1.5 w-full bg-slate-50 hover:bg-slate-100"
            >
              <FileUp className="h-3.5 w-3.5 text-slate-600" />
              {selectedFile ? 'Trocar Arquivo' : 'Upload de Arquivo (PDF)'}
            </Button>
          </div>
        </div>

        <div className="md:col-span-2">
          <Label className="text-xs font-medium text-slate-700">Descrição / Instruções da Atividade (Opcional)</Label>
          <Input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Detalhes ou regras da atividade..."
            className="h-9 text-xs mt-1"
          />
        </div>

        {selectedFile && (
          <div className="md:col-span-2 flex items-center justify-between bg-emerald-50 text-emerald-900 px-3 py-1.5 rounded text-xs border border-emerald-200">
            <span className="flex items-center gap-2 font-medium truncate">
              <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
              {selectedFile.nome} ({selectedFile.tamanho})
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-emerald-700 hover:text-red-600 hover:bg-emerald-100"
              onClick={() => setSelectedFile(null)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        <div className="md:col-span-2 flex justify-end">
          <Button
            type="button"
            onClick={handleCreateAtividade}
            size="sm"
            className="bg-slate-800 hover:bg-slate-900 text-white text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar Atividade à Aula
          </Button>
        </div>
      </div>

      {/* Lista de Atividades Cadastradas */}
      {atividades.length > 0 && (
        <div className="space-y-2 pt-1">
          <span className="text-xs font-semibold text-slate-600 block">
            Atividades vinculadas a esta aula ({atividades.length}):
          </span>
          <div className="grid grid-cols-1 gap-2">
            {atividades.map((atv) => (
              <div
                key={atv.id}
                className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      @{atv.nome}
                    </span>
                    {atv.arquivoNome && (
                      <span className="flex items-center gap-1 text-slate-500 text-[11px] bg-slate-100 px-2 py-0.5 rounded">
                        <Paperclip className="h-3 w-3" /> {atv.arquivoNome}
                      </span>
                    )}
                  </div>
                  {atv.descricao && <p className="text-slate-600 pl-1">{atv.descricao}</p>}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                  onClick={() => onRemoveAtividade(atv.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
