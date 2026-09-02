import React, { useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const EditableCell = ({ defaultValue }: { defaultValue?: string }) => (
  <Textarea 
    className="min-h-[80px] text-xs resize-none border-dashed border-gray-300 shadow-none bg-transparent hover:bg-white focus:bg-white p-2" 
    placeholder="Digite aqui..." 
    defaultValue={defaultValue} 
  />
);

const AtividadeGroup = ({ defaultType, defaultValue, defaultMatObrig, defaultMatOpc, rowSpan = 1 }: { defaultType: 'classe' | 'casa', defaultValue?: string, defaultMatObrig?: string, defaultMatOpc?: string, rowSpan?: number }) => {
  const [tipo, setTipo] = useState<'classe' | 'casa'>(defaultType);
  return (
    <>
      <td className="border border-gray-400 p-1 align-top text-center" rowSpan={rowSpan}>
        <div className="flex gap-2 justify-center mb-2 text-xs font-bold text-purple-800 bg-purple-50 p-1 rounded">
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="radio" name={`tipo-${Math.random()}`} checked={tipo === 'classe'} onChange={() => setTipo('classe')} /> Classe
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="radio" name={`tipo-${Math.random()}`} checked={tipo === 'casa'} onChange={() => setTipo('casa')} /> Casa
          </label>
        </div>
        <EditableCell defaultValue={defaultValue} />
      </td>
      <td className={`border border-gray-400 p-1 align-top ${tipo === 'casa' ? 'bg-gray-100' : ''}`} rowSpan={rowSpan}>
        {tipo === 'classe' ? <EditableCell defaultValue={defaultMatObrig} /> : <span className="text-gray-400 text-xs italic p-2 block text-center mt-4">N/A (Casa)</span>}
      </td>
      <td className={`border border-gray-400 p-1 align-top ${tipo === 'casa' ? 'bg-gray-100' : ''}`} rowSpan={rowSpan}>
        {tipo === 'classe' ? <EditableCell defaultValue={defaultMatOpc} /> : <span className="text-gray-400 text-xs italic p-2 block text-center mt-4">N/A (Casa)</span>}
      </td>
    </>
  );
};

export const TrilhasEstudosTab = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Trilhas de Estudos</h2>
          <p className="text-sm text-gray-500">Planejamento semanal de atividades</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        <div className="min-w-[1100px] p-4">
          <div className="flex justify-between items-center mb-4 text-purple-700 font-bold text-lg border-b-2 border-purple-500 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">↺</span> 
              <span>interagir</span>
            </div>
            <div>TRILHAS DE ESTUDOS TURMA: G05 A/B</div>
            <div>PERÍODO: SETEMBRO</div>
          </div>

          <table className="w-full border-collapse border border-gray-400 text-sm">
            <thead>
              <tr className="bg-[#8b5cf6] text-gray-900 font-bold">
                <th className="border border-gray-400 p-2 text-center w-24">Dia</th>
                <th className="border border-gray-400 p-2 text-center w-24">Horário</th>
                <th className="border border-gray-400 p-2 text-center">Campo de<br/>Experiência</th>
                <th className="border border-gray-400 p-2 text-center text-blue-800 bg-blue-100/50">Competência<br/>BNCC</th>
                <th className="border border-gray-400 p-2 text-center">Conteúdos</th>
                <th className="border border-gray-400 p-2 text-center w-56">Atividade<br/>(Classe/Casa)</th>
                <th className="border border-gray-400 p-2 text-center w-32">Material<br/>Obrigatório</th>
                <th className="border border-gray-400 p-2 text-center w-32">Material<br/>Opcional</th>
              </tr>
            </thead>
            <tbody>
              {/* TERÇA-FEIRA */}
              <tr className="bg-gray-100">
                <td className="border border-gray-400 p-0 text-center font-bold bg-[#8b5cf6]" rowSpan={5}>
                  <div className="writing-vertical-lr transform -rotate-180 whitespace-nowrap p-2 m-auto" style={{ writingMode: 'vertical-lr' }}>
                    Terça-feira 01/09
                  </div>
                </td>
                <td className="border border-gray-400 p-1 text-center text-xs font-semibold" colSpan={7}>
                  <div className="flex justify-between px-10">
                    <span>07:30 às 08:00/ 13:00 às 13:30 Acolhida</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-1 text-center text-xs font-semibold" colSpan={7}>
                  <div className="flex justify-between px-10">
                    <span>08:00 às 08:30/ 15:40 às 16:10 Inglês</span>
                  </div>
                </td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-2 text-center text-xs">
                  <div className="text-red-700 font-bold">08:30 às 09:00</div>
                  <div className="text-red-700 font-bold">13:40 às 14:10</div>
                </td>
                <td className="border border-gray-400 p-1 text-center font-semibold align-top">
                  <EditableCell defaultValue="Rodinha" />
                </td>
                <td className="border border-gray-400 p-1 text-center align-top bg-blue-50/30">
                  <EditableCell defaultValue="EI03EO01" />
                </td>
                <td className="border border-gray-400 p-1 text-center align-top">
                  <EditableCell defaultValue="Chamadinha,&#10;quantos somos,&#10;Leitura dos números" />
                </td>
                
                {/* Aqui era a atividade de classe e materiais, que tinham rowSpan=3 na original. */}
                <AtividadeGroup 
                  defaultType="classe" 
                  defaultValue="Contação de história&#10;Explicação da atividade do dia e&#10;de casa" 
                  rowSpan={3} 
                />
              </tr>
              <tr>
                <td className="border border-gray-400 p-1 text-center text-xs font-semibold bg-gray-100" colSpan={7}>
                  09:00 às 09:30/ 14:40 às 15:10 Corpo, Gestos e Movimentos (Capoeira)
                </td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-1 text-center text-xs font-semibold bg-gray-100" colSpan={7}>
                  09:30 às 10:00/ 15:10 às 15:40 Lanche/recreação
                </td>
              </tr>
              
              <tr>
                <td className="border border-gray-400 p-0 text-center font-bold bg-[#8b5cf6]">
                  <div className="writing-vertical-lr transform -rotate-180 whitespace-nowrap p-2 m-auto" style={{ writingMode: 'vertical-lr' }}>
                    Educação Física
                  </div>
                </td>
                <td className="border border-gray-400 p-2 text-center text-xs">
                  <div className="text-red-700 font-bold">10:00 às 10:30</div>
                  <div className="text-red-700 font-bold">16:10 às 16:40</div>
                </td>
                <td className="border border-gray-400 p-1 text-center font-semibold align-top">
                  <EditableCell defaultValue="Espaços, Tempos,&#10;Quantidades,&#10;Relações e&#10;Transformações" />
                </td>
                <td className="border border-gray-400 p-1 text-center align-top bg-blue-50/30">
                  <EditableCell defaultValue="EI03ET07" />
                </td>
                <td className="border border-gray-400 p-1 text-center align-top">
                  <EditableCell defaultValue="Cresci Corpo" />
                </td>
                
                <AtividadeGroup 
                  defaultType="classe" 
                  defaultValue="Livro P. 147/148"
                  defaultMatObrig="Orientação P.14/148"
                />
              </tr>


              {/* QUARTA-FEIRA */}
              <tr className="bg-[#8eb8e6] border-t-4 border-gray-500">
                <td className="border border-gray-400 p-0 text-center font-bold" rowSpan={6}>
                  <div className="writing-vertical-lr transform -rotate-180 whitespace-nowrap p-2 m-auto" style={{ writingMode: 'vertical-lr' }}>
                    Quarta-feira 02/09
                  </div>
                </td>
                <td className="border border-gray-400 p-2 text-center font-bold text-gray-800" colSpan={7}>
                  Campo de Experiência / BNCC / Conteúdos / Atividade / Materiais
                </td>
              </tr>
              <tr className="bg-blue-50">
                <td className="border border-gray-400 p-1 text-center text-xs font-semibold" colSpan={7}>
                  10:30 às 11:00/ 14:10 às 14:40 Música<br/>
                  11:10 às 11:30/ 16:40 às 17:00 Arrumação saída
                </td>
              </tr>
              <tr className="bg-blue-50">
                <td className="border border-gray-400 p-1 text-center text-xs font-semibold" colSpan={7}>
                  07:30 às 08:00/ 13:00 às 13:30 Acolhida<br/>
                  08:00 às 08:30/ Balé
                </td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-2 text-center text-xs">
                  <div className="text-red-700 font-bold">08:00 às 08:20</div>
                  <div className="text-red-700 font-bold">13:30 às 13:50</div>
                </td>
                <td className="border border-gray-400 p-1 text-center font-semibold align-top">
                  <EditableCell defaultValue="Rodinha" />
                </td>
                <td className="border border-gray-400 p-1 text-center align-top bg-blue-50/30">
                  <EditableCell defaultValue="EI03EF01" />
                </td>
                <td className="border border-gray-400 p-1 text-center align-top">
                  <EditableCell defaultValue="Chamadinha,&#10;quantos somos,&#10;palavra do dia" />
                </td>
                
                <AtividadeGroup 
                  defaultType="casa" 
                  defaultValue="Contação de história&#10;Explicação da atividade do dia e&#10;de casa. Livro / Mar letrado. Livro P.158/159"
                  rowSpan={3} 
                />
              </tr>
              <tr>
                <td className="border border-gray-400 p-2 text-center text-xs">
                  <div className="text-red-700 font-bold">08:20 às 09:00</div>
                  <div className="text-red-700 font-bold">13:50 às 14:30</div>
                </td>
                <td className="border border-gray-400 p-1 text-center font-semibold align-top">
                  <EditableCell defaultValue="Escuta, fala,&#10;pensamento e&#10;imaginação" />
                </td>
                <td className="border border-gray-400 p-1 text-center align-top bg-blue-50/30">
                  <EditableCell defaultValue="EI03EF04" />
                </td>
                <td className="border border-gray-400 p-1 text-center align-top">
                  <EditableCell defaultValue="Leitura&#10;Caveiras" />
                </td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-1 text-center text-xs font-semibold bg-gray-100" colSpan={7}>
                  09:00 às 09:30/ 14:20 às 14:50 Lanche/recreação
                </td>
              </tr>
              <tr>
                 <td className="border border-gray-400 p-0 text-center font-bold bg-[#8eb8e6]">
                  <div className="writing-vertical-lr transform -rotate-180 whitespace-nowrap p-2 m-auto" style={{ writingMode: 'vertical-lr' }}>
                    Vespertino
                  </div>
                </td>
                <td className="border border-gray-400 p-2 text-center text-xs">
                  <div className="text-red-700 font-bold">09:00 às 09:50</div>
                  <div className="text-red-700 font-bold">15:00 às 15:40</div>
                </td>
                <td className="border border-gray-400 p-1 text-center font-semibold align-top">
                  <EditableCell defaultValue="Espaços, Tempos,&#10;Quantidades,&#10;Relações e&#10;Transformações" />
                </td>
                <td className="border border-gray-400 p-1 text-center align-top bg-blue-50/30">
                  <EditableCell defaultValue="EI03ET06" />
                </td>
                <td className="border border-gray-400 p-1 text-center align-top">
                  <EditableCell defaultValue="Medida de Tempo&#10;Relógio" />
                </td>
                
                <AtividadeGroup 
                  defaultType="classe" 
                  defaultValue="Livro p. 153"
                  defaultMatObrig="Orientação p. 153"
                  rowSpan={2}
                />
              </tr>
              <tr>
                 <td className="border border-gray-400 p-0 text-center font-bold bg-[#8eb8e6]">
                  <div className="writing-vertical-lr transform -rotate-180 whitespace-nowrap p-2 m-auto" style={{ writingMode: 'vertical-lr' }}>
                     (Inglês)
                  </div>
                </td>
                <td className="border border-gray-400 p-2 text-center text-xs">
                  <div className="text-red-700 font-bold">10:20 às 11:10</div>
                  <div className="text-red-700 font-bold">15:40 às 16:10</div>
                </td>
                <td className="border border-gray-400 p-1 text-center font-semibold align-top">
                  <EditableCell defaultValue="Traços, Sons, Cores e&#10;Formas" />
                </td>
                <td className="border border-gray-400 p-1 text-center align-top bg-blue-50/30">
                  <EditableCell defaultValue="EI03TS02" />
                </td>
                <td className="border border-gray-400 p-1 text-center align-top">
                  <EditableCell defaultValue="Pintura Abstrata com&#10;Carimbo de&#10;Borboleta e Texturas" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
