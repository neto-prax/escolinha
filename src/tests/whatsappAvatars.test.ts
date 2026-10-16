import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveContactPhoto } from '../hooks/useWhatsAppInbox';

describe('Sincronização & Resolução de Fotos de Perfil do WhatsApp', () => {
  const uazapiPhotoUrl = 'https://pps.whatsapp.net/v/t61.24694-24/test-uazapi-avatar.jpg';
  const studentPhotoUrl = 'https://storage.google.com/schools/student-portrait.jpg';
  const explicitDbPhotoUrl = 'https://eafntyicpalnyzonnrgn.supabase.co/storage/v1/object/public/contacts/contact-123.jpg';

  it('deve priorizar a foto oficial vinda diretamente da API do WhatsApp (Uazapi)', () => {
    const photo = resolveContactPhoto(
      '5511999999999',
      'Maria Silva',
      null,
      studentPhotoUrl,
      uazapiPhotoUrl
    );

    assert.equal(photo, uazapiPhotoUrl, 'A foto retornada pela Uazapi deve ter prioridade máxima');
  });

  it('deve priorizar a foto salva no contato do banco se não for gerador de iniciais', () => {
    const photo = resolveContactPhoto(
      '5511999999999',
      'Maria Silva',
      explicitDbPhotoUrl,
      studentPhotoUrl,
      null
    );

    assert.equal(photo, explicitDbPhotoUrl, 'Foto persistida no banco do contato deve ser respeitada');
  });

  it('deve ignorar URLs de iniciais geradas por SVG (dicebear) em favor da foto da Uazapi', () => {
    const dicebearUrl = 'https://api.dicebear.com/7.x/initials/svg?seed=MS';
    const photo = resolveContactPhoto(
      '5511999999999',
      'Maria Silva',
      dicebearUrl,
      null,
      uazapiPhotoUrl
    );

    assert.equal(photo, uazapiPhotoUrl, 'Iniciais do Dicebear devem ser ignoradas quando houver foto real');
  });

  it('deve rejeitar e ignorar fotos fakes de bancos de imagens genéricos (ex: Unsplash)', () => {
    const fakeStockUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160';
    const photo = resolveContactPhoto(
      '5511999999999',
      'Maria Silva',
      fakeStockUrl,
      null,
      null
    );

    assert.equal(photo, null, 'Fotos de modelos ou bancos de imagens não devem ser atribuídas aos contatos');
  });

  it('deve recorrer à foto do aluno vinculado caso o WhatsApp não tenha foto pública', () => {
    const photo = resolveContactPhoto(
      '5511999999999',
      'Maria Silva',
      null,
      studentPhotoUrl,
      null
    );

    assert.equal(photo, studentPhotoUrl, 'Deve exibir foto do aluno vinculado como fallback pedagógico');
  });

  it('deve retornar null quando o contato não possui nenhuma foto real, para que o componente exiba as iniciais legítimas', () => {
    const photo = resolveContactPhoto('5511988887777', 'João Pedro', null, null, null);

    assert.equal(photo, null, 'Deve retornar null para permitir AvatarFallback com iniciais');
  });
});
