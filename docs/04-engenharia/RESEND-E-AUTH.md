# Resend no cadastro da Kronos

O código envia o e-mail de boas-vindas pela API do Resend depois que o tenant termina o onboarding. A confirmação do endereço continua sob responsabilidade do Supabase Auth e deve usar o Resend como SMTP personalizado.

## Variáveis privadas na Vercel

- `RESEND_API_KEY`: chave `re_...` criada no Resend.
- `RESEND_FROM_EMAIL`: remetente de um domínio verificado, por exemplo `contato@seudominio.com`.
- `NEXT_PUBLIC_SITE_URL`: `https://agendakronos.vercel.app`.

Nunca exponha a chave do Resend com o prefixo `NEXT_PUBLIC_`.

## SMTP do Supabase Auth

Em **Authentication → Email → SMTP Settings**:

- Host: `smtp.resend.com`
- Port: `465` (TLS) ou `587` (STARTTLS)
- Username: `resend`
- Password: a mesma `RESEND_API_KEY`
- Sender name: `Kronos`
- Sender email: o mesmo valor de `RESEND_FROM_EMAIL`

Em **Authentication → URL Configuration**:

- Site URL: `https://agendakronos.vercel.app`
- Redirect URL: `https://agendakronos.vercel.app/auth/confirm`
- Redirect local: `http://localhost:3000/auth/confirm`

O remetente precisa usar um domínio verificado no Resend com os registros DNS indicados no painel. O endereço de teste `onboarding@resend.dev` não deve ser usado em produção.
