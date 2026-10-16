import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeText,
  extractMesReferencia,
  isMensalidadeLancamento,
  findMatchingAluno,
  reconcileSingleLancamento,
  reconcileAllLancamentosWithAlunos,
  cleanSpuriousMensalidades,
} from '../utils/studentFinanceReconciliation';
import { Aluno, Mensalidade } from '../types/aluno';
import { Lancamento } from '../types/finance';

describe('Reconciliação Financeira de Entradas com Alunos', () => {
  const alunosMock: Aluno[] = [
    {
      id: 'aluno-1',
      nome: 'Enzo Gabriel Pereira da Silva',
      matricula: '2024001',
      nomeResponsavel: 'Claudia Regina Pereira',
      contatoResponsavel: '75999990001',
      status: 'Ativo',
      setor: 'Ensino Fundamental I',
      classe: '4º Ano',
      turma: 'A',
      diaVencimento: '10',
    },
    {
      id: 'aluno-2',
      nome: 'Julia Fernandes Santos',
      matricula: '2024002',
      nomeResponsavel: 'Marcos Vinicius Santos',
      contatoResponsavel: '75999990002',
      status: 'Ativo',
      setor: 'Educação Infantil',
      classe: 'Maternal II',
      turma: 'B',
      diaVencimento: '05',
    },
    {
      id: 'aluno-3',
      nome: 'Lucas Silva',
      matricula: '2024003',
      nomeResponsavel: 'Renata Silva',
      contatoResponsavel: '75999990003',
      status: 'Ativo',
      diaVencimento: '15',
    },
  ];

  const mensalidadesMock: Mensalidade[] = [
    {
      id: 'm-enzo-03',
      alunoId: 'aluno-1',
      mesReferencia: '2024-03',
      valorFinal: 450,
      dataVencimento: '2024-03-10',
      status: 'Pendente',
    },
    {
      id: 'm-enzo-04',
      alunoId: 'aluno-1',
      mesReferencia: '2024-04',
      valorFinal: 450,
      dataVencimento: '2024-04-10',
      status: 'Pendente',
    },
    {
      id: 'm-julia-03',
      alunoId: 'aluno-2',
      mesReferencia: '2024-03',
      valorFinal: 500,
      dataVencimento: '2024-03-05',
      status: 'Pago',
      dataPagamento: '2024-03-04T12:00:00.000Z',
    },
  ];

  describe('normalizeText & extractMesReferencia', () => {
    it('deve normalizar texto removendo acentos e pontuações', () => {
      assert.equal(normalizeText('Mensalidade Março/2024 - João da Silva!'), 'mensalidade marco 2024 joao da silva');
      assert.equal(normalizeText('  CLÁUDIA REGINA   '), 'claudia regina');
    });

    it('deve extrair mês no formato MM/YYYY', () => {
      assert.equal(extractMesReferencia('Mensalidade 03/2024 - Enzo'), '2024-03');
      assert.equal(extractMesReferencia('Pagamento ref 10/2026 aluno Enzo'), '2026-10');
    });

    it('deve extrair mês por extenso com ano', () => {
      assert.equal(extractMesReferencia('Mensalidade Março 2024 - Enzo'), '2024-03');
      assert.equal(extractMesReferencia('Mensalidade de Novembro de 2025'), '2025-11');
    });

    it('deve usar o ano da data do lançamento como fallback se o mês for citado sem ano', () => {
      const lancDate = new Date(2025, 4, 15); // Maio 2025
      assert.equal(extractMesReferencia('Mensalidade de Abril - Enzo', lancDate), '2025-04');
    });
  });

  describe('findMatchingAluno (Correspondência de Aluno)', () => {
    it('deve encontrar aluno por nome completo na descrição (sem distinção de maiúsculas/acentos)', () => {
      const matched = findMatchingAluno(
        { descricao: 'Mensalidade Março - enzo gabriel pereira da silva' },
        alunosMock
      );
      assert.ok(matched);
      assert.equal(matched?.id, 'aluno-1');
    });

    it('deve encontrar aluno por partes significativas do nome', () => {
      const matched = findMatchingAluno(
        { descricao: 'Pagamento uniforme Julia Fernandes' },
        alunosMock
      );
      assert.ok(matched);
      assert.equal(matched?.id, 'aluno-2');
    });

    it('deve encontrar aluno por matrícula na descrição', () => {
      const matched = findMatchingAluno(
        { descricao: 'Entrada PIX Matrícula 2024003 ref apostila' },
        alunosMock
      );
      assert.ok(matched);
      assert.equal(matched?.id, 'aluno-3');
    });

    it('deve priorizar alunoId quando já estiver definido no lançamento', () => {
      const matched = findMatchingAluno(
        { alunoId: 'aluno-2', descricao: 'Entrada sem nome claro' },
        alunosMock
      );
      assert.ok(matched);
      assert.equal(matched?.id, 'aluno-2');
    });

    it('deve retornar null quando a descrição não contiver nenhum aluno da escola', () => {
      const matched = findMatchingAluno(
        { descricao: 'Rendimento de Aplicação CDB Inter' },
        alunosMock
      );
      assert.equal(matched, null);
    });
  });

  describe('isMensalidadeLancamento', () => {
    it('deve identificar como mensalidade quando a categoria for "Mensalidades"', () => {
      assert.equal(isMensalidadeLancamento({ categoria: 'Mensalidades', descricao: 'PIX Aluno' }), true);
      assert.equal(isMensalidadeLancamento({ categoria: 'mensalidade', descricao: 'PIX' }), true);
    });

    it('deve identificar como mensalidade quando a descrição tiver a palavra mensalidade', () => {
      assert.equal(isMensalidadeLancamento({ categoria: 'Outros', descricao: 'Mensalidade Março - Enzo' }), true);
      assert.equal(isMensalidadeLancamento({ categoria: 'Receitas Gerais', descricao: 'Mensal 04/2024' }), true);
    });

    it('deve identificar que NÃO é mensalidade quando for uniforme ou material', () => {
      assert.equal(isMensalidadeLancamento({ categoria: 'Fardamento / Estoque', descricao: 'Uniforme Completo - Julia Fernandes' }), false);
      assert.equal(isMensalidadeLancamento({ categoria: 'Pedagógico & Material', descricao: 'Taxa de Material Escolar - Lucas Silva' }), false);
    });
  });

  describe('reconcileSingleLancamento', () => {
    it('CASO 1: Se for mensalidade de aluno, deve DAR BAIXA na mensalidade pendente', () => {
      const lancamento: Lancamento = {
        id: 'lanc-pix-1',
        data: new Date('2024-03-08T12:00:00Z'),
        unidade: 'Todas',
        descricao: 'Mensalidade Março - Enzo Gabriel Pereira',
        categoria: 'Mensalidades',
        tipoCusto: 'Variável',
        valor: 450,
        formaPagamento: 'PIX',
        tipo: 'Entrada',
        status: 'Pago',
      };

      const result = reconcileSingleLancamento(lancamento, alunosMock, mensalidadesMock);

      assert.equal(result.action, 'mensalidade_baixada');
      assert.equal(result.updatedLancamento.alunoId, 'aluno-1');
      assert.equal(result.updatedLancamento.categoria, 'Mensalidades');

      // Verifica que a mensalidade de Março do Enzo foi baixada
      const mensalidadeBaixada = result.updatedMensalidades.find((m) => m.id === 'm-enzo-03');
      assert.ok(mensalidadeBaixada);
      assert.equal(mensalidadeBaixada?.status, 'Pago');
      assert.equal(mensalidadeBaixada?.lancamentoId, 'lanc-pix-1');
      assert.ok(mensalidadeBaixada?.dataPagamento);

      // A mensalidade de Abril deve continuar pendente
      const mensalidadeAbril = result.updatedMensalidades.find((m) => m.id === 'm-enzo-04');
      assert.equal(mensalidadeAbril?.status, 'Pendente');
    });

    it('CASO 2: Se for outra coisa (ex: uniforme ou material), deve ADICIONAR ao histórico financeiro do aluno', () => {
      const lancamento: Lancamento = {
        id: 'lanc-unif-1',
        data: new Date('2024-03-12T10:00:00Z'),
        unidade: 'Todas',
        descricao: 'Venda de Uniforme Escolar - Julia Fernandes',
        categoria: 'Fardamento / Estoque',
        tipoCusto: 'Variável',
        valor: 180,
        formaPagamento: 'Cartão',
        tipo: 'Entrada',
        status: 'Pago',
      };

      const result = reconcileSingleLancamento(lancamento, alunosMock, mensalidadesMock);

      assert.equal(result.action, 'historico_adicionado');
      assert.equal(result.updatedLancamento.alunoId, 'aluno-2');

      // Verifica que o aluno recebeu o item no historicoFinanceiro
      const juliaAtualizada = result.updatedAlunos.find((a) => a.id === 'aluno-2');
      assert.ok(juliaAtualizada);
      assert.ok(juliaAtualizada?.historicoFinanceiro);
      assert.equal(juliaAtualizada?.historicoFinanceiro?.length, 1);

      const histItem = juliaAtualizada?.historicoFinanceiro?.[0];
      assert.equal(histItem?.descricao, 'Venda de Uniforme Escolar - Julia Fernandes');
      assert.equal(histItem?.valor, 180);
      assert.equal(histItem?.formaPagamento, 'Cartão');
      assert.equal(histItem?.categoria, 'Fardamento / Estoque');
      assert.equal(histItem?.lancamentoId, 'lanc-unif-1');
      assert.equal(histItem?.statusResultado, 'pago');
    });

    it('NÃO deve alocar lançamentos do tipo Saída aos alunos', () => {
      const despesa: Lancamento = {
        id: 'lanc-despesa-1',
        data: new Date('2024-03-15T10:00:00Z'),
        unidade: 'Todas',
        descricao: 'Compra de material para turma do Enzo Gabriel',
        categoria: 'Operacional',
        tipoCusto: 'Variável',
        valor: 120,
        formaPagamento: 'PIX',
        tipo: 'Saída',
        status: 'Pago',
      };

      const result = reconcileSingleLancamento(despesa, alunosMock, mensalidadesMock);
      assert.equal(result.action, 'none');
      assert.equal(result.updatedLancamento.alunoId, undefined);
    });

    it('NÃO deve duplicar registros no histórico do aluno em execuções repetidas', () => {
      const lancamento: Lancamento = {
        id: 'lanc-material-1',
        data: new Date('2024-03-20T10:00:00Z'),
        unidade: 'Todas',
        descricao: 'Material Didático 1º Semestre - Lucas Silva',
        categoria: 'Pedagógico & Material',
        tipoCusto: 'Variável',
        valor: 320,
        formaPagamento: 'PIX',
        tipo: 'Entrada',
        status: 'Pago',
      };

      // Primeira execução
      const firstRun = reconcileSingleLancamento(lancamento, alunosMock, mensalidadesMock);
      const lucasAfterFirst = firstRun.updatedAlunos.find((a) => a.id === 'aluno-3');
      assert.equal(lucasAfterFirst?.historicoFinanceiro?.length, 1);

      // Segunda execução com os alunos já atualizados
      const secondRun = reconcileSingleLancamento(lancamento, firstRun.updatedAlunos, firstRun.updatedMensalidades);
      const lucasAfterSecond = secondRun.updatedAlunos.find((a) => a.id === 'aluno-3');
      assert.equal(lucasAfterSecond?.historicoFinanceiro?.length, 1);
    });
  });

  describe('reconcileAllLancamentosWithAlunos (Lote)', () => {
    it('deve processar lote de lançamentos mistos gerando contagens corretas', () => {
      const batchLancamentos: Lancamento[] = [
        // 1. Mensalidade Enzo (dá baixa)
        {
          id: 'b-1',
          data: new Date('2024-03-05'),
          unidade: 'Todas',
          descricao: 'Mensalidade Março 2024 - Enzo Gabriel Pereira',
          categoria: 'Mensalidades',
          tipoCusto: 'Fixo',
          valor: 450,
          formaPagamento: 'PIX',
          tipo: 'Entrada',
          status: 'Pago',
        },
        // 2. Uniforme Julia (adiciona ao histórico)
        {
          id: 'b-2',
          data: new Date('2024-03-06'),
          unidade: 'Todas',
          descricao: 'Uniforme Escolar - Julia Fernandes',
          categoria: 'Fardamento / Estoque',
          tipoCusto: 'Variável',
          valor: 150,
          formaPagamento: 'Dinheiro',
          tipo: 'Entrada',
          status: 'Pago',
        },
        // 3. Taxa de Matrícula Lucas (adiciona ao histórico)
        {
          id: 'b-3',
          data: new Date('2024-03-07'),
          unidade: 'Todas',
          descricao: 'Taxa de Matrícula - Lucas Silva',
          categoria: 'Administrativo',
          tipoCusto: 'Variável',
          valor: 200,
          formaPagamento: 'PIX',
          tipo: 'Entrada',
          status: 'Pago',
        },
        // 4. Saída operacional (ignora)
        {
          id: 'b-4',
          data: new Date('2024-03-08'),
          unidade: 'Todas',
          descricao: 'Internet Fibra Óptica',
          categoria: 'Operacional & Infraestrutura',
          tipoCusto: 'Fixo',
          valor: 199.9,
          formaPagamento: 'PIX',
          tipo: 'Saída',
          status: 'Pago',
        },
        // 5. Entrada geral sem aluno (ignora)
        {
          id: 'b-5',
          data: new Date('2024-03-09'),
          unidade: 'Todas',
          descricao: 'Rendimento Poupança',
          categoria: 'Administrativo',
          tipoCusto: 'Variável',
          valor: 35.5,
          formaPagamento: 'Transferência Bancária',
          tipo: 'Entrada',
          status: 'Pago',
        },
      ];

      const batchResult = reconcileAllLancamentosWithAlunos(batchLancamentos, alunosMock, mensalidadesMock);

      assert.equal(batchResult.summary.totalProcessed, 5);
      assert.equal(batchResult.summary.matchedAlunosCount, 3);
      assert.equal(batchResult.summary.mensalidadesBaixadasCount, 1);
      assert.equal(batchResult.summary.historicoAdicionadoCount, 2);

      // Verifica baixa da mensalidade
      const mensalidadeEnzo = batchResult.updatedMensalidades.find((m) => m.id === 'm-enzo-03');
      assert.equal(mensalidadeEnzo?.status, 'Pago');

      // Verifica histórico da Julia e Lucas
      const julia = batchResult.updatedAlunos.find((a) => a.id === 'aluno-2');
      assert.equal(julia?.historicoFinanceiro?.length, 1);

      const lucas = batchResult.updatedAlunos.find((a) => a.id === 'aluno-3');
      assert.equal(lucas?.historicoFinanceiro?.length, 1);
    });

    it('deve ignorar lançamentos sintéticos (prefixo "mensalidade-") para evitar duplicidade reentrante', () => {
      const lancamentoSintetico: Lancamento = {
        id: 'mensalidade-m-enzo-03',
        data: new Date('2024-03-05'),
        unidade: 'Todas',
        descricao: 'Mensalidade 2024-03 - Enzo Gabriel Pereira da Silva',
        categoria: 'Mensalidades',
        tipoCusto: 'Fixo',
        valor: 450,
        formaPagamento: 'PIX',
        tipo: 'Entrada',
        status: 'Pago',
      };

      const batchResult = reconcileAllLancamentosWithAlunos([lancamentoSintetico], alunosMock, mensalidadesMock);
      assert.equal(batchResult.summary.totalProcessed, 1);
      assert.equal(batchResult.summary.matchedAlunosCount, 0);
      assert.equal(batchResult.summary.mensalidadesBaixadasCount, 0);
      assert.equal(batchResult.summary.historicoAdicionadoCount, 0);
      assert.equal(batchResult.updatedLancamentos.length, 0);
    });
  });

  describe('Prevenção de Mensalidades Indevidas para Alunos sem Mensalidade', () => {
    it('NUNCA deve criar nova fatura em mensalidades para aluno sem fatura pendente cadastrada', () => {
      // Lucas (aluno-3) não possui NENHUMA mensalidade em mensalidadesMock
      const lancamentoComNome: Lancamento = {
        id: 'lanc-lucas-entrada',
        data: new Date('2024-05-10'),
        unidade: 'Todas',
        descricao: 'Pagamento de Mensalidade Maio - Lucas Silva',
        categoria: 'Mensalidades',
        tipoCusto: 'Fixo',
        valor: 400,
        formaPagamento: 'PIX',
        tipo: 'Entrada',
        status: 'Pago',
      };

      const result = reconcileSingleLancamento(lancamentoComNome, alunosMock, mensalidadesMock);

      // Deve alocar como historico_adicionado e NÃO mensalidade_baixada
      assert.equal(result.action, 'historico_adicionado');
      // A lista de mensalidades NÃO pode ter aumentado de tamanho!
      assert.equal(result.updatedMensalidades.length, mensalidadesMock.length);
      // Nenhuma mensalidade foi criada para o Lucas
      const mensalidadeLucas = result.updatedMensalidades.find((m) => m.alunoId === 'aluno-3');
      assert.equal(mensalidadeLucas, undefined);

      // O histórico financeiro do Lucas deve conter a entrada
      const lucasAtualizado = result.updatedAlunos.find((a) => a.id === 'aluno-3');
      assert.ok(lucasAtualizado?.historicoFinanceiro?.some((h) => h.lancamentoId === 'lanc-lucas-entrada'));
    });
  });

  describe('cleanSpuriousMensalidades (Limpeza de Faturas Espúrias e Órfãs)', () => {
    it('deve remover mensalidades órfãs cujo alunoId não existe no sistema', () => {
      const mensalidadesComOrfa: Mensalidade[] = [
        ...mensalidadesMock,
        {
          id: 'm-fantasma-1',
          alunoId: 'aluno-inexistente-999',
          mesReferencia: '2024-03',
          valorFinal: 300,
          dataVencimento: '2024-03-10',
          status: 'Pago',
          lancamentoId: 'lanc-fantasma',
        },
      ];

      const { cleanedMensalidades, removedCount } = cleanSpuriousMensalidades(mensalidadesComOrfa, alunosMock);
      assert.equal(removedCount, 1);
      assert.equal(cleanedMensalidades.length, mensalidadesMock.length);
      assert.ok(!cleanedMensalidades.some((m) => m.id === 'm-fantasma-1'));
    });

    it('deve limpar mensalidade criada a partir de lançamento que NÃO era mensalidade (ex: uniforme)', () => {
      const lancamentoUniforme: Lancamento = {
        id: 'lanc-unif-spurious',
        data: new Date('2024-04-01'),
        unidade: 'Todas',
        descricao: 'Uniforme Escolar Completo - Enzo Gabriel Pereira da Silva',
        categoria: 'Fardamento / Estoque',
        tipoCusto: 'Variável',
        valor: 160,
        formaPagamento: 'PIX',
        tipo: 'Entrada',
        status: 'Pago',
      };

      const mensalidadeSpurious: Mensalidade = {
        id: 'm-spurious-uniforme',
        alunoId: 'aluno-1',
        mesReferencia: '2024-04',
        valorFinal: 160,
        dataVencimento: '2024-04-01',
        status: 'Pago',
        lancamentoId: 'lanc-unif-spurious',
      };

      const { cleanedMensalidades, updatedAlunos, removedCount } = cleanSpuriousMensalidades(
        [...mensalidadesMock, mensalidadeSpurious],
        alunosMock,
        [lancamentoUniforme]
      );

      assert.equal(removedCount, 1);
      assert.ok(!cleanedMensalidades.some((m) => m.id === 'm-spurious-uniforme'));

      // Verifica se o item foi transferido para o histórico financeiro do aluno
      const enzo = updatedAlunos.find((a) => a.id === 'aluno-1');
      assert.ok(enzo?.historicoFinanceiro?.some((h) => h.lancamentoId === 'lanc-unif-spurious'));
    });

    it('deve limpar mensalidade de aluno com bolsa 100% ou sem contrato (valorBase <= 0)', () => {
      const alunoBolsista: Aluno = {
        id: 'aluno-bolsista',
        nome: 'Mateus Bolsista Integral',
        matricula: '2024099',
        nomeResponsavel: 'Carla Bolsista',
        contatoResponsavel: '75999990099',
        status: 'Ativo',
        valorBase: '0',
        parcelasContratadas: 0,
      };

      const mensalidadeBolsista: Mensalidade = {
        id: 'm-spurious-bolsista',
        alunoId: 'aluno-bolsista',
        mesReferencia: '2024-03',
        valorFinal: 250,
        dataVencimento: '2024-03-10',
        status: 'Pago',
        lancamentoId: 'lanc-bolsista-1',
      };

      const { cleanedMensalidades, updatedAlunos, removedCount } = cleanSpuriousMensalidades(
        [mensalidadeBolsista],
        [alunoBolsista]
      );

      assert.equal(removedCount, 1);
      assert.equal(cleanedMensalidades.length, 0);

      const mateus = updatedAlunos.find((a) => a.id === 'aluno-bolsista');
      assert.ok(mateus?.historicoFinanceiro?.some((h) => h.lancamentoId === 'lanc-bolsista-1'));
    });
  });
});

