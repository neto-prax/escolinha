/**
 * Utilitários para Geração de Pagamentos:
 * - PIX Copia e Cola padrão EMV (Banco Central do Brasil) com CRC16
 * - QR Code Dinâmico para PIX
 * - Boleto Bancário Febraban completo com Código de Barras (ITF 2 of 5 SVG),
 *   Linha Digitável, QR Code Pix Híbrido e abertura direta em nova aba do Chrome
 */

import { getActiveBankingGateway, BankingGatewayId, hasCoraCredentials } from '@/services/coraService';
import { getSicoobCooperativa, getSicoobConta, getSicoobChavePix } from '@/services/sicoobService';
import { getBradescoAgencia, getBradescoConta, getBradescoCarteira, getBradescoChavePix } from '@/services/bradescoService';
import { Caixa, BancoEmissorId } from '@/types/finance';

export interface PixData {
  valor: number;
  descricao: string;
  chavePix?: string;
  beneficiarioNome?: string;
  beneficiarioCidade?: string;
  pagadorNome?: string;
  pagadorCpfCnpj?: string;
  txid?: string;
}

export interface BoletoData {
  valor: number;
  descricao: string;
  vencimento?: string | Date;
  beneficiarioNome?: string;
  beneficiarioCnpj?: string;
  beneficiarioEndereco?: string;
  pagadorNome?: string;
  pagadorCpfCnpj?: string;
  pagadorEndereco?: string;
  nossoNumero?: string;
  numeroDocumento?: string;
  instrucoes?: string[];
  gatewayId?: BancoEmissorId;
}

/**
 * Calcula CRC16 CCITT (0xFFFF) exigido pelo padrão BR Code do Banco Central
 */
function crc16(data: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= (data.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Normaliza textos removendo acentos para conformidade com padrões bancários
 */
function normalizeAscii(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .trim();
}

import QRCode from 'qrcode';

export const KEY_PIX_CHAVE_PADRAO = 'escolinha_chave_pix_padrao';

/**
 * Obtém a chave Pix cadastrada na instituição ou fallback ativo
 */
export function getDefaultPixKey(): string {
  try {
    const custom = localStorage.getItem(KEY_PIX_CHAVE_PADRAO);
    if (custom && custom.trim()) return custom.trim();

    const asaas = localStorage.getItem('escolinha_asaas_chave_pix');
    if (asaas && asaas.trim()) return asaas.trim();

    const sicoob = localStorage.getItem('escolinha_sicoob_chave_pix');
    if (sicoob && sicoob.trim()) return sicoob.trim();

    const bradesco = localStorage.getItem('escolinha_bradesco_chave_pix');
    if (bradesco && bradesco.trim()) return bradesco.trim();
  } catch (e) {
    // Ignore
  }
  return 'profissional@netooliver.com.br';
}

/**
 * Salva uma nova chave Pix padrão para a instituição
 */
export function setDefaultPixKey(key: string): void {
  try {
    if (key && key.trim()) {
      localStorage.setItem(KEY_PIX_CHAVE_PADRAO, key.trim());
    }
  } catch (e) {
    // Ignore
  }
}

/**
 * Formata a chave Pix para os padrões aceitos pelo BACEN (DICT)
 */
export function formatChavePix(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return 'profissional@netooliver.com.br';

  // Se for e-mail
  if (trimmed.includes('@')) {
    return trimmed.toLowerCase();
  }

  // Se for UUID (chave aleatória)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
  if (isUuid) {
    return trimmed.toLowerCase();
  }

  const digits = trimmed.replace(/\D/g, '');

  // CNPJ: 14 dígitos
  if (digits.length === 14) {
    return digits;
  }

  // CPF: 11 dígitos
  if (digits.length === 11 && (trimmed.includes('.') || trimmed.includes('-'))) {
    return digits;
  }

  // Telefone celular brasileiro (com DDD): adiciona +55
  if (trimmed.startsWith('+')) {
    return `+${digits}`;
  }
  if (digits.length === 10 || digits.length === 11) {
    if (trimmed.includes('(') || trimmed.includes(')') || trimmed.includes('-') || digits.length === 11) {
      return `+55${digits}`;
    }
  }
  if (digits.length === 12 || digits.length === 13) {
    return digits.startsWith('55') ? `+${digits}` : `+55${digits}`;
  }

  return trimmed;
}

/**
 * Gera o payload oficial do PIX Copia e Cola (EMV QR Code padrão Banco Central do Brasil - BR Code)
 * 100% compatível com todos os aplicativos bancários (Nubank, Itaú, BB, Inter, Caixa, Bradesco, Santander, etc.)
 */
export function generatePixCopiaECola(params: PixData): string {
  const rawChave = params.chavePix || getDefaultPixKey();
  const chave = formatChavePix(rawChave);
  const valorNum = Number(params.valor || 0);
  const rawNome = normalizeAscii(params.beneficiarioNome || 'ESCOLA INTERAGIR').toUpperCase().slice(0, 25);
  const rawCidade = normalizeAscii(params.beneficiarioCidade || 'FEIRA DE SANTANA').toUpperCase().slice(0, 15);
  const cleanTxid = (params.txid || '***').replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || '***';

  // Formatação de tags TLV (Type, Length, Value) com contagem precisa de bytes UTF-8
  const formatTlv = (id: string, value: string) => {
    const len = new TextEncoder().encode(value).length.toString().padStart(2, '0');
    return `${id}${len}${value}`;
  };

  // Subcampos do Merchant Account Information (Tag 26) - Padrão Bacen: apenas 00 (GUI) e 01 (chave)
  const subGui = formatTlv('00', 'br.gov.bcb.pix');
  const subKey = formatTlv('01', chave);
  const tag26 = formatTlv('26', `${subGui}${subKey}`);

  // Subcampos do Additional Data Field Template (Tag 62) - Tag 05 (Reference Label)
  const subTxid = formatTlv('05', cleanTxid);
  const tag62 = formatTlv('62', subTxid);

  let payload =
    formatTlv('00', '01') + // Payload Format Indicator (versão 01)
    formatTlv('01', '11') + // Point of Initiation Method (11: QR Code Estático)
    tag26 +                 // Merchant Account Information (Pix)
    formatTlv('52', '0000') + // Merchant Category Code
    formatTlv('53', '986');   // Currency Code (986 = BRL)

  if (valorNum > 0) {
    payload += formatTlv('54', valorNum.toFixed(2)); // Transaction Amount
  }

  payload +=
    formatTlv('58', 'BR') + // Country Code
    formatTlv('59', rawNome) + // Merchant Name (máx 25)
    formatTlv('60', rawCidade) + // Merchant City (máx 15)
    tag62 + // Additional Data (TxID)
    '6304'; // CRC16 Header

  const checksum = crc16(payload);
  return `${payload}${checksum}`;
}

/**
 * Gera imagem de QR Code local em formato Data URL (Base64 PNG) com alta taxa de correção de erro (Level M)
 * Não depende de conexão de internet ou servidores externos, garantindo leitura instantânea pela câmera do celular.
 */
export async function generateQrCodeDataUrl(content: string, width = 320): Promise<string> {
  try {
    return await QRCode.toDataURL(content, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Erro ao gerar QRCode local:', err);
    return getQrCodeImageUrl(content, width);
  }
}

/**
 * Retorna URL de imagem do QR Code via fallback externo
 */
export function getQrCodeImageUrl(content: string, size = 300): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=10&ecc=M&data=${encodeURIComponent(content)}`;
}

/**
 * Gera dados bancários de simulação conforme o banco / gateway configurado
 */
export function getBankDisplayName(gateway?: BancoEmissorId): string {
  switch (gateway) {
    case 'cora':
      return hasCoraCredentials() ? 'Banco Cora (403-9)' : 'Banco Cora (Requer credenciais)';
    case 'sicoob':
      return 'Banco Sicoob (756-0)';
    case 'bradesco':
      return 'Banco Bradesco (237-2)';
    case 'bb':
      return 'Banco do Brasil (001-9)';
    case 'itau':
      return 'Banco Itaú (341-7)';
    case 'santander':
      return 'Banco Santander (033-7)';
    case 'caixa_gov':
      return 'Caixa Econômica (104-0)';
    case 'inter':
      return 'Banco Inter (077-9)';
    case 'nubank':
      return 'Nubank (260)';
    case 'asaas':
    default:
      return 'Asaas Bank (461 / 001)';
  }
}

/**
 * Detecta o banco emissor do boleto baseado no Caixa selecionado.
 * 
 * Regras Estritas:
 * 1. O Banco Cora (403-9) SÓ pode ser integrado/utilizado se a escola tiver expressamente cadastrado/enviado suas credenciais de API.
 * 2. Sem as credenciais do Cora, o boleto bancário DEVE ser emitido pelo banco vinculado ao Caixa selecionado
 *    (ex: Banco do Brasil 001, Sicoob 756, Bradesco 237, Itaú 341, Santander 033, Caixa Econômica 104, Asaas 461).
 * 3. Se for um caixa físico (ex: "Dinheiro", "Secretaria"), o sistema localiza o primeiro caixa de banco cadastrado na escola.
 */
export function detectBankFromCaixa(
  caixaIdOrName: string | undefined,
  caixas: Caixa[] = []
): BancoEmissorId {
  if (!caixaIdOrName) {
    const active = getActiveBankingGateway();
    return (active === 'cora' && !hasCoraCredentials()) ? 'asaas' : (active as BancoEmissorId);
  }

  const selected = caixas.find(c => c.id === caixaIdOrName || c.nome === caixaIdOrName);
  const targetText = ((selected?.nome || '') + ' ' + (selected?.id || '') + ' ' + caixaIdOrName).toLowerCase();

  // Caso o caixa mencione Cora:
  if (targetText.includes('cora') || targetText.includes('403')) {
    // SÓ integra se a escola enviou as credenciais!
    if (hasCoraCredentials()) {
      return 'cora';
    }
    // Sem credenciais do Cora, localiza outro caixa de banco cadastrado
    const outroCaixaBancario = caixas.find(c => {
      const n = (c.nome + ' ' + c.id).toLowerCase();
      return !n.includes('cora') && !n.includes('403') && !n.includes('dinheiro') && !n.includes('secretaria');
    });
    if (outroCaixaBancario && outroCaixaBancario.id !== caixaIdOrName) {
      return detectBankFromCaixa(outroCaixaBancario.id, caixas);
    }
    return 'asaas';
  }

  // Banco do Brasil (001-9)
  if (targetText.includes('brasil') || targetText.includes(' bb') || targetText.startsWith('bb') || targetText.includes('001')) {
    return 'bb';
  }

  // Sicoob (756-0)
  if (targetText.includes('sicoob') || targetText.includes('756') || targetText.includes('bancoob')) {
    return 'sicoob';
  }

  // Bradesco (237-2)
  if (targetText.includes('bradesco') || targetText.includes('237')) {
    return 'bradesco';
  }

  // Itaú (341-7)
  if (targetText.includes('itau') || targetText.includes('itaú') || targetText.includes('341')) {
    return 'itau';
  }

  // Santander (033-7)
  if (targetText.includes('santander') || targetText.includes('033')) {
    return 'santander';
  }

  // Caixa Econômica Federal (104-0)
  if (targetText.includes('caixa economica') || targetText.includes('caixa econômica') || targetText.includes('cef') || targetText.includes('104')) {
    return 'caixa_gov';
  }

  // Inter (077-9)
  if (targetText.includes('inter') || targetText.includes('077')) {
    return 'inter';
  }

  // Nubank (260)
  if (targetText.includes('nubank') || targetText.includes('nu ') || targetText.includes('260')) {
    return 'nubank';
  }

  // Asaas (461-8)
  if (targetText.includes('asaas') || targetText.includes('461')) {
    return 'asaas';
  }

  // Se o caixa for físico (dinheiro / gaveta / secretaria), busca o primeiro caixa que seja conta bancária da escola
  if (targetText.includes('dinheiro') || targetText.includes('secretaria') || targetText.includes('gaveta')) {
    const primeiroBancario = caixas.find(c => {
      const n = (c.nome + ' ' + c.id).toLowerCase();
      return !n.includes('dinheiro') && !n.includes('secretaria') && (!n.includes('cora') || hasCoraCredentials());
    });
    if (primeiroBancario && primeiroBancario.id !== caixaIdOrName) {
      return detectBankFromCaixa(primeiroBancario.id, caixas);
    }
  }

  const active = getActiveBankingGateway();
  return (active === 'cora' && !hasCoraCredentials()) ? 'asaas' : (active as BancoEmissorId);
}

/**
 * Calcula o Dígito Verificador Geral (Módulo 11) do Código de Barras Febraban (43 dígitos -> DV pos 5).
 * Regra Febraban:
 * Pesos de 2 a 9 da direita para a esquerda.
 * Resto = Soma % 11.
 * DV = 11 - Resto.
 * Se Resto for 0, 1 ou 10, o DV é 1.
 */
export function calcularDvGeralCodigoBarras(codigo43Digitos: string): string {
  let soma = 0;
  let peso = 2;
  for (let i = codigo43Digitos.length - 1; i >= 0; i--) {
    soma += parseInt(codigo43Digitos.charAt(i), 10) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  const dv = 11 - resto;
  if (dv === 0 || dv === 10 || dv === 11) {
    return '1';
  }
  return dv.toString();
}

/**
 * Calcula o Dígito Verificador (Módulo 10) dos campos 1, 2 e 3 da Linha Digitável.
 * Regra Febraban:
 * Pesos alternados 2 e 1 da direita para a esquerda.
 * Se multiplicação > 9, soma os dois algarismos (ex: 7*2=14 -> 1+4=5).
 * Resto = Soma % 10.
 * Se Resto === 0, DV = 0. Caso contrário, DV = 10 - Resto.
 */
export function calcularDvModulo10(campo: string): string {
  let soma = 0;
  let peso = 2;
  for (let i = campo.length - 1; i >= 0; i--) {
    let mult = parseInt(campo.charAt(i), 10) * peso;
    if (mult > 9) {
      mult = Math.floor(mult / 10) + (mult % 10);
    }
    soma += mult;
    peso = peso === 2 ? 1 : 2;
  }
  const resto = soma % 10;
  return resto === 0 ? '0' : (10 - resto).toString();
}

/**
 * Calcula o Fator de Vencimento Febraban padrão BACEN.
 * Nova base estabelecida em 22/02/2025 (fator 1000).
 */
export function getFatorVencimento(vencimento?: string | Date): string {
  if (!vencimento) return '1000';
  const d = new Date(vencimento);
  if (isNaN(d.getTime())) return '1000';
  const baseNova = new Date(2025, 1, 22, 0, 0, 0, 0);
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - baseNova.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays >= 0) {
    const fator = 1000 + diffDays;
    if (fator <= 9999) return fator.toString().padStart(4, '0');
  }
  return '1000';
}

/**
 * Monta o Boleto Febraban completo:
 * - Código de Barras (estritamente 44 dígitos numéricos)
 * - Linha Digitável Formatada (47 dígitos no formato XXXXX.XXXXX XXXXX.XXXXXX XXXXX.XXXXXX X XXXXXXXXXXXXXX)
 * - Linha Digitável Limpa (47 dígitos numéricos sem formatação)
 */
export function montarBoletoFebraban(
  bancoCodigo: string,
  fatorVencimento: string,
  valorCentavos: string,
  campoLivre25: string
): {
  codigoBarras: string;
  linhaDigitavel: string;
  linhaDigitavelLimpa: string;
  dvGeral: string;
} {
  const banco = bancoCodigo.replace(/\D/g, '').padStart(3, '0').slice(-3);
  const moeda = '9';
  const fator = fatorVencimento.replace(/\D/g, '').padStart(4, '0').slice(-4);
  const valor = valorCentavos.replace(/\D/g, '').padStart(10, '0').slice(-10);
  const campoLivre = campoLivre25.replace(/\D/g, '').padEnd(25, '0').slice(0, 25);

  // 1. Código de Barras: 43 dígitos sem o DV geral
  const codigo43 = `${banco}${moeda}${fator}${valor}${campoLivre}`;
  const dvGeral = calcularDvGeralCodigoBarras(codigo43);

  // Código de Barras completo de 44 posições
  const codigoBarras = `${banco}${moeda}${dvGeral}${fator}${valor}${campoLivre}`;

  // 2. Linha Digitável (5 campos, total 47 dígitos)
  // Campo 1: Banco (3) + Moeda (1) + Campo Livre pos 1 a 5 (5) + DV mod10 (1) -> 10 dígitos (XXXXX.XXXXX)
  const c1Data = `${banco}${moeda}${campoLivre.substring(0, 5)}`;
  const dv1 = calcularDvModulo10(c1Data);
  const c1Formatted = `${c1Data.substring(0, 5)}.${c1Data.substring(5)}${dv1}`;

  // Campo 2: Campo Livre pos 6 a 15 (10) + DV mod10 (1) -> 11 dígitos (XXXXX.XXXXXX)
  const c2Data = campoLivre.substring(5, 15);
  const dv2 = calcularDvModulo10(c2Data);
  const c2Formatted = `${c2Data.substring(0, 5)}.${c2Data.substring(5)}${dv2}`;

  // Campo 3: Campo Livre pos 16 a 25 (10) + DV mod10 (1) -> 11 dígitos (XXXXX.XXXXXX)
  const c3Data = campoLivre.substring(15, 25);
  const dv3 = calcularDvModulo10(c3Data);
  const c3Formatted = `${c3Data.substring(0, 5)}.${c3Data.substring(5)}${dv3}`;

  // Campo 4: DV Geral (1 dígito)
  const c4 = dvGeral;

  // Campo 5: Fator de Vencimento (4) + Valor Nominal (10) -> 14 dígitos
  const c5 = `${fator}${valor}`;

  const linhaDigitavel = `${c1Formatted} ${c2Formatted} ${c3Formatted} ${c4} ${c5}`;
  const linhaDigitavelLimpa = `${c1Data}${dv1}${c2Data}${dv2}${c3Data}${dv3}${c4}${c5}`;

  return {
    codigoBarras,
    linhaDigitavel,
    linhaDigitavelLimpa,
    dvGeral,
  };
}

/**
 * Validador oficial de Linha Digitável (47 dígitos) simulando o algoritmo de apps bancários
 */
export function validarLinhaDigitavel(linha: string): { valid: boolean; error?: string } {
  const digits = linha.replace(/\D/g, '');
  if (digits.length !== 47) {
    return { valid: false, error: `Tamanho inválido: esperado 47 dígitos, recebido ${digits.length}` };
  }

  const c1Data = digits.substring(0, 9);
  const dv1 = digits.substring(9, 10);
  if (calcularDvModulo10(c1Data) !== dv1) {
    return { valid: false, error: 'Dígito verificador do Bloco 1 inválido' };
  }

  const c2Data = digits.substring(10, 20);
  const dv2 = digits.substring(20, 21);
  if (calcularDvModulo10(c2Data) !== dv2) {
    return { valid: false, error: 'Dígito verificador do Bloco 2 inválido' };
  }

  const c3Data = digits.substring(21, 31);
  const dv3 = digits.substring(31, 32);
  if (calcularDvModulo10(c3Data) !== dv3) {
    return { valid: false, error: 'Dígito verificador do Bloco 3 inválido' };
  }

  const dvGeral = digits.substring(32, 33);
  const fatorValor = digits.substring(33, 47);
  const banco = c1Data.substring(0, 3);
  const moeda = c1Data.substring(3, 4);
  const campoLivre = c1Data.substring(4, 9) + c2Data + c3Data;

  const barcodeSemDv = `${banco}${moeda}${fatorValor}${campoLivre}`;
  const dvCalculado = calcularDvGeralCodigoBarras(barcodeSemDv);
  if (dvCalculado !== dvGeral) {
    return { valid: false, error: `Dígito verificador geral incompatível: esperado ${dvGeral}, calculado ${dvCalculado}` };
  }

  return { valid: true };
}

/**
 * Validador oficial de Código de Barras (44 dígitos) Febraban
 */
export function validarCodigoBarras(codigo: string): { valid: boolean; error?: string } {
  const digits = codigo.replace(/\D/g, '');
  if (digits.length !== 44) {
    return { valid: false, error: `Código de barras deve conter 44 dígitos, recebido ${digits.length}` };
  }
  const bancoMoeda = digits.substring(0, 4);
  const dvGeral = digits.substring(4, 5);
  const restoBarcode = digits.substring(5, 44);
  const barcode43 = `${bancoMoeda}${restoBarcode}`;
  const dvCalculado = calcularDvGeralCodigoBarras(barcode43);
  if (dvCalculado !== dvGeral) {
    return { valid: false, error: `Dígito verificador geral incorreto: esperado ${dvGeral}, calculado ${dvCalculado}` };
  }
  return { valid: true };
}

/**
 * Gera imagem SVG de QR Code de forma 100% síncrona e local (sem requisição externa)
 */
export function generateQrCodeSvg(text: string, margin = 2): string {
  try {
    const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
    const size = qr.modules.size;
    const totalSize = size + margin * 2;
    let paths = '';
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (qr.modules.get(r, c)) {
          paths += `M${c + margin} ${r + margin}h1v1h-1z `;
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalSize} ${totalSize}" shape-rendering="crispEdges" width="100%" height="100%"><rect width="100%" height="100%" fill="#ffffff"/><path d="${paths}" fill="#000000"/></svg>`;
  } catch (err) {
    console.error('Erro ao gerar SVG do QR Code:', err);
    return `<img src="${getQrCodeImageUrl(text, 160)}" alt="QR Code Pix" style="width:100%;height:100%;object-fit:contain;" />`;
  }
}

/**
 * Gera dados bancários de emissão do boleto conforme o banco / gateway cadastrado,
 * calculando estritamente código de barras de 44 dígitos e linha digitável de 47 dígitos.
 */
export function getBankSlipDetails(
  gateway?: BancoEmissorId,
  valor = 0,
  vencimento?: string | Date
) {
  let active: BancoEmissorId = gateway || getActiveBankingGateway();

  // Regra fundamental: Cora só pode ser emitido se a escola enviou credenciais
  if (active === 'cora' && !hasCoraCredentials()) {
    active = 'asaas';
  }

  const fator = getFatorVencimento(vencimento);
  const valorCentavos = Math.round((valor || 0) * 100).toString().padStart(10, '0');

  switch (active) {
    case 'cora': {
      const conta = (typeof window !== 'undefined' ? localStorage.getItem('escolinha_cora_conta') : null) || '3369804-1';
      const cleanConta = conta.replace(/\D/g, '').slice(0, 7) || '3369804';
      const carteira = '01';
      const nossoNumero = `403${Date.now().toString().slice(-8)}`;
      // Campo livre: 7 conta + 2 carteira + 11 nossoNum + 5 zeros = 25 dígitos
      const campoLivre = `${cleanConta.padStart(7, '0')}${carteira}${nossoNumero.padStart(11, '0')}00000`;
      const febraban = montarBoletoFebraban('403', fator, valorCentavos, campoLivre);

      return {
        gatewayId: 'cora' as const,
        bankCode: '403-9',
        bankName: 'Banco Cora SCD S.A.',
        brandColor: '#fe3c72',
        agency: '0001',
        account: conta,
        carteira,
        nossoNumero,
        linhaDigitavel: febraban.linhaDigitavel,
        linhaDigitavelLimpa: febraban.linhaDigitavelLimpa,
        barcodeNumber: febraban.codigoBarras,
        dvGeral: febraban.dvGeral,
        logoHtml: `<div style="display:inline-flex;align-items:center;gap:6px;background:#fe3c72;color:#ffffff;padding:4px 10px;border-radius:6px;font-weight:900;font-size:16px;letter-spacing:-0.5px;font-family:sans-serif;">cora</div>`,
      };
    }

    case 'bb': {
      const agencia = '1824-4';
      const conta = '35890-1';
      const carteira = '17';
      const convenio = '3589010'; // 7 dígitos
      const nossoNumero = Date.now().toString().slice(-10); // 10 dígitos
      // Campo livre: 7 convenio + 10 nossoNumero + 2 carteira + 6 zeros = 25 dígitos
      const campoLivre = `${convenio}${nossoNumero}${carteira}000000`;
      const febraban = montarBoletoFebraban('001', fator, valorCentavos, campoLivre);

      return {
        gatewayId: 'bb' as const,
        bankCode: '001-9',
        bankName: 'Banco do Brasil S.A.',
        brandColor: '#003882',
        agency: agencia,
        account: conta,
        carteira,
        nossoNumero: `001${nossoNumero}`,
        linhaDigitavel: febraban.linhaDigitavel,
        linhaDigitavelLimpa: febraban.linhaDigitavelLimpa,
        barcodeNumber: febraban.codigoBarras,
        dvGeral: febraban.dvGeral,
        logoHtml: `<div style="display:inline-flex;align-items:center;gap:6px;background:#003882;color:#f8d117;padding:4px 10px;border-radius:6px;font-weight:900;font-size:14px;letter-spacing:-0.5px;font-family:sans-serif;">BANCO DO BRASIL</div>`,
      };
    }

    case 'itau': {
      const carteira = '109';
      const nossoNumero = Date.now().toString().slice(-8);
      const ag = '0450';
      const conta = '28470';
      // Campo livre: 3 carteira + 8 nossoNumero + 1 dacNossoNum + 4 ag + 5 conta + 1 dacAgConta + 3 zeros = 25 dígitos
      const campoLivre = `${carteira}${nossoNumero}9${ag}${conta}3000`;
      const febraban = montarBoletoFebraban('341', fator, valorCentavos, campoLivre);

      return {
        gatewayId: 'itau' as const,
        bankCode: '341-7',
        bankName: 'Banco Itaú Unibanco S.A.',
        brandColor: '#ec7000',
        agency: ag,
        account: `${conta}-3`,
        carteira,
        nossoNumero: `341${nossoNumero}`,
        linhaDigitavel: febraban.linhaDigitavel,
        linhaDigitavelLimpa: febraban.linhaDigitavelLimpa,
        barcodeNumber: febraban.codigoBarras,
        dvGeral: febraban.dvGeral,
        logoHtml: `<div style="display:inline-flex;align-items:center;gap:6px;background:#ec7000;color:#ffffff;padding:4px 10px;border-radius:6px;font-weight:900;font-size:16px;letter-spacing:-0.5px;font-family:sans-serif;">Itaú</div>`,
      };
    }

    case 'sicoob': {
      const coop = getSicoobCooperativa();
      const conta = getSicoobConta();
      const cleanCoop = coop.replace(/\D/g, '').slice(0, 4) || '3008';
      const cleanConta = conta.replace(/\D/g, '').slice(0, 7) || '0088721';
      const carteira = '1';
      const modalidade = '01';
      const nossoNumero = Date.now().toString().slice(-10);
      const parcela = '1';
      // Campo livre: 1 carteira + 4 coop + 2 modalidade + 7 conta + 10 nossoNum + 1 parcela = 25 dígitos
      const campoLivre = `${carteira}${cleanCoop.padStart(4, '0')}${modalidade}${cleanConta.padStart(7, '0')}${nossoNumero.padStart(10, '0')}${parcela}`;
      const febraban = montarBoletoFebraban('756', fator, valorCentavos, campoLivre);

      return {
        gatewayId: 'sicoob' as const,
        bankCode: '756-0',
        bankName: 'Banco Cooperativo Sicoob S.A.',
        brandColor: '#003641',
        agency: cleanCoop,
        account: conta,
        carteira: '01',
        nossoNumero: `756${nossoNumero}`,
        linhaDigitavel: febraban.linhaDigitavel,
        linhaDigitavelLimpa: febraban.linhaDigitavelLimpa,
        barcodeNumber: febraban.codigoBarras,
        dvGeral: febraban.dvGeral,
        logoHtml: `<div style="display:inline-flex;align-items:center;gap:6px;background:#003641;color:#ffffff;padding:4px 10px;border-radius:6px;font-weight:900;font-size:15px;letter-spacing:-0.5px;font-family:sans-serif;"><span style="color:#00ae9d;">▲</span> SICOOB</div>`,
      };
    }

    case 'bradesco': {
      const agencia = getBradescoAgencia();
      const conta = getBradescoConta();
      const carteira = getBradescoCarteira() || '09';
      const cleanAg = agencia.replace(/\D/g, '').slice(0, 4) || '1425';
      const cleanConta = conta.replace(/\D/g, '').slice(0, 7) || '0028470';
      const cleanCart = carteira.replace(/\D/g, '').padStart(2, '0').slice(0, 2) || '09';
      const nossoNumero = Date.now().toString().slice(-11);
      // Campo livre: 4 ag + 2 carteira + 11 nossoNum + 7 conta + 1 zero = 25 dígitos
      const campoLivre = `${cleanAg.padStart(4, '0')}${cleanCart}${nossoNumero.padStart(11, '0')}${cleanConta.padStart(7, '0')}0`;
      const febraban = montarBoletoFebraban('237', fator, valorCentavos, campoLivre);

      return {
        gatewayId: 'bradesco' as const,
        bankCode: '237-2',
        bankName: 'Banco Bradesco S.A.',
        brandColor: '#cc092f',
        agency: cleanAg,
        account: conta,
        carteira: cleanCart,
        nossoNumero: `237${nossoNumero}`,
        linhaDigitavel: febraban.linhaDigitavel,
        linhaDigitavelLimpa: febraban.linhaDigitavelLimpa,
        barcodeNumber: febraban.codigoBarras,
        dvGeral: febraban.dvGeral,
        logoHtml: `<div style="display:inline-flex;align-items:center;gap:6px;background:#cc092f;color:#ffffff;padding:4px 10px;border-radius:6px;font-weight:900;font-size:16px;letter-spacing:-0.5px;font-family:sans-serif;">Bradesco</div>`,
      };
    }

    case 'santander': {
      const ag = '2045';
      const carteira = '101';
      const beneficiario = '2045130';
      const nossoNumero = Date.now().toString().slice(-13);
      // Campo livre: 1 '9' + 7 benef + 13 nossoNum + 1 '0' + 3 carteira = 25 dígitos
      const campoLivre = `9${beneficiario}${nossoNumero.padStart(13, '0')}0${carteira}`;
      const febraban = montarBoletoFebraban('033', fator, valorCentavos, campoLivre);

      return {
        gatewayId: 'santander' as const,
        bankCode: '033-7',
        bankName: 'Banco Santander (Brasil) S.A.',
        brandColor: '#ec0000',
        agency: ag,
        account: '13004567-8',
        carteira,
        nossoNumero: `033${nossoNumero}`,
        linhaDigitavel: febraban.linhaDigitavel,
        linhaDigitavelLimpa: febraban.linhaDigitavelLimpa,
        barcodeNumber: febraban.codigoBarras,
        dvGeral: febraban.dvGeral,
        logoHtml: `<div style="display:inline-flex;align-items:center;gap:6px;background:#ec0000;color:#ffffff;padding:4px 10px;border-radius:6px;font-weight:900;font-size:15px;letter-spacing:-0.5px;font-family:sans-serif;">Santander</div>`,
      };
    }

    case 'caixa_gov': {
      const ag = '0289';
      const beneficiario = '0289001';
      const nossoNumero = Date.now().toString().slice(-17);
      // Campo livre: 7 benef + 17 nossoNum + 1 '1' = 25 dígitos
      const campoLivre = `${beneficiario}${nossoNumero.padStart(17, '0')}1`;
      const febraban = montarBoletoFebraban('104', fator, valorCentavos, campoLivre);

      return {
        gatewayId: 'caixa_gov' as const,
        bankCode: '104-0',
        bankName: 'Caixa Econômica Federal',
        brandColor: '#006699',
        agency: ag,
        account: '00001234-5',
        carteira: 'SR',
        nossoNumero: `104${nossoNumero}`,
        linhaDigitavel: febraban.linhaDigitavel,
        linhaDigitavelLimpa: febraban.linhaDigitavelLimpa,
        barcodeNumber: febraban.codigoBarras,
        dvGeral: febraban.dvGeral,
        logoHtml: `<div style="display:inline-flex;align-items:center;gap:6px;background:#006699;color:#ffffff;padding:4px 10px;border-radius:6px;font-weight:900;font-size:16px;letter-spacing:-0.5px;font-family:sans-serif;"><span style="color:#f39200;font-weight:900;">X</span> CAIXA</div>`,
      };
    }

    case 'inter': {
      const ag = '0001-9';
      const carteira = '112';
      const conta = '5432109';
      const nossoNumero = Date.now().toString().slice(-11);
      // Campo livre: 4 ag + 3 carteira + 7 conta + 11 nossoNum = 25 dígitos
      const campoLivre = `0001${carteira}${conta}${nossoNumero.padStart(11, '0')}`;
      const febraban = montarBoletoFebraban('077', fator, valorCentavos, campoLivre);

      return {
        gatewayId: 'inter' as const,
        bankCode: '077-9',
        bankName: 'Banco Inter S.A.',
        brandColor: '#ff7a00',
        agency: ag,
        account: `${conta}-8`,
        carteira,
        nossoNumero: `077${nossoNumero}`,
        linhaDigitavel: febraban.linhaDigitavel,
        linhaDigitavelLimpa: febraban.linhaDigitavelLimpa,
        barcodeNumber: febraban.codigoBarras,
        dvGeral: febraban.dvGeral,
        logoHtml: `<div style="display:inline-flex;align-items:center;gap:6px;background:#ff7a00;color:#ffffff;padding:4px 10px;border-radius:6px;font-weight:900;font-size:16px;letter-spacing:-0.5px;font-family:sans-serif;">inter</div>`,
      };
    }

    case 'nubank': {
      const ag = '0001';
      const carteira = '01';
      const conta = '9876543';
      const nossoNumero = Date.now().toString().slice(-11);
      // Campo livre: 4 ag + 2 carteira + 7 conta + 11 nossoNum + 1 zero = 25 dígitos
      const campoLivre = `0001${carteira}${conta}${nossoNumero.padStart(11, '0')}0`;
      const febraban = montarBoletoFebraban('260', fator, valorCentavos, campoLivre);

      return {
        gatewayId: 'nubank' as const,
        bankCode: '260',
        bankName: 'Nu Pagamentos S.A. - Nubank',
        brandColor: '#820ad1',
        agency: ag,
        account: `${conta}-2`,
        carteira,
        nossoNumero: `260${nossoNumero}`,
        linhaDigitavel: febraban.linhaDigitavel,
        linhaDigitavelLimpa: febraban.linhaDigitavelLimpa,
        barcodeNumber: febraban.codigoBarras,
        dvGeral: febraban.dvGeral,
        logoHtml: `<div style="display:inline-flex;align-items:center;gap:6px;background:#820ad1;color:#ffffff;padding:4px 10px;border-radius:6px;font-weight:900;font-size:16px;letter-spacing:-0.5px;font-family:sans-serif;">nu</div>`,
      };
    }

    case 'asaas':
    default: {
      const ag = '0001';
      const carteira = '01';
      const conta = '8912450';
      const nossoNumero = Date.now().toString().slice(-11);
      // Campo livre: 4 ag + 2 carteira + 7 conta + 11 nossoNum + 1 zero = 25 dígitos
      const campoLivre = `0001${carteira}${conta}${nossoNumero.padStart(11, '0')}0`;
      const febraban = montarBoletoFebraban('461', fator, valorCentavos, campoLivre);

      return {
        gatewayId: 'asaas' as const,
        bankCode: '461-8',
        bankName: 'Asaas Gestão Financeira / Banco 461',
        brandColor: '#6b26d9',
        agency: ag,
        account: `${conta}-1`,
        carteira,
        nossoNumero: `461${nossoNumero}`,
        linhaDigitavel: febraban.linhaDigitavel,
        linhaDigitavelLimpa: febraban.linhaDigitavelLimpa,
        barcodeNumber: febraban.codigoBarras,
        dvGeral: febraban.dvGeral,
        logoHtml: `<div style="display:inline-flex;align-items:center;gap:6px;background:#6b26d9;color:#ffffff;padding:4px 10px;border-radius:6px;font-weight:900;font-size:16px;letter-spacing:-0.5px;font-family:sans-serif;">asaas</div>`,
      };
    }
  }
}

/**
 * Gera código de barras SVG padrão Interleaved 2 of 5 (Febraban)
 * - 44 dígitos codificados em 22 pares
 * - Margens de silêncio (quiet zone) para leitura ótica
 * - Fundo branco sólido e renderização nítida (shape-rendering crispEdges)
 */
export function generateItfBarcodeSvg(digits: string): string {
  const patterns: { [key: string]: string } = {
    '0': '00110',
    '1': '10001',
    '2': '01001',
    '3': '11000',
    '4': '00101',
    '5': '10100',
    '6': '01100',
    '7': '00011',
    '8': '10010',
    '9': '01010',
  };

  const cleanDigits = digits.replace(/\D/g, '');
  const data = cleanDigits.length % 2 === 0 ? cleanDigits : '0' + cleanDigits;

  const narrowWidth = 1.25;
  const wideWidth = 3.2; // Ratio 2.56:1
  const height = 64;
  const quietZone = 28; // Margem de silêncio para leitura ótica

  // Padrão de Início (Start Pattern): fino barra, fino espaço, fino barra, fino espaço
  const elements: { black: boolean; wide: boolean }[] = [
    { black: true, wide: false },
    { black: false, wide: false },
    { black: true, wide: false },
    { black: false, wide: false },
  ];

  // Intercalar pares de dígitos
  for (let i = 0; i < data.length; i += 2) {
    const digit1 = data[i];
    const digit2 = data[i + 1] || '0';
    const pattern1 = patterns[digit1] || patterns['0'];
    const pattern2 = patterns[digit2] || patterns['0'];

    for (let j = 0; j < 5; j++) {
      elements.push({ black: true, wide: pattern1[j] === '1' });  // Barra preta
      elements.push({ black: false, wide: pattern2[j] === '1' }); // Espaço branco
    }
  }

  // Padrão de Fim (Stop Pattern): largo barra, fino espaço, fino barra
  elements.push({ black: true, wide: true });
  elements.push({ black: false, wide: false });
  elements.push({ black: true, wide: false });

  let currentX = quietZone;
  let svgRects = '';

  for (const el of elements) {
    const width = el.wide ? wideWidth : narrowWidth;
    if (el.black) {
      svgRects += `<rect x="${currentX.toFixed(2)}" y="0" width="${width.toFixed(2)}" height="${height}" fill="#000000" />\n`;
    }
    currentX += width;
  }

  const totalWidth = Math.ceil(currentX + quietZone);

  return `<svg viewBox="0 0 ${totalWidth} ${height}" width="${totalWidth}" height="${height}" preserveAspectRatio="xMidYMid meet" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
    <rect width="${totalWidth}" height="${height}" fill="#ffffff" />
    ${svgRects}
  </svg>`;
}

/**
 * Gera o documento HTML completo e imprimível do Boleto Bancário Febraban
 */
export function generateBoletoHtml(params: BoletoData): string {
  const activeGateway = params.gatewayId || getActiveBankingGateway();
  const bank = getBankSlipDetails(activeGateway, params.valor, params.vencimento);

  const valorFormatado = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(params.valor);

  const vencimentoDate = params.vencimento
    ? new Date(params.vencimento)
    : new Date(Date.now() + 86400000 * 5);
  const vencimentoFormatado = vencimentoDate.toLocaleDateString('pt-BR');
  const emissaoFormatada = new Date().toLocaleDateString('pt-BR');

  const numeroDoc = params.numeroDocumento || `DOC-${Date.now().toString().slice(-8)}`;
  const nossoNum = params.nossoNumero || bank.nossoNumero;
  const linhaDigitavel = bank.linhaDigitavel;
  const barcodeNumber = bank.barcodeNumber;

  // Pix integrado ao boleto (Boleto Híbrido) gerado localmente em SVG síncrono
  const pixPayload = generatePixCopiaECola({
    valor: params.valor,
    descricao: params.descricao || `Boleto ${numeroDoc}`,
    beneficiarioNome: params.beneficiarioNome || 'Escola Interagir',
    beneficiarioCidade: 'Feira de Santana',
    txid: numeroDoc.replace(/\W/g, '').slice(0, 25),
  });
  const pixQrSvg = generateQrCodeSvg(pixPayload);

  const barcodeSvg = generateItfBarcodeSvg(barcodeNumber);

  const instrucoesHtml = (
    params.instrucoes && params.instrucoes.length > 0
      ? params.instrucoes
      : [
          'Sr. Caixa: Aceitar pagamento até o vencimento.',
          'Após o vencimento, cobrar multa de 2% e juros de 1% ao mês.',
          'Pague também via PIX através do QR Code instantâneo deste boleto.',
          'Não receber após 30 dias do vencimento.',
        ]
  )
    .map((inst) => `<div>${inst}</div>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Boleto Bancário - ${numeroDoc} - ${valorFormatado}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #f1f5f9;
      color: #0f172a;
      padding: 24px;
      font-size: 11px;
    }
    .no-print {
      display: flex;
      justify-content: space-between;
      align-items: center;
      max-width: 820px;
      margin: 0 auto 20px auto;
      padding: 14px 20px;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
    }
    .no-print .info {
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
    }
    .no-print .info span {
      display: block;
      font-size: 11px;
      font-weight: normal;
      color: #64748b;
    }
    .btn-group {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .btn {
      padding: 8px 14px;
      font-size: 11px;
      font-weight: 600;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      color: #1e293b;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }
    .btn:hover {
      background: #f8fafc;
      border-color: #94a3b8;
    }
    .btn-primary {
      background: #0f172a;
      color: #ffffff;
      border-color: #0f172a;
    }
    .btn-primary:hover {
      background: #1e293b;
    }
    .btn-pix {
      background: #059669;
      color: #ffffff;
      border-color: #059669;
    }
    .btn-pix:hover {
      background: #047857;
    }

    .boleto-page {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      padding: 32px 28px;
      border-radius: 12px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
    }

    .corte-line {
      border-top: 1px dashed #94a3b8;
      margin: 24px 0 20px 0;
      position: relative;
      text-align: right;
    }
    .corte-line span {
      position: absolute;
      top: -9px;
      right: 10px;
      background: #ffffff;
      padding: 0 8px;
      font-size: 10px;
      color: #64748b;
    }

    .bank-header {
      display: flex;
      align-items: flex-end;
      border-bottom: 2px solid #000;
      padding-bottom: 6px;
      margin-bottom: 4px;
    }
    .bank-name {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #000;
    }
    .bank-code {
      font-size: 18px;
      font-weight: 800;
      padding: 0 14px;
      border-left: 2px solid #000;
      border-right: 2px solid #000;
      margin: 0 14px;
      color: #000;
    }
    .linha-digitavel {
      flex: 1;
      text-align: right;
      font-family: "Courier New", Courier, monospace;
      font-size: 13px;
      font-weight: 700;
      color: #000;
      letter-spacing: 0.5px;
    }

    .b-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 4px;
    }
    .b-table td, .b-table th {
      border: 1px solid #000000;
      padding: 3px 6px;
      vertical-align: top;
      text-align: left;
    }
    .b-label {
      font-size: 9px;
      text-transform: uppercase;
      color: #475569;
      font-weight: 600;
      display: block;
      margin-bottom: 2px;
      line-height: 1;
    }
    .b-value {
      font-size: 11px;
      font-weight: 600;
      color: #000000;
      min-height: 14px;
      line-height: 1.2;
    }
    .b-value-right {
      text-align: right;
    }
    .b-value-highlight {
      font-size: 13px;
      font-weight: 800;
    }

    .footer-barcodes {
      display: flex;
      align-items: stretch;
      gap: 16px;
      margin-top: 14px;
      padding-top: 8px;
    }
    .barcode-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: #ffffff;
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }
    .barcode-svg {
      width: 100%;
      max-width: 530px;
      height: 64px;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .barcode-svg svg {
      width: 100%;
      height: 100%;
      display: block;
    }
    .barcode-text {
      font-family: "Courier New", Courier, monospace;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-align: center;
      margin-top: 6px;
      color: #000000;
    }
    .barcode-subtext {
      font-family: monospace;
      font-size: 10px;
      color: #475569;
      text-align: center;
      margin-top: 3px;
      letter-spacing: 0.5px;
    }

    .pix-hybrid-box {
      width: 220px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px;
      background: #f8fafc;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .pix-title {
      font-size: 11px;
      font-weight: 800;
      color: #047857;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .pix-qr {
      width: 120px;
      height: 120px;
      background: #ffffff;
      padding: 4px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .pix-help {
      font-size: 9px;
      color: #64748b;
      margin-top: 6px;
      line-height: 1.2;
    }

    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
      .boleto-page {
        box-shadow: none;
        padding: 0;
        max-width: 100%;
        margin: 0;
      }
      @page {
        size: A4 portrait;
        margin: 10mm;
      }
    }
  </style>
</head>
<body>

  <!-- Barra de Ações Rápidas (Oculta na Impressão) -->
  <div class="no-print">
    <div class="info">
      Boleto Bancário - <strong>${bank.bankName} (${bank.bankCode})</strong>
      <span>${params.descricao || 'Mensalidade Escolar'} • Vencimento: ${vencimentoFormatado} • Agência/Coop: ${bank.agency} • Conta: ${bank.account}</span>
    </div>
    <div class="btn-group">
      <button class="btn btn-primary" onclick="window.print()">
        🖨️ Imprimir Boleto
      </button>
      <button class="btn" onclick="copiarLinha()">
        📋 Copiar Linha Digitável
      </button>
      <button class="btn" onclick="copiarBarras()">
        🔢 Copiar Código de Barras (44D)
      </button>
      <button class="btn btn-pix" onclick="copiarPix()">
        📱 Copiar PIX
      </button>
    </div>
  </div>

  <div class="boleto-page">

    <!-- RECIBO DO PAGADOR -->
    <div class="bank-header">
      <div style="display:flex;align-items:center;margin-right:12px;">${bank.logoHtml}</div>
      <div class="bank-name">${bank.bankName}</div>
      <div class="bank-code">${bank.bankCode}</div>
      <div class="linha-digitavel">${linhaDigitavel}</div>
    </div>

    <table class="b-table">
      <tr>
        <td colspan="4">
          <span class="b-label">Beneficiário</span>
          <div class="b-value">${params.beneficiarioNome || 'ESCOLA INTERAGIR LTDA'} - CNPJ: ${params.beneficiarioCnpj || '48.912.450/0001-89'}</div>
        </td>
        <td style="width: 25%;">
          <span class="b-label">Agência / Código Beneficiário</span>
          <div class="b-value b-value-right">${bank.agency} / ${bank.account}</div>
        </td>
      </tr>
      <tr>
        <td style="width: 20%;">
          <span class="b-label">Número do Documento</span>
          <div class="b-value">${numeroDoc}</div>
        </td>
        <td style="width: 20%;">
          <span class="b-label">CPF/CNPJ Beneficiário</span>
          <div class="b-value">${params.beneficiarioCnpj || '48.912.450/0001-89'}</div>
        </td>
        <td style="width: 15%;">
          <span class="b-label">Vencimento</span>
          <div class="b-value b-value-highlight">${vencimentoFormatado}</div>
        </td>
        <td style="width: 20%;">
          <span class="b-label">Valor do Documento</span>
          <div class="b-value b-value-highlight b-value-right">${valorFormatado}</div>
        </td>
        <td style="width: 25%;">
          <span class="b-label">Nosso Número</span>
          <div class="b-value b-value-right">${nossoNum}</div>
        </td>
      </tr>
      <tr>
        <td colspan="4">
          <span class="b-label">Pagador / Aluno</span>
          <div class="b-value">${params.pagadorNome || 'Consumidor Final'} ${params.pagadorCpfCnpj ? `- CPF: ${params.pagadorCpfCnpj}` : ''}</div>
        </td>
        <td>
          <span class="b-label">Data de Emissão</span>
          <div class="b-value b-value-right">${emissaoFormatada}</div>
        </td>
      </tr>
      <tr>
        <td colspan="5">
          <span class="b-label">Demonstrativo / Descrição</span>
          <div class="b-value">${params.descricao || 'Prestação de serviços educacionais / Mensalidade escolar'}</div>
        </td>
      </tr>
    </table>

    <div class="corte-line">
      <span>✂ Destaque aqui</span>
    </div>

    <!-- FICHA DE COMPENSAÇÃO -->
    <div class="bank-header">
      <div style="display:flex;align-items:center;margin-right:12px;">${bank.logoHtml}</div>
      <div class="bank-name">${bank.bankName}</div>
      <div class="bank-code">${bank.bankCode}</div>
      <div class="linha-digitavel">${linhaDigitavel}</div>
    </div>

    <table class="b-table">
      <tr>
        <td colspan="4" style="width: 75%;">
          <span class="b-label">Local de Pagamento</span>
          <div class="b-value">PAGÁVEL EM QUALQUER BANCO OU CORRESPONDENTE BANCÁRIO ATÉ O VENCIMENTO</div>
        </td>
        <td style="width: 25%;">
          <span class="b-label">Vencimento</span>
          <div class="b-value b-value-highlight b-value-right">${vencimentoFormatado}</div>
        </td>
      </tr>
      <tr>
        <td colspan="4">
          <span class="b-label">Beneficiário</span>
          <div class="b-value">${params.beneficiarioNome || 'ESCOLA INTERAGIR LTDA'} - CNPJ: ${params.beneficiarioCnpj || '48.912.450/0001-89'}</div>
          <div style="font-size: 9px; color: #64748b; margin-top: 2px;">${params.beneficiarioEndereco || 'Rua Ilha Bela, 703, Papagaio - Feira de Santana/BA'}</div>
        </td>
        <td>
          <span class="b-label">Agência / Código Beneficiário</span>
          <div class="b-value b-value-right">${bank.agency} / ${bank.account}</div>
        </td>
      </tr>
      <tr>
        <td style="width: 18%;">
          <span class="b-label">Data do Documento</span>
          <div class="b-value">${emissaoFormatada}</div>
        </td>
        <td style="width: 22%;">
          <span class="b-label">Número do Documento</span>
          <div class="b-value">${numeroDoc}</div>
        </td>
        <td style="width: 15%;">
          <span class="b-label">Espécie DOC</span>
          <div class="b-value">DM</div>
        </td>
        <td style="width: 20%;">
          <span class="b-label">Aceite</span>
          <div class="b-value">NÃO</div>
        </td>
        <td>
          <span class="b-label">Nosso Número</span>
          <div class="b-value b-value-right">${nossoNum}</div>
        </td>
      </tr>
      <tr>
        <td style="width: 18%;">
          <span class="b-label">Uso do Banco</span>
          <div class="b-value"></div>
        </td>
        <td style="width: 22%;">
          <span class="b-label">Carteira</span>
          <div class="b-value">${bank.carteira}</div>
        </td>
        <td style="width: 15%;">
          <span class="b-label">Espécie Moeda</span>
          <div class="b-value">R$</div>
        </td>
        <td style="width: 20%;">
          <span class="b-label">Quantidade</span>
          <div class="b-value"></div>
        </td>
        <td>
          <span class="b-label">Valor do Documento</span>
          <div class="b-value b-value-highlight b-value-right">${valorFormatado}</div>
        </td>
      </tr>
      <tr>
        <td colspan="4" rowspan="5" style="vertical-align: top;">
          <span class="b-label">Instruções de Responsabilidade do Beneficiário</span>
          <div class="b-value" style="font-weight: normal; line-height: 1.5; padding: 4px 0;">
            ${instrucoesHtml}
          </div>
        </td>
        <td>
          <span class="b-label">(-) Desconto / Abatimento</span>
          <div class="b-value b-value-right"></div>
        </td>
      </tr>
      <tr>
        <td>
          <span class="b-label">(-) Outras Deduções</span>
          <div class="b-value b-value-right"></div>
        </td>
      </tr>
      <tr>
        <td>
          <span class="b-label">(+) Mora / Multa</span>
          <div class="b-value b-value-right"></div>
        </td>
      </tr>
      <tr>
        <td>
          <span class="b-label">(+) Outros Acréscimos</span>
          <div class="b-value b-value-right"></div>
        </td>
      </tr>
      <tr>
        <td>
          <span class="b-label">(=) Valor Cobrado</span>
          <div class="b-value b-value-highlight b-value-right">${valorFormatado}</div>
        </td>
      </tr>
      <tr>
        <td colspan="5">
          <span class="b-label">Pagador / Sacado</span>
          <div class="b-value">
            <strong>${params.pagadorNome || 'Consumidor Final'}</strong> ${params.pagadorCpfCnpj ? `- CPF/CNPJ: ${params.pagadorCpfCnpj}` : ''}
          </div>
          <div style="font-size: 10px; color: #475569; margin-top: 2px;">
            ${params.pagadorEndereco || 'Endereço cadastrado na secretaria escolar'}
          </div>
        </td>
      </tr>
    </table>

    <!-- RODAPÉ COM CÓDIGO DE BARRAS E PIX HÍBRIDO -->
    <div class="footer-barcodes">
      <div class="barcode-container">
        <div class="barcode-svg">
          ${barcodeSvg}
        </div>
        <div class="barcode-text">
          ${linhaDigitavel}
        </div>
        <div class="barcode-subtext">
          Código de Barras (44 dígitos): <strong>${barcodeNumber}</strong>
        </div>
      </div>

      <div class="pix-hybrid-box">
        <div class="pix-title">⚡ Pague com Pix</div>
        <div class="pix-qr">
          ${pixQrSvg}
        </div>
        <div class="pix-help">
          Aponte a câmera no app do seu banco para compensação imediata.
        </div>
      </div>
    </div>

  </div>

  <script>
    const LINHA_DIGITAVEL = "${linhaDigitavel}";
    const BARCODE_NUMBER = "${barcodeNumber}";
    const PIX_PAYLOAD = "${pixPayload}";

    function copiarLinha() {
      navigator.clipboard.writeText(LINHA_DIGITAVEL).then(() => {
        alert("Linha digitável (47 dígitos) copiada com sucesso!");
      }).catch(() => {
        prompt("Copie a linha digitável:", LINHA_DIGITAVEL);
      });
    }

    function copiarBarras() {
      navigator.clipboard.writeText(BARCODE_NUMBER).then(() => {
        alert("Código de barras (44 dígitos) copiado com sucesso!");
      }).catch(() => {
        prompt("Copie o código de barras numérico:", BARCODE_NUMBER);
      });
    }

    function copiarPix() {
      navigator.clipboard.writeText(PIX_PAYLOAD).then(() => {
        alert("Código Pix Copia e Cola copiado com sucesso!");
      }).catch(() => {
        prompt("Copie o código Pix Copia e Cola:", PIX_PAYLOAD);
      });
    }
  </script>
</body>
</html>`;
}

/**
 * Abre o boleto gerado diretamente em uma nova aba do navegador Chrome
 */
export function openBoletoInNewTab(params: BoletoData): {
  opened: boolean;
  url: string;
  linhaDigitavel: string;
  barcodeNumber: string;
} {
  const activeGateway = params.gatewayId || getActiveBankingGateway();
  const bank = getBankSlipDetails(activeGateway, params.valor, params.vencimento);
  const html = generateBoletoHtml(params);

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  // Tentativa de abrir na nova aba
  const newTab = window.open(url, '_blank');
  const opened = !!(newTab && !newTab.closed && typeof newTab.closed !== 'undefined');

  return {
    opened,
    url,
    linhaDigitavel: bank.linhaDigitavel,
    barcodeNumber: bank.barcodeNumber,
  };
}
