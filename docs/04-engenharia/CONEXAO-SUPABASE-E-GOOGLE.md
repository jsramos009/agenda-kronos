# Conexão do Supabase e login com Google

## Estado confirmado em 26 de agosto de 2026

- Projeto alvo: `auidksphelvjffwzzpre`.
- A API de autenticação responde normalmente.
- Cadastro com e-mail está habilitado.
- Confirmação de e-mail está ativa.
- O schema público ainda não possui as tabelas Kronos.
- O provedor Google ainda não está habilitado.
- A chave publicável está configurada somente no ambiente local ignorado pelo Git.
- Nenhuma chave privilegiada foi adicionada ao repositório.

## O que ainda depende de autorização externa

A URL do projeto, a chave publicável e a `service_role` não permitem executar DDL. Para criar as tabelas é necessário autorizar o projeto no conector Supabase ou fornecer uma conexão PostgreSQL/Management API válida. O conector atual só enxerga outro projeto e, por segurança, não deve ser usado.

Quando o projeto correto estiver autorizado, aplique em ordem todas as migrações de `supabase/migrations`. Em seguida:

1. Gere os tipos TypeScript do projeto.
2. Execute os testes de `supabase/tests`.
3. Rode os advisors de segurança e desempenho do Supabase.
4. Confirme que todas as tabelas públicas têm RLS e políticas explícitas.
5. Cadastre um usuário, crie o primeiro workspace e teste o limite de duas agendas.

## Ativação do Google

No Google Auth Platform, crie um cliente OAuth do tipo **Web application**. Adicione a origem local e o domínio de produção. No campo de redirecionamento autorizado use:

`https://auidksphelvjffwzzpre.supabase.co/auth/v1/callback`

No Supabase, abra **Authentication > Providers > Google**, habilite o provedor e informe o Client ID e Client Secret do Google. Em **URL Configuration**, permita:

- `http://localhost:3000/auth/confirm`
- `https://agendakronos.vercel.app/auth/confirm`

O aplicativo já chama `signInWithOAuth`, usa PKCE e troca o código em `/auth/confirm`. Sem as credenciais do Google, o botão aparece, mas o provedor recusará o início do fluxo.

## Variáveis de produção

Somente estas variáveis precisam estar disponíveis no navegador:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

Uma chave `service_role` nunca deve usar o prefixo `NEXT_PUBLIC_`. Para os fluxos atuais ela não é necessária na aplicação.
