import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMedia,
  getAcademicStatus,
  getAcademicStatusLabel,
} from '../utils/academicCalculations';

describe('Cálculos Acadêmicos & Critérios de Aprovação Pedagógica', () => {
  describe('calculateMedia (Cálculo de Média Parcial)', () => {
    it('deve calcular a média aritmética simples corretamente por padrão', () => {
      const media = calculateMedia(8.0, 9.0);
      assert.equal(media, 8.5);
    });

    it('deve arredondar precisamente para 1 casa decimal na média aritmética', () => {
      // (7.3 + 7.4) / 2 = 7.35 -> 7.4
      const media = calculateMedia(7.3, 7.4);
      assert.equal(media, 7.4);

      // (5.1 + 5.2) / 2 = 5.15 -> 5.2
      assert.equal(calculateMedia(5.1, 5.2), 5.2);
    });

    it('deve calcular a média ponderada com os pesos padrão (Prova: 6, Trabalho: 4)', () => {
      // (10.0 * 6 + 5.0 * 4) / 10 = (60 + 20) / 10 = 8.0
      const media = calculateMedia(10.0, 5.0, {
        tipoCalculo: 'ponderada',
      });
      assert.equal(media, 8.0);
    });

    it('deve calcular a média ponderada com pesos customizados', () => {
      // Pesos: Prova 7, Trabalho 3
      // (8.0 * 7 + 6.0 * 3) / 10 = (56 + 18) / 10 = 7.4
      const media = calculateMedia(8.0, 6.0, {
        tipoCalculo: 'ponderada',
        pesosAvaliacoes: { prova: 7, trabalho: 3 },
      });
      assert.equal(media, 7.4);
    });

    it('deve calcular a somatória das notas quando o tipo for "somatoria"', () => {
      const media = calculateMedia(4.5, 3.5, {
        tipoCalculo: 'somatoria',
      });
      assert.equal(media, 8.0);
    });

    it('deve tratar entradas zeradas, nulas ou inválidas sem produzir NaN ou lançar exceção', () => {
      assert.equal(calculateMedia(0, 0), 0.0);
      assert.equal(calculateMedia(undefined as any, 8.0), 4.0);
      assert.equal(calculateMedia(NaN as any, NaN as any), 0.0);
    });

    it('deve proteger contra divisão por zero se os pesos somarem zero', () => {
      const media = calculateMedia(8.0, 8.0, {
        tipoCalculo: 'ponderada',
        pesosAvaliacoes: { prova: 0, trabalho: 0 },
      });
      assert.equal(media, 0);
    });
  });

  describe('getAcademicStatus (Classificação do Aluno)', () => {
    it('deve classificar como "aprovado" quando nota for maior ou igual a 7.0 (padrão)', () => {
      assert.equal(getAcademicStatus(7.0), 'aprovado');
      assert.equal(getAcademicStatus(9.5), 'aprovado');
      assert.equal(getAcademicStatus(10.0), 'aprovado');
    });

    it('deve classificar como "recuperacao" quando a nota estiver entre 4.0 e 6.9', () => {
      assert.equal(getAcademicStatus(6.9), 'recuperacao');
      assert.equal(getAcademicStatus(5.5), 'recuperacao');
      assert.equal(getAcademicStatus(4.0), 'recuperacao');
    });

    it('deve classificar como "reprovado" quando a nota for estritamente inferior a 4.0', () => {
      assert.equal(getAcademicStatus(3.9), 'reprovado');
      assert.equal(getAcademicStatus(2.0), 'reprovado');
      assert.equal(getAcademicStatus(0.0), 'reprovado');
    });

    it('deve respeitar limites configuráveis de aprovação e exame', () => {
      const configCustom = {
        notaAprovacaoDireta: 6.0,
        notaMinimaExame: 3.0,
      };

      assert.equal(getAcademicStatus(6.0, configCustom), 'aprovado');
      assert.equal(getAcademicStatus(5.9, configCustom), 'recuperacao');
      assert.equal(getAcademicStatus(3.0, configCustom), 'recuperacao');
      assert.equal(getAcademicStatus(2.9, configCustom), 'reprovado');
    });
  });

  describe('getAcademicStatusLabel (Formatação de Status em Português)', () => {
    it('deve retornar os rótulos corretos para a interface do usuário', () => {
      assert.equal(getAcademicStatusLabel('aprovado'), 'Aprovado Direto');
      assert.equal(getAcademicStatusLabel('recuperacao'), 'Recuperação / Exame');
      assert.equal(getAcademicStatusLabel('reprovado'), 'Reprovado');
    });
  });
});

