# Integração Asaas por tenant

## Objetivo

Cada organização do Kronos conecta a própria conta Asaas. A API Key nunca é enviada ao navegador, não aparece nas consultas da aplicação e é persistida com AES-256-GCM usando uma chave exclusiva do ambiente.

## Fluxo

1. Proprietário ou administrador informa a API Key e escolhe Sandbox ou Produção.
2. O servidor valida a chave em `GET /v3/myAccount/commercialInfo/`.
3. O Kronos cria um webhook exclusivo para a organização e armazena apenas o SHA-256 do token de autenticação.
4. A API Key é criptografada e armazenada separadamente dos metadados visíveis da conexão.
5. Ao gerar um boleto, o cliente é localizado pelo vínculo interno ou por `externalReference`; se ainda não existir, é criado no Asaas.
6. A cobrança é criada em `POST /v3/payments` e vinculada ao cliente e, opcionalmente, ao agendamento.
7. O webhook atualiza automaticamente o estado da cobrança. O ID do evento garante idempotência.

## Variáveis do servidor

- `SUPABASE_SECRET_KEY`: acesso exclusivo das rotas confiáveis às tabelas sem grants para usuários.
- `ASAAS_CREDENTIALS_ENCRYPTION_KEY`: 32 bytes aleatórios em Base64. Deve ser diferente por ambiente e nunca pode usar o prefixo `NEXT_PUBLIC_`.

## Endpoint do webhook

`POST /api/webhooks/asaas/{organization_id}`

O endpoint:

- limita o payload a 256 KB;
- valida `asaas-access-token` em tempo constante;
- grava o evento antes de processá-lo;
- aceita repetição sem aplicar a baixa duas vezes;
- responde `200` apenas depois de concluir ou reconhecer um evento já processado.

## Permissões

- Proprietário e administrador: conectar ou desconectar conta e emitir cobranças.
- Recepção: emitir e sincronizar cobranças.
- Demais perfis: sem acesso ao livro financeiro.
- `anon` e `authenticated`: nenhum acesso às credenciais criptografadas nem aos payloads dos webhooks.

## Homologação

Começar sempre no Sandbox. Criar um cliente fictício, emitir um boleto e simular os eventos de pagamento. Somente depois conectar uma chave de Produção no workspace correspondente.
