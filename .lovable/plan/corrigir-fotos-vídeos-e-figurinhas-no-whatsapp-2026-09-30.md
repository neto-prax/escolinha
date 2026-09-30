# Corrigir fotos, vídeos e figurinhas no WhatsApp

## Diagnóstico confirmado

- As fotos e figurinhas recebidas hoje foram gravadas com tipos como `imagemessage` e `stickermessage`, mas com o endereço do arquivo vazio.
- O receptor só reconhece nomes simplificados como `image`, `video` e `sticker`; por isso não extrai nem salva a mídia dos formatos reais enviados pela Uazapi.
- A conversa exibe apenas o texto da mensagem. Os dois arquivos existentes para exibir e ampliar mídias estão vazios, então mesmo uma mensagem com arquivo não seria apresentada.
- Já existe armazenamento de mídias no projeto, porém o receptor atual não o utiliza.

## Implementação

1. **Normalizar todos os formatos recebidos**
   - Traduzir `imagemessage`, `videomessage`, `stickermessage`, áudio e documento para os tipos internos corretos.
   - Extrair legenda, nome, formato e referência da mídia do payload real da Uazapi.
   - Tratar texto estendido como texto normal, evitando tipos desconhecidos na tela.

2. **Baixar e guardar a mídia permanentemente**
   - Usar o recurso de download da Uazapi quando o webhook não trouxer um arquivo diretamente acessível.
   - Salvar cada arquivo no armazenamento existente, separado por escola e conversa.
   - Persistir o endereço definitivo em `media_url`, sem depender de links temporários do WhatsApp.
   - Manter a deduplicação pelo identificador da mensagem para não baixar ou salvar o mesmo arquivo duas vezes.

3. **Exibir a mídia na conversa**
   - Restaurar o componente de mídia para mostrar imagens e figurinhas dentro do balão.
   - Reproduzir vídeos com controles e manter o suporte existente a áudio e documentos.
   - Abrir imagens e vídeos em visualização ampliada, com estados claros de carregamento e falha.
   - Não exibir um balão vazio quando a mensagem tiver somente mídia.

4. **Validar o fluxo completo**
   - Publicar o receptor atualizado.
   - Enviar uma foto, um vídeo e uma figurinha reais pelo WhatsApp conectado.
   - Confirmar que cada arquivo é salvo uma única vez, pertence à escola correta e aparece imediatamente na conversa.
   - Verificar compilação, celular e computador, sem reintroduzir consultas periódicas.

## Observação sobre mensagens antigas

As mensagens já gravadas sem arquivo não podem ser reconstruídas apenas pelo banco. Quando a Uazapi ainda permitir baixar pelo identificador original, será feita a recuperação; caso contrário, a correção valerá para novas mídias recebidas.

## Detalhes técnicos

- Receptor: normalização do payload, download da mídia e gravação definitiva.
- Interface: renderizador e visualização ampliada para `image`, `video`, `sticker`, `audio` e `document`.
- Segurança: caminhos de arquivo separados por escola e resolução da escola somente pela instância configurada.
