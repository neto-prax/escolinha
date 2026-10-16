import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  crc16,
  normalizeAscii,
  formatChavePix,
  generatePixCopiaECola,
  KEY_PIX_CHAVE_PADRAO,
} from '../utils/paymentGenerators';

describe('Geradores de Pagamento Bancário & Pix EMV (BR Code)', () => {
  describe('crc16 (Checksum Polinomial CCITT 0xFFFF)', () => {
    it('deve retornar exatamente 4 caracteres hexadecimais em caixa alta', () => {
      const hash1 = crc16('000201');
      assert.equal(hash1.length, 4);
      assert.match(hash1, /^[0-9A-F]{4}$/);

      const hash2 = crc16('TESTE-PIX-BANCO-CENTRAL');
      assert.equal(hash2.length, 4);
      assert.match(hash2, /^[0-9A-F]{4}$/);
    });

    it('deve produzir checksums determinísticos e idênticos para a mesma entrada', () => {
      const payload = '00020126360014br.gov.bcb.pix0114+55119999999995204000053039865802BR5915ESCOLA TESTE6014SAO PAULO62070503***6304';
      const crcA = crc16(payload);
      const crcB = crc16(payload);
      assert.equal(crcA, crcB);
    });
  });

  describe('normalizeAscii (Limpeza de Acentos e Caracteres Bancários)', () => {
    it('deve remover acentuação e diacríticos mantendo conformidade bancária', () => {
      const input = 'Escola Integrada Coração & Ação Pedagógica!';
      const normalized = normalizeAscii(input);
      assert.equal(normalized, 'Escola Integrada Coracao   Acao Pedagogica');
      assert.doesNotMatch(normalized, /[áéíóúãõâêîôûç]/i);
    });

    it('deve eliminar caracteres proibidos pelo Febraban e trimmar espaços', () => {
      const input = '  Colégio São Luís #123 / Salvador - BA  ';
      const normalized = normalizeAscii(input);
      assert.doesNotMatch(normalized, /[#/]/);
      assert.equal(normalized, 'Colegio Sao Luis  123   Salvador   BA');
    });
  });

  describe('formatChavePix (Validação e Normalização DICT BACEN)', () => {
    it('deve normalizar e-mail para minúsculas', () => {
      const chave = formatChavePix('  Financeiro.Escola@Dominio.COM.BR ');
      assert.equal(chave, 'financeiro.escola@dominio.com.br');
    });

    it('deve normalizar UUID de chave aleatória', () => {
      const uuid = 'A1B2C3D4-E5F6-4A7B-8C9D-0E1F2A3B4C5D';
      const formatada = formatChavePix(uuid);
      assert.equal(formatada, uuid.toLowerCase());
    });

    it('deve limpar CPF com pontuação e reter apenas os 11 dígitos', () => {
      const cpf = '123.456.789-01';
      assert.equal(formatChavePix(cpf), '12345678901');
    });

    it('deve limpar CNPJ com pontuação e reter apenas os 14 dígitos', () => {
      const cnpj = '12.345.678/0001-90';
      assert.equal(formatChavePix(cnpj), '12345678000190');
    });

    it('deve formatar telefone nacional para padrão internacional E.164 (+55)', () => {
      const telComDDD = '(75) 99876-5432';
      assert.equal(formatChavePix(telComDDD), '+5575998765432');

      const telJaComMais55 = '+5575998765432';
      assert.equal(formatChavePix(telJaComMais55), '+5575998765432');
    });

    it('deve acionar chave fallback padrão quando o valor for vazio ou inválido', () => {
      assert.equal(formatChavePix(''), 'profissional@netooliver.com.br');
      assert.equal(formatChavePix('   '), 'profissional@netooliver.com.br');
    });
  });

  describe('generatePixCopiaECola (Padrão EMV BR Code BACEN)', () => {
    it('deve gerar string EMV com todas as tags obrigatórias do Banco Central', () => {
      const pix = generatePixCopiaECola({
        valor: 350.0,
        descricao: 'Mensalidade Escolar Março',
        chavePix: 'financeiro@escola.com.br',
        beneficiarioNome: 'Escola Modelo Ltda',
        beneficiarioCidade: 'Feira de Santana',
        txid: 'MENSALIDADE2026',
      });

      // Tag 00: Payload Format Indicator (01)
      assert.ok(pix.startsWith('000201'), 'Deve iniciar com 000201');

      // Tag 01: Point of Initiation (11 = Estático)
      assert.ok(pix.includes('010211'), 'Deve conter tag 010211');

      // Tag 26: Merchant Account Information com domínio br.gov.bcb.pix
      assert.ok(pix.includes('0014br.gov.bcb.pix'), 'Deve conter GUI br.gov.bcb.pix');
      assert.ok(pix.includes('financeiro@escola.com.br'), 'Deve conter a chave Pix informada');

      // Tag 52: Merchant Category Code (0000)
      assert.ok(pix.includes('52040000'), 'Deve conter MCC 0000');

      // Tag 53: Currency (986 = Real brasileiro BRL)
      assert.ok(pix.includes('5303986'), 'Deve conter moeda 986 (BRL)');

      // Tag 54: Transaction Amount formatado com 2 casas
      assert.ok(pix.includes('5406350.00'), 'Deve conter valor 350.00');

      // Tag 58: Country Code (BR)
      assert.ok(pix.includes('5802BR'), 'Deve conter país BR');

      // Tag 62: Additional Data Field (TxID)
      assert.ok(pix.includes('MENSALIDADE2026'), 'Deve conter o TxID');

      // Tag 63: CRC16 com 4 caracteres no final
      assert.match(pix, /6304[0-9A-F]{4}$/, 'Deve terminar com cabeçalho 6304 e checksum de 4 dígitos');
    });

    it('deve omitir a Tag 54 quando o valor for zero ou ausente (Pix de valor aberto)', () => {
      const pixSemValor = generatePixCopiaECola({
        valor: 0,
        descricao: 'Doação',
        chavePix: 'pix@escola.com.br',
      });

      assert.doesNotMatch(
        pixSemValor,
        /54\d{2}/,
        'Não deve incluir tag de valor quando o montante for zero'
      );
    });

    it('deve truncar nome do beneficiário em até 25 caracteres para evitar overflow EMV', () => {
      const nomeLongo = 'CENTRO EDUCACIONAL E PEDAGOGICO INTERATIVO DE DESENVOLVIMENTO INFANTIL LTDA';
      const pix = generatePixCopiaECola({
        valor: 100,
        descricao: 'Teste',
        beneficiarioNome: nomeLongo,
      });

      // Extrai tag 59 do payload
      const matchTag59 = pix.match(/59(\d{2})([^0-9]+?)(?=60)/);
      assert.ok(matchTag59, 'Tag 59 deve existir');
      const tamanho = parseInt(matchTag59[1], 10);
      assert.ok(tamanho <= 25, `Tamanho da tag 59 (${tamanho}) não pode ultrapassar 25 bytes`);
    });

    it('deve truncar cidade do beneficiário em até 15 caracteres', () => {
      const cidadeLonga = 'PINDAMONHANGABA DO NORTE';
      const pix = generatePixCopiaECola({
        valor: 100,
        descricao: 'Teste',
        beneficiarioCidade: cidadeLonga,
      });

      const matchTag60 = pix.match(/60(\d{2})([^0-9]+?)(?=62)/);
      assert.ok(matchTag60, 'Tag 60 deve existir');
      const tamanho = parseInt(matchTag60[1], 10);
      assert.ok(tamanho <= 15, `Tamanho da tag 60 (${tamanho}) não pode ultrapassar 15 bytes`);
    });

    it('deve sanitizar o TxID removendo caracteres especiais não alfanuméricos', () => {
      const pix = generatePixCopiaECola({
        valor: 50,
        descricao: 'Teste',
        chavePix: '12345678901',
        txid: 'FATURA #123-ABC@2026',
      });

      assert.ok(pix.includes('FATURA123ABC2026'));
      const tag62 = pix.substring(pix.indexOf('62'));
      assert.doesNotMatch(tag62, /[#\-@]/);
    });
  });
});
