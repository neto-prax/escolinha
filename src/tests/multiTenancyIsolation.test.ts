import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getSchoolStorageKey } from '../lib/cloudState';
import { checkItemInActiveSede, resolveSedeFromImport } from '../hooks/useSedes';

describe('Isolamento Multi-Tenancy e Separação de Sedes', () => {
  describe('getSchoolStorageKey (Prefixação por Tenant / Escola)', () => {
    it('deve gerar chaves de armazenamento com namespace exclusivo por escola', () => {
      const keySchoolA = getSchoolStorageKey('whatsapp_cache', 'escola-alfa');
      const keySchoolB = getSchoolStorageKey('whatsapp_cache', 'escola-beta');

      assert.equal(keySchoolA, 's_escola-alfa_whatsapp_cache');
      assert.equal(keySchoolB, 's_escola-beta_whatsapp_cache');
      assert.notEqual(
        keySchoolA,
        keySchoolB,
        'Chaves de escolas diferentes não podem coincidir sob nenhuma hipótese'
      );
    });

    it('deve preservar o nome do recurso sufixado corretamente', () => {
      const key = getSchoolStorageKey('financial_transactions', 'escola-123');
      assert.match(key, /^s_escola-123_/);
      assert.ok(key.endsWith('financial_transactions'));
    });
  });

  describe('checkItemInActiveSede (Isolamento de Dados entre Sedes)', () => {
    const sedesMock = [
      { id: 'sede-matriz-1', nome: 'Matriz Central', codigo: 'MTZ' },
      { id: 'sede-filial-norte', nome: 'Unidade Zona Norte', codigo: 'ZN' },
      { id: 'sede-filial-sul', nome: 'Unidade Zona Sul', codigo: 'ZS' },
    ];
    const matrizId = 'sede-matriz-1';

    it('deve permitir acesso a todos os registros quando a visão for consolidada ("todas")', () => {
      assert.equal(
        checkItemInActiveSede({
          itemSedeId: 'sede-filial-sul',
          activeSedeId: 'todas',
          matrizId,
          sedes: sedesMock,
        }),
        true
      );

      assert.equal(
        checkItemInActiveSede({
          itemSedeId: undefined,
          itemUnidadeNome: undefined,
          activeSedeId: 'todas',
          matrizId,
          sedes: sedesMock,
        }),
        true
      );
    });

    it('deve admitir item que possui exatamente o itemSedeId da sede ativa', () => {
      const permitido = checkItemInActiveSede({
        itemSedeId: 'sede-filial-norte',
        activeSedeId: 'sede-filial-norte',
        matrizId,
        sedes: sedesMock,
      });
      assert.equal(permitido, true);
    });

    it('deve BLOQUEAR item pertencente a outra sede (prevenindo vazamento cross-tenant)', () => {
      const permitido = checkItemInActiveSede({
        itemSedeId: 'sede-filial-sul',
        activeSedeId: 'sede-filial-norte',
        matrizId,
        sedes: sedesMock,
      });
      assert.equal(
        permitido,
        false,
        'Item da Sede Sul não pode aparecer quando o usuário está na Sede Norte'
      );
    });

    it('deve resolver corretamente o vínculo por nome da unidade (case-insensitive e trim)', () => {
      const permitido = checkItemInActiveSede({
        itemUnidadeNome: '  unidade zona norte  ',
        activeSedeId: 'sede-filial-norte',
        matrizId,
        sedes: sedesMock,
      });
      assert.equal(permitido, true);
    });

    it('deve resolver corretamente o vínculo pelo código da unidade', () => {
      const permitido = checkItemInActiveSede({
        itemUnidadeNome: 'ZN',
        activeSedeId: 'sede-filial-norte',
        matrizId,
        sedes: sedesMock,
      });
      assert.equal(permitido, true);
    });

    it('deve BLOQUEAR se o itemUnidadeNome pertencer a outra unidade', () => {
      const permitido = checkItemInActiveSede({
        itemUnidadeNome: 'Unidade Zona Sul',
        activeSedeId: 'sede-filial-norte',
        matrizId,
        sedes: sedesMock,
      });
      assert.equal(permitido, false);
    });

    it('REGRA CRÍTICA: dados legados (sem sedeId nem unidade) NÃO podem vazar para novas sedes recém-criadas', () => {
      const idNovaSedeRecemCriada = 'sede-filial-recem-criada-999';

      // Ao consultar a nova sede recém-criada, o item legado DEVE ser rejeitado (false)
      const exibidoNaNovaSede = checkItemInActiveSede({
        itemSedeId: undefined,
        itemUnidadeNome: undefined,
        activeSedeId: idNovaSedeRecemCriada,
        matrizId,
        sedes: sedesMock,
      });
      assert.equal(
        exibidoNaNovaSede,
        false,
        'Uma sede recém-criada sem migração deve iniciar totalmente vazia (0 registros herdados)'
      );

      // Ao consultar a Matriz, o item legado DEVE ser exibido (true)
      const exibidoNaMatriz = checkItemInActiveSede({
        itemSedeId: undefined,
        itemUnidadeNome: undefined,
        activeSedeId: matrizId,
        matrizId,
        sedes: sedesMock,
      });
      assert.equal(
        exibidoNaMatriz,
        true,
        'Registros legados pertencem historicamente e exclusivamente à Matriz'
      );
    });
  });

  describe('resolveSedeFromImport (Mapeamento de Sede na Planilha de Importação)', () => {
    const sedesEscola = [
      { id: 'sede-matriz', nome: 'Sede Principal (Papagaio)', codigo: 'PAP', tipo: 'Matriz' },
      { id: 'sede-senador', nome: 'Sede Senador', codigo: 'SEN', tipo: 'Filial' },
    ];

    it('deve mapear "Papagaio" para a Sede Principal (Papagaio) e sedeId matriz', () => {
      const res = resolveSedeFromImport({
        rawSede: 'Papagaio',
        sedes: sedesEscola,
      });
      assert.equal(res.sedeId, 'sede-matriz');
      assert.equal(res.unidade, 'Sede Principal (Papagaio)');
    });

    it('deve mapear variações como "Sede Papagaio", "PAP" e minúsculas', () => {
      assert.deepEqual(
        resolveSedeFromImport({ rawSede: 'sede papagaio', sedes: sedesEscola }),
        { sedeId: 'sede-matriz', unidade: 'Sede Principal (Papagaio)' }
      );
      assert.deepEqual(
        resolveSedeFromImport({ rawSede: 'PAP', sedes: sedesEscola }),
        { sedeId: 'sede-matriz', unidade: 'Sede Principal (Papagaio)' }
      );
      assert.deepEqual(
        resolveSedeFromImport({ rawSede: 'Sede Principal (Papagaio)', sedes: sedesEscola }),
        { sedeId: 'sede-matriz', unidade: 'Sede Principal (Papagaio)' }
      );
    });

    it('deve mapear corretamente outras sedes como "Senador"', () => {
      const res = resolveSedeFromImport({
        rawSede: 'Senador',
        sedes: sedesEscola,
      });
      assert.equal(res.sedeId, 'sede-senador');
      assert.equal(res.unidade, 'Sede Senador');
    });

    it('deve usar como fallback padrão a Sede Papagaio quando a coluna for vazia ou omitida', () => {
      const resVazio = resolveSedeFromImport({
        rawSede: '',
        sedes: sedesEscola,
      });
      assert.equal(resVazio.sedeId, 'sede-matriz');
      assert.equal(resVazio.unidade, 'Sede Principal (Papagaio)');

      const resUndefined = resolveSedeFromImport({
        rawSede: undefined,
        sedes: sedesEscola,
      });
      assert.equal(resUndefined.sedeId, 'sede-matriz');
      assert.equal(resUndefined.unidade, 'Sede Principal (Papagaio)');
    });

    it('deve adotar a sede ativa quando o usuário estiver filtrando por uma sede específica e a célula for vazia', () => {
      const resAtiva = resolveSedeFromImport({
        rawSede: undefined,
        sedes: sedesEscola,
        activeSede: { id: 'sede-senador', nome: 'Sede Senador' },
      });
      assert.equal(resAtiva.sedeId, 'sede-senador');
      assert.equal(resAtiva.unidade, 'Sede Senador');
    });
  });
});

