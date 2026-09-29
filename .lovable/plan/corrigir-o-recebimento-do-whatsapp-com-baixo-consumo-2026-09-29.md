# Corrigir o recebimento do WhatsApp com baixo consumo

## Diagnóstico confirmado

- A Uazapi entregou uma mensagem de teste às 23:22, mas a versão publicada do receptor respondeu `Unhandled event type: undefined`; por isso a mensagem não chegou à caixa de entrada.
- O código local já reconhece `EventType: "messages"`, portanto a versão publicada e o código do projeto estão desencontrados.
- A tela consulta o status da Uazapi a cada 15 segundos e, em cada consulta, tenta configurar novamente o webhook. O mesmo hook é aberto por vários componentes, multiplicando chamadas e inicializações.
- Conversas são consultadas a cada 4 segundos e mensagens a cada 3 segundos, embora o projeto já tenha atualização em tempo real habilitada.
- Há registros duplicados para os mesmos nomes de instância e não existe trava contra salvar o mesmo identificador de mensagem duas vezes.

## Implementação

1. **Receptor compatível e confiável**
   - Refatorar o receptor para normalizar o formato real da Uazapi antes de processar texto, mídia, remetente e eventos de status.
   - Validar o conteúdo recebido, ignorar grupos e mensagens sem telefone com respostas claras.
   - Vincular a mensagem somente à escola da instância configurada; remover o fallback perigoso que escolhe a primeira escola.
   - Registrar logs curtos, sem imprimir todo o conteúdo da conversa.

2. **Evitar duplicações**
   - Consolidar os registros repetidos da instância ativa.
   - Criar unicidade para o identificador externo da mensagem e tratar reenvios do webhook como sucesso sem gravar novamente.
   - Manter conversa, não lidas e última mensagem consistentes em reentregas.

3. **Reduzir consumo de créditos**
   - Configurar o webhook apenas ao conectar ou ao clicar em configurar, nunca durante uma simples consulta de status.
   - Remover as consultas automáticas de 3 e 4 segundos e usar a atualização em tempo real já disponível.
   - Fazer uma única consulta de status por sessão, atualizar sob demanda e reutilizar os mesmos dados entre as abas, evitando múltiplas instâncias do hook.
   - Buscar apenas os campos e as mensagens necessárias para a conversa aberta.

4. **Publicar e validar ponta a ponta**
   - Publicar as funções de recebimento e Uazapi atualizadas.
   - Confirmar a configuração do webhook uma única vez.
   - Enviar uma mensagem real de teste para o WhatsApp conectado e verificar: chegada no receptor, gravação única, escola correta e exibição imediata na tela.
   - Validar envio, recebimento, compilação e ausência de chamadas periódicas desnecessárias.

## Detalhes técnicos

- Funções envolvidas: receptor de eventos e integração Uazapi.
- Tela envolvida: Central de Mensagens e seu hook compartilhado.
- Banco: índice de idempotência e saneamento dos vínculos duplicados de instância, preservando as mensagens existentes.
