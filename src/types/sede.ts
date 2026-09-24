export interface Sede {
  id: string;
  nome: string;
  codigo?: string;
  tipo: 'Matriz' | 'Filial';
  endereco?: string;
  cidade?: string;
  estado?: string;
  telefone?: string;
  email?: string;
  responsavel?: string; // Nome do diretor ou coordenador responsável da sede
  is_ativa: boolean;
  capacidadeAlunos?: number;
  dataCriacao?: string;
}

export const DEFAULT_SEDES: Sede[] = [
  {
    id: 'sede-matriz',
    nome: 'Sede Principal (Papagaio)',
    codigo: 'PAP',
    tipo: 'Matriz',
    endereco: 'Rua Ilha Bela, 703, Papagaio',
    cidade: 'Feira de Santana',
    estado: 'BA',
    telefone: '(75) 98369-0441',
    responsavel: 'Nelson Oliveira Neto',
    is_ativa: true,
    capacidadeAlunos: 500,
    dataCriacao: new Date().toISOString(),
  },
  {
    id: 'sede-senador',
    nome: 'Sede Senador',
    codigo: 'SEN',
    tipo: 'Filial',
    endereco: 'Av. Senador Quintino',
    cidade: 'Feira de Santana',
    estado: 'BA',
    responsavel: 'Coordenação Senador',
    is_ativa: true,
    capacidadeAlunos: 300,
    dataCriacao: new Date().toISOString(),
  },
];

