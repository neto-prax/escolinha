import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeText,
  evaluateTriggerMatch,
  buildMatchResult,
  buildGreetingMenuText,
  evaluateSectorMenuResponse,
} from '../hooks/useWhatsAppTriggers';
import { WhatsAppTrigger } from '../types/mensagens';

describe('Motor de Gatilhos & Chatbot WhatsApp (IA / Regras)', () => {
  describe('normalizeText (Sanitização e Normalização Fonética)', () => {
    it('deve converter para minúsculas, remover acentos e trimmar espaços', () => {
      assert.equal(
        normalizeText('  Olá, QUERO INFORMAÇÕES SOBRE MATRÍCULA!  '),
        'ola, quero informacoes sobre matricula!'
      );
      assert.equal(normalizeText('Atestado Médico & Declaração'), 'atestado medico & declaracao');
    });
  });

  describe('evaluateTriggerMatch (Avaliação de Correspondência)', () => {
    const triggersMock: WhatsAppTrigger[] = [
      {
        id: 'trig-1-alta-prioridade',
        nome: 'Gatilho Matrícula (Exata)',
        ativo: true,
        tipoCorrespondencia: 'exata',
        palavrasChave: ['matricula', 'fazer matricula'],
        respostaTexto: 'Olá {{nome}}! Informações de matrícula enviadas.',
        setorDestinoId: 'comercial',
        alterarStatus: 'open',
        prioridade: 1,
        criadoEm: '2026-01-01T00:00:00.000Z',
        totalAcionamentos: 10,
      },
      {
        id: 'trig-2-contem',
        nome: 'Gatilho Financeiro (Contém)',
        ativo: true,
        tipoCorrespondencia: 'contem',
        palavrasChave: ['boleto', 'pix', '2 via', 'mensalidade'],
        respostaTexto: 'Olá {{nome}}, segue o boleto do aluno {{aluno}}.',
        setorDestinoId: 'financeiro',
        alterarStatus: 'open',
        prioridade: 2,
        criadoEm: '2026-01-01T00:00:00.000Z',
        totalAcionamentos: 5,
      },
      {
        id: 'trig-3-inicio',
        nome: 'Gatilho Horário (Início)',
        ativo: true,
        tipoCorrespondencia: 'inicio',
        palavrasChave: ['horario', 'qual horario'],
        respostaTexto: 'Atendemos das 07h às 18h na {{escola}}.',
        setorDestinoId: null,
        alterarStatus: null,
        prioridade: 3,
        criadoEm: '2026-01-01T00:00:00.000Z',
        totalAcionamentos: 2,
      },
      {
        id: 'trig-4-inativo',
        nome: 'Gatilho Desativado',
        ativo: false,
        tipoCorrespondencia: 'contem',
        palavrasChave: ['desconto', 'bolsa'],
        respostaTexto: 'Temos bolsas de estudo.',
        setorDestinoId: null,
        alterarStatus: null,
        prioridade: 4,
        criadoEm: '2026-01-01T00:00:00.000Z',
        totalAcionamentos: 0,
      },
    ];

    it('deve corresponder com sucesso quando o tipo for "exata" e a mensagem for idêntica', () => {
      const match = evaluateTriggerMatch(triggersMock, '  Matrícula  ');
      assert.equal(match.matched, true);
      assert.equal(match.trigger?.id, 'trig-1-alta-prioridade');
      assert.equal(match.targetSectorId, 'comercial');
    });

    it('NÃO deve acionar gatilho de tipo "exata" se a mensagem contiver palavras adicionais (espera-se não-correspondência)', () => {
      const match = evaluateTriggerMatch(triggersMock, 'Gostaria de saber sobre a matrícula');
      // Não pode dar match no trig-1 porque é 'exata' e a mensagem tem texto ao redor
      assert.notEqual(match.trigger?.id, 'trig-1-alta-prioridade');
    });

    it('deve corresponder com sucesso quando o tipo for "contem", independente da posição', () => {
      const match = evaluateTriggerMatch(
        triggersMock,
        'Bom dia secretaria! Poderiam me enviar o boleto de março?'
      );
      assert.equal(match.matched, true);
      assert.equal(match.trigger?.id, 'trig-2-contem');
      assert.equal(match.targetSectorId, 'financeiro');
      assert.equal(match.matchedKeyword, 'boleto');
    });

    it('deve corresponder quando tipo for "inicio" e a mensagem começar com a palavra-chave', () => {
      const match = evaluateTriggerMatch(triggersMock, 'Horário de atendimento hoje, por favor');
      assert.equal(match.matched, true);
      assert.equal(match.trigger?.id, 'trig-3-inicio');
    });

    it('NÃO deve corresponder quando tipo for "inicio" e a palavra-chave estiver no meio da frase', () => {
      const match = evaluateTriggerMatch(triggersMock, 'Vocês poderiam me informar o horário?');
      assert.equal(
        match.matched,
        false,
        'Gatilho de início não deve disparar quando a palavra estiver no meio'
      );
    });

    it('deve respeitar a ordem de prioridade (menor valor numérico dispara primeiro)', () => {
      // Cria dois gatilhos com conflito de palavras-chave
      const triggersConflitantes: WhatsAppTrigger[] = [
        {
          id: 'gatilho-prioridade-baixa',
          nome: 'Geral',
          ativo: true,
          tipoCorrespondencia: 'contem',
          palavrasChave: ['ajuda', 'suporte'],
          respostaTexto: 'Resposta Geral',
          setorDestinoId: null,
          alterarStatus: null,
          prioridade: 10,
          criadoEm: '2026-01-01T00:00:00Z',
        },
        {
          id: 'gatilho-prioridade-alta',
          nome: 'Urgente',
          ativo: true,
          tipoCorrespondencia: 'contem',
          palavrasChave: ['ajuda'],
          respostaTexto: 'Resposta Urgente',
          setorDestinoId: null,
          alterarStatus: null,
          prioridade: 1,
          criadoEm: '2026-01-01T00:00:00Z',
        },
      ];

      const match = evaluateTriggerMatch(triggersConflitantes, 'Preciso de ajuda urgente');
      assert.equal(match.matched, true);
      assert.equal(
        match.trigger?.id,
        'gatilho-prioridade-alta',
        'O gatilho de prioridade 1 deve ter precedência sobre o de prioridade 10'
      );
    });

    it('NÃO deve disparar gatilhos desativados (ativo: false)', () => {
      const match = evaluateTriggerMatch(triggersMock, 'Quero saber se tem desconto ou bolsa de estudo');
      assert.equal(
        match.matched,
        false,
        'Gatilho desativado não pode ser disparado mesmo com palavras-chave presentes'
      );
    });

    it('deve retornar { matched: false } para entradas vazias ou contendo apenas espaços', () => {
      assert.equal(evaluateTriggerMatch(triggersMock, '').matched, false);
      assert.equal(evaluateTriggerMatch(triggersMock, '   ').matched, false);
    });
  });

  describe('buildMatchResult & Interpolação de Variáveis Dinâmicas', () => {
    const triggerTemplate: WhatsAppTrigger = {
      id: 'trig-vars',
      nome: 'Template Dinâmico',
      ativo: true,
      tipoCorrespondencia: 'contem',
      palavrasChave: ['teste'],
      respostaTexto:
        'Olá {{nome}}! Informamos que o aluno {{aluno}} está matriculado na {{escola}} sob o setor {{setor}}.',
      setorDestinoId: 'secretaria',
      alterarStatus: null,
      prioridade: 1,
      criadoEm: '2026-01-01T00:00:00Z',
    };

    it('deve substituir todas as variáveis dinâmicas pelos dados fornecidos no contexto', () => {
      const result = buildMatchResult(triggerTemplate, 'teste', {
        contactName: 'Mariana Silva',
        studentName: 'Bernardo Silva',
        schoolName: 'Colégio Interagir',
        currentSectorName: 'Secretaria Acadêmica',
      });

      assert.equal(result.matched, true);
      assert.equal(
        result.formattedResponse,
        'Olá Mariana Silva! Informamos que o aluno Bernardo Silva está matriculado na Colégio Interagir sob o setor Secretaria Acadêmica.'
      );
    });

    it('deve utilizar fallbacks amigáveis padrão caso o contexto não seja fornecido', () => {
      const result = buildMatchResult(triggerTemplate, 'teste', undefined);

      assert.equal(result.matched, true);
      assert.equal(
        result.formattedResponse,
        'Olá Responsável! Informamos que o aluno seu filho(a) está matriculado na Purple Edu sob o setor Secretaria.'
      );
    });
  });

  describe('buildGreetingMenuText (Geração da Mensagem de Saudação & Menu)', () => {
    const mockSectors = [
      { id: 'sec-comercial', name: 'Comercial & Matrículas' },
      { id: 'sec-financeiro', name: 'Financeiro' },
      { id: 'sec-secretaria', name: 'Secretaria Escolar' },
      { id: 'sec-pedagogico', name: 'Coordenação Pedagógica' },
    ];

    it('deve formatar o menu com setores numerados substituindo {SECTORS_LIST}', () => {
      const template = 'Olá {{nome}}! Seja bem-vindo à {{escola}}!\n\nEscolha um setor:\n\n{SECTORS_LIST}\n\nDigite a opção.';
      const output = buildGreetingMenuText(
        template,
        mockSectors,
        ['sec-comercial', 'sec-financeiro'],
        { schoolName: 'Colégio Interagir', contactName: 'Mariana Silva' }
      );

      assert.ok(output.includes('Olá Mariana!'));
      assert.ok(output.includes('Colégio Interagir'));
      assert.ok(output.includes('*1* - Comercial & Matrículas'));
      assert.ok(output.includes('*2* - Financeiro'));
      assert.ok(!output.includes('{SECTORS_LIST}'));
      assert.ok(!output.includes('Secretaria Escolar'), 'Setor não habilitado não deve aparecer no menu');
    });

    it('deve anexar a lista de setores ao final se a tag {SECTORS_LIST} não estiver no texto', () => {
      const template = 'Olá! Bem-vindo à nossa escola.';
      const output = buildGreetingMenuText(
        template,
        mockSectors,
        ['sec-secretaria'],
        { schoolName: 'Escola Exemplo' }
      );

      assert.ok(output.startsWith('Olá! Bem-vindo à nossa escola.'));
      assert.ok(output.includes('*1* - Secretaria Escolar'));
    });
  });

  describe('evaluateSectorMenuResponse (Detecção de Opção do Menu de Saudação)', () => {
    const mockSectors = [
      { id: 'sec-comercial', name: 'Comercial & Matrículas' },
      { id: 'sec-financeiro', name: 'Financeiro' },
      { id: 'sec-secretaria', name: 'Secretaria Escolar' },
    ];
    const enabledIds = ['sec-comercial', 'sec-financeiro', 'sec-secretaria'];

    it('deve reconhecer escolha numérica simples ("1", "2", "3")', () => {
      const res1 = evaluateSectorMenuResponse('1', mockSectors, enabledIds);
      assert.equal(res1.matched, true);
      assert.equal(res1.matchedSector?.id, 'sec-comercial');

      const res2 = evaluateSectorMenuResponse(' 2 ', mockSectors, enabledIds);
      assert.equal(res2.matched, true);
      assert.equal(res2.matchedSector?.id, 'sec-financeiro');

      const res3 = evaluateSectorMenuResponse('3.', mockSectors, enabledIds);
      assert.equal(res3.matched, true);
      assert.equal(res3.matchedSector?.id, 'sec-secretaria');
    });

    it('deve reconhecer prefixos como "opcao 1" ou "#2"', () => {
      const res = evaluateSectorMenuResponse('opcao 2', mockSectors, enabledIds);
      assert.equal(res.matched, true);
      assert.equal(res.matchedSector?.id, 'sec-financeiro');

      const resHash = evaluateSectorMenuResponse('#1', mockSectors, enabledIds);
      assert.equal(resHash.matched, true);
      assert.equal(resHash.matchedSector?.id, 'sec-comercial');
    });

    it('deve reconhecer pelo nome do setor ou palavras-chave conhecidas ("financeiro", "matricula")', () => {
      const resName = evaluateSectorMenuResponse('financeiro', mockSectors, enabledIds);
      assert.equal(resName.matched, true);
      assert.equal(resName.matchedSector?.id, 'sec-financeiro');

      const resKeyword = evaluateSectorMenuResponse('gostaria de falar com a secretaria', mockSectors, enabledIds);
      assert.equal(resKeyword.matched, true);
      assert.equal(resKeyword.matchedSector?.id, 'sec-secretaria');
    });

    it('deve retornar matched: false para número fora do intervalo ou texto desconhecido', () => {
      const resOutOfRange = evaluateSectorMenuResponse('99', mockSectors, enabledIds);
      assert.equal(resOutOfRange.matched, false);

      const resUnknown = evaluateSectorMenuResponse('quero saber onde fica o estacionamento', mockSectors, enabledIds);
      assert.equal(resUnknown.matched, false);
    });

    it('deve resolver correspondência quando enabledIds contiver slugs e os setores contiverem UUIDs', () => {
      const realDbSectors = [
        { id: '11111111-2222-3333-4444-555555555555', name: 'Comercial & Matrículas' },
        { id: '22222222-3333-4444-5555-666666666666', name: 'Financeiro' },
        { id: '33333333-4444-5555-6666-777777777777', name: 'Secretaria' },
      ];
      const slugEnabledIds = ['comercial', 'financeiro', 'secretaria'];

      const res = evaluateSectorMenuResponse('1', realDbSectors, slugEnabledIds);
      assert.equal(res.matched, true);
      assert.ok(res.matchedSector?.name.includes('Comercial'));

      const res2 = evaluateSectorMenuResponse('financeiro', realDbSectors, slugEnabledIds);
      assert.equal(res2.matched, true);
      assert.equal(res2.matchedSector?.name, 'Financeiro');
    });

    it('deve retornar matched: false para entrada vazia', () => {
      const resEmpty = evaluateSectorMenuResponse('', mockSectors, enabledIds);
      assert.equal(resEmpty.matched, false);
    });
  });
});


