export type TipoVinculoDocumento = 'todos' | 'contraturno' | 'opcional';

export interface DocumentoEscolarTemplate {
  id: string;
  titulo: string;
  tipoVinculo: TipoVinculoDocumento;
  descricao?: string;
  conteudoHtml: string;
  ativo: boolean;
  ordem: number;
}

export const TAGS_DISPONIVEIS_DOCUMENTO = [
  { tag: '{{nome_aluno}}', label: 'Nome do Aluno', categoria: 'Aluno' },
  { tag: '{{matricula}}', label: 'Matrícula', categoria: 'Aluno' },
  { tag: '{{data_nascimento}}', label: 'Data de Nascimento', categoria: 'Aluno' },
  { tag: '{{cpf_aluno}}', label: 'CPF do Aluno', categoria: 'Aluno' },
  { tag: '{{rg_aluno}}', label: 'RG do Aluno', categoria: 'Aluno' },
  { tag: '{{turma_regular}}', label: 'Turma Regular', categoria: 'Aluno' },
  { tag: '{{setor_regular}}', label: 'Setor Regular', categoria: 'Aluno' },
  { tag: '{{turma_contraturno}}', label: 'Turma de Contraturno', categoria: 'Contraturno' },
  { tag: '{{nome_responsavel}}', label: 'Nome do Responsável', categoria: 'Responsável' },
  { tag: '{{cpf_responsavel}}', label: 'CPF do Responsável', categoria: 'Responsável' },
  { tag: '{{rg_responsavel}}', label: 'RG do Responsável', categoria: 'Responsável' },
  { tag: '{{contato_responsavel}}', label: 'Telefone/WhatsApp', categoria: 'Responsável' },
  { tag: '{{email_responsavel}}', label: 'E-mail do Responsável', categoria: 'Responsável' },
  { tag: '{{endereco_completo}}', label: 'Endereço Completo', categoria: 'Responsável' },
  { tag: '{{valor_mensalidade}}', label: 'Valor da Mensalidade (R$)', categoria: 'Financeiro' },
  { tag: '{{valor_extenso}}', label: 'Valor por Extenso', categoria: 'Financeiro' },
  { tag: '{{qtd_parcelas}}', label: 'Qtd. de Parcelas', categoria: 'Financeiro' },
  { tag: '{{dia_vencimento}}', label: 'Dia do Vencimento', categoria: 'Financeiro' },
  { tag: '{{valor_contraturno}}', label: 'Valor do Contraturno (R$)', categoria: 'Financeiro' },
  { tag: '{{data_matricula}}', label: 'Data da Matrícula', categoria: 'Geral' },
  { tag: '{{ano_letivo}}', label: 'Ano Letivo', categoria: 'Geral' },
  { tag: '{{escola_nome}}', label: 'Nome da Escola', categoria: 'Geral' },
  { tag: '{{cidade_data}}', label: 'Cidade e Data Atual', categoria: 'Geral' },
];

export const DEFAULT_DOCUMENTOS_ESCOLARES: DocumentoEscolarTemplate[] = [
  {
    id: 'doc-contrato-padrao',
    titulo: 'Contrato de Prestação de Serviços Educacionais',
    tipoVinculo: 'todos',
    descricao: 'Contrato principal de matrícula e anuidade escolar obrigatório para todos os alunos.',
    ordem: 1,
    ativo: true,
    conteudoHtml: `<div style="font-family: 'Times New Roman', serif; line-height: 1.6; color: #111;">
  <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 20px;">
    <h2 style="margin: 0; font-size: 18px; text-transform: uppercase;">{{escola_nome}}</h2>
    <p style="margin: 4px 0 0; font-size: 12px; color: #555;">Educação e Desenvolvimento Integral</p>
    <h3 style="margin: 12px 0 0; font-size: 15px; font-weight: bold;">CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS - ANO LETIVO {{ano_letivo}}</h3>
  </div>

  <p><strong>CONTRATANTE / RESPONSÁVEL FINANCEIRO:</strong> Sr.(a) <strong>{{nome_responsavel}}</strong>, portador(a) do CPF nº <strong>{{cpf_responsavel}}</strong>, RG nº <strong>{{rg_responsavel}}</strong>, residente e domiciliado(a) em {{endereco_completo}}, telefone de contato: <strong>{{contato_responsavel}}</strong>.</p>

  <p><strong>BENEFICIÁRIO / ALUNO:</strong> <strong>{{nome_aluno}}</strong>, matrícula nº <strong>{{matricula}}</strong>, nascido em {{data_nascimento}}, regularmente matriculado no <strong>{{turma_regular}}</strong> (Setor: {{setor_regular}}).</p>

  <h4 style="margin-top: 16px; margin-bottom: 6px; font-size: 13px; text-transform: uppercase;">CLÁUSULA 1ª - DO OBJETO</h4>
  <p>O presente contrato tem como objeto a prestação de serviços educacionais pela CONTRATADA em favor do(a) ALUNO(A) acima nominado(a), correspondente ao ano letivo de {{ano_letivo}}, a ser ministrado no período regular de funcionamento.</p>

  <h4 style="margin-top: 16px; margin-bottom: 6px; font-size: 13px; text-transform: uppercase;">CLÁUSULA 2ª - DA CONTRAPRESTAÇÃO FINANCEIRA</h4>
  <p>Pela prestação dos serviços educacionais contratados, o(a) CONTRATANTE pagará à CONTRATADA a anuidade escolar dividida em <strong>{{qtd_parcelas}} parcela(s)</strong> consecutivas no valor de <strong>{{valor_mensalidade}}</strong> cada uma, com vencimento estipulado impreterivelmente para todo <strong>dia {{dia_vencimento}}</strong> de cada mês subsequente.</p>
  <p><strong>Parágrafo Único:</strong> O pagamento efetuado até a data de vencimento poderá usufruir do desconto de pontualidade acordado. Após o vencimento, o valor da mensalidade perderá a bonificação e incidirá multa de 2% (dois por cento) acrescida de juros de mora de 1% (um por cento) ao mês.</p>

  <h4 style="margin-top: 16px; margin-bottom: 6px; font-size: 13px; text-transform: uppercase;">CLÁUSULA 3ª - DAS DISPOSIÇÕES GERAIS E FORO</h4>
  <p>O(A) CONTRATANTE declara conhecer e concordar com o Regimento Escolar da instituição e as normas pedagógicas e disciplinares vigentes. Para dirimir quaisquer controvérsias oriundas do presente contrato, as partes elegem o foro da Comarca local.</p>

  <div style="margin-top: 35px; text-align: right;">
    <p>{{cidade_data}}</p>
  </div>

  <div style="margin-top: 50px; display: flex; justify-content: space-between; gap: 40px;">
    <div style="flex: 1; text-align: center; border-top: 1px solid #333; padding-top: 6px;">
      <p style="margin: 0; font-size: 12px; font-weight: bold;">{{escola_nome}}</p>
      <p style="margin: 2px 0 0; font-size: 11px; color: #555;">Direção / Tesouraria</p>
    </div>
    <div style="flex: 1; text-align: center; border-top: 1px solid #333; padding-top: 6px;">
      <p style="margin: 0; font-size: 12px; font-weight: bold;">{{nome_responsavel}}</p>
      <p style="margin: 2px 0 0; font-size: 11px; color: #555;">Contratante / Responsável Legal</p>
    </div>
  </div>
</div>`
  },
  {
    id: 'doc-adendo-contraturno',
    titulo: 'Adendo Contratual - Período de Contraturno',
    tipoVinculo: 'contraturno',
    descricao: 'Adendo específico e obrigatório apenas para estudantes matriculados na modalidade de Contraturno.',
    ordem: 2,
    ativo: true,
    conteudoHtml: `<div style="font-family: 'Times New Roman', serif; line-height: 1.6; color: #111;">
  <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 20px;">
    <h2 style="margin: 0; font-size: 18px; text-transform: uppercase;">{{escola_nome}}</h2>
    <p style="margin: 4px 0 0; font-size: 12px; color: #555;">Programa de Educação em Tempo Integral e Contraturno</p>
    <h3 style="margin: 12px 0 0; font-size: 15px; font-weight: bold; color: #1e3a8a;">ADENDO CONTRATUAL - ADESÃO AO PROGRAMA DE CONTRATURNO</h3>
  </div>

  <p>Pelo presente instrumento, que integra o Contrato de Prestação de Serviços Educacionais nº <strong>{{matricula}}</strong>:</p>

  <p>O(A) CONTRATANTE <strong>{{nome_responsavel}}</strong>, CPF nº <strong>{{cpf_responsavel}}</strong>, solicita a adesão do(a) ALUNO(A) <strong>{{nome_aluno}}</strong> ao <strong>PROGRAMA DE CONTRATURNO ESCOLAR</strong>, na turma designada: <strong>{{turma_contraturno}}</strong>.</p>

  <h4 style="margin-top: 16px; margin-bottom: 6px; font-size: 13px; text-transform: uppercase;">1. ATIVIDADES DESENVOLVIDAS NO CONTRATURNO</h4>
  <p>O Contraturno compreende o acompanhamento pedagógico orientado, oficinas esportivas, culturais, recreativas e momentos de socialização supervisionada no turno oposto ao das aulas curriculares regulares.</p>

  <h4 style="margin-top: 16px; margin-bottom: 6px; font-size: 13px; text-transform: uppercase;">2. VALOR ADICIONAL E CONDIÇÕES DE PAGAMENTO</h4>
  <p>Pela prestação dos serviços do Contraturno, é acrescido ao plano de mensalidades o valor de <strong>{{valor_contraturno}}</strong> mensais, a ser quitado em conjunto com a mensalidade regular no <strong>dia {{dia_vencimento}}</strong> de cada mês.</p>

  <h4 style="margin-top: 16px; margin-bottom: 6px; font-size: 13px; text-transform: uppercase;">3. HORÁRIOS, REFEIÇÕES E DESISTÊNCIA</h4>
  <p>O(A) aluno(a) deverá cumprir com pontualidade os horários de entrada e saída do contraturno. Qualquer solicitação de cancelamento da modalidade deverá ser formalizada por escrito na secretaria com antecedência mínima de 30 (trinta) dias.</p>

  <div style="margin-top: 35px; text-align: right;">
    <p>{{cidade_data}}</p>
  </div>

  <div style="margin-top: 50px; display: flex; justify-content: space-between; gap: 40px;">
    <div style="flex: 1; text-align: center; border-top: 1px solid #333; padding-top: 6px;">
      <p style="margin: 0; font-size: 12px; font-weight: bold;">{{escola_nome}}</p>
      <p style="margin: 2px 0 0; font-size: 11px; color: #555;">Coordenação do Contraturno</p>
    </div>
    <div style="flex: 1; text-align: center; border-top: 1px solid #333; padding-top: 6px;">
      <p style="margin: 0; font-size: 12px; font-weight: bold;">{{nome_responsavel}}</p>
      <p style="margin: 2px 0 0; font-size: 11px; color: #555;">Responsável Financeiro / Pedagógico</p>
    </div>
  </div>
</div>`
  },
  {
    id: 'doc-ficha-matricula',
    titulo: 'Ficha de Matrícula e Dados Cadastrais',
    tipoVinculo: 'todos',
    descricao: 'Ficha com o resumo cadastral completo do aluno, responsáveis, saúde e autorizações.',
    ordem: 3,
    ativo: true,
    conteudoHtml: `<div style="font-family: 'Times New Roman', serif; line-height: 1.5; color: #111;">
  <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 16px;">
    <h2 style="margin: 0; font-size: 17px; text-transform: uppercase;">{{escola_nome}}</h2>
    <h3 style="margin: 6px 0 0; font-size: 14px; font-weight: bold;">FICHA CADASTRAL DE MATRÍCULA - {{ano_letivo}}</h3>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px;">
    <tr style="background-color: #f1f5f9;">
      <th colspan="2" style="border: 1px solid #cbd5e1; padding: 6px; text-align: left; text-transform: uppercase;">1. Dados do Aluno</th>
    </tr>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px; width: 60%;"><strong>Nome:</strong> {{nome_aluno}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px;"><strong>Matrícula:</strong> {{matricula}}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px;"><strong>Data de Nascimento:</strong> {{data_nascimento}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px;"><strong>CPF:</strong> {{cpf_aluno}}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px;"><strong>Turma Regular:</strong> {{turma_regular}} ({{setor_regular}})</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px;"><strong>Contraturno:</strong> {{turma_contraturno}}</td>
    </tr>

    <tr style="background-color: #f1f5f9;">
      <th colspan="2" style="border: 1px solid #cbd5e1; padding: 6px; text-align: left; text-transform: uppercase;">2. Dados do Responsável Legal / Financeiro</th>
    </tr>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px;"><strong>Nome:</strong> {{nome_responsavel}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px;"><strong>CPF:</strong> {{cpf_responsavel}}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #cbd5e1; padding: 6px;"><strong>Telefone / WhatsApp:</strong> {{contato_responsavel}}</td>
      <td style="border: 1px solid #cbd5e1; padding: 6px;"><strong>E-mail:</strong> {{email_responsavel}}</td>
    </tr>
    <tr>
      <td colspan="2" style="border: 1px solid #cbd5e1; padding: 6px;"><strong>Endereço Residencial:</strong> {{endereco_completo}}</td>
    </tr>
  </table>

  <p style="font-size: 11px; color: #475569;">Declaro, sob as penas da lei, que as informações cadastrais aqui prestadas são verdadeiras e me comprometo a comunicar imediatamente à instituição qualquer alteração nos dados fornecidos.</p>

  <div style="margin-top: 40px; display: flex; justify-content: space-between; gap: 40px;">
    <div style="flex: 1; text-align: center; border-top: 1px solid #333; padding-top: 6px;">
      <p style="margin: 0; font-size: 11px; font-weight: bold;">Secretaria Escolar</p>
    </div>
    <div style="flex: 1; text-align: center; border-top: 1px solid #333; padding-top: 6px;">
      <p style="margin: 0; font-size: 11px; font-weight: bold;">{{nome_responsavel}}</p>
      <p style="margin: 2px 0 0; font-size: 10px; color: #555;">Assinatura do Responsável</p>
    </div>
  </div>
</div>`
  },
  {
    id: 'doc-termo-imagem',
    titulo: 'Termo de Autorização de Uso de Imagem e Voz',
    tipoVinculo: 'opcional',
    descricao: 'Autorização opcional para fotografias e vídeos em atividades pedagógicas e redes sociais.',
    ordem: 4,
    ativo: true,
    conteudoHtml: `<div style="font-family: 'Times New Roman', serif; line-height: 1.6; color: #111;">
  <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 20px;">
    <h2 style="margin: 0; font-size: 18px; text-transform: uppercase;">{{escola_nome}}</h2>
    <h3 style="margin: 8px 0 0; font-size: 14px; font-weight: bold;">TERMO DE AUTORIZAÇÃO DE USO DE IMAGEM E VOZ</h3>
  </div>

  <p>Eu, <strong>{{nome_responsavel}}</strong>, portador(a) do CPF nº <strong>{{cpf_responsavel}}</strong>, na qualidade de responsável legal pelo(a) menor <strong>{{nome_aluno}}</strong>, regularmente matriculado(a) no <strong>{{turma_regular}}</strong>:</p>

  <p><strong>AUTORIZO</strong>, a título gratuito, a instituição <strong>{{escola_nome}}</strong> a utilizar a imagem e voz do(a) referido(a) aluno(a) captadas em dependências da escola, passeios pedagógicos e eventos escolares, para fins exclusivos de:</p>
  <ul>
    <li>Mural e publicações pedagógicas internas;</li>
    <li>Redes sociais institucionais oficiais (Instagram, Facebook, Site oficial);</li>
    <li>Material promocional e anuários didáticos da instituição.</li>
  </ul>

  <p>A presente autorização é firmada em caráter definitivo, irrevogável e de boa-fé, em conformidade com o Estatuto da Criança e do Adolescente (ECA) e a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018).</p>

  <div style="margin-top: 35px; text-align: right;">
    <p>{{cidade_data}}</p>
  </div>

  <div style="margin-top: 50px; text-align: center; max-width: 320px; margin-left: auto; margin-right: auto; border-top: 1px solid #333; padding-top: 6px;">
    <p style="margin: 0; font-size: 12px; font-weight: bold;">{{nome_responsavel}}</p>
    <p style="margin: 2px 0 0; font-size: 11px; color: #555;">Assinatura do Responsável Legal</p>
  </div>
</div>`
  }
];
