# Auditoria técnica e visual — Kronos

Data: 25 de agosto de 2026  
Escopo: workspace local, branch `main`, GitHub, aplicação Next.js, migrations Supabase e identidade visual.

## Resumo executivo

O workspace local e o GitHub estavam sincronizados no commit `a647e64`, sem branch, tag ou commit adicional atribuível separadamente ao Cláudio/Claude. A aplicação compilava e apresentava uma base consistente, porém a primeira migration delegava restrições finas de papel às Server Actions. Isso não protege contra chamadas diretas à Data API do Supabase.

As falhas críticas encontradas foram corrigidas antes da publicação:

- escrita por papel passou a ser aplicada no próprio RLS;
- profissionais só leem atendimentos e clientes associados a eles;
- analistas não recebem acesso direto a dados pessoais de clientes;
- relações entre entidades de organizações diferentes foram bloqueadas com chaves compostas;
- criação de agendamento e cartão do fluxo passou a ser uma única transação;
- mudança de etapa e status do agendamento passou a ser uma única transação;
- atualização da identidade da organização e do tema passou a ser uma única transação;
- consentimento de contato deixou de ser presumido;
- logos SVG foram removidos do upload público;
- mensagens de cadastro não expõem o erro bruto do provedor;
- redirecionamento após confirmação passou a usar uma lista permitida;
- cabeçalhos HTTP de endurecimento foram adicionados;
- versões de dependências foram fixadas no manifesto e no lockfile.

## Evidências de validação

- `npm run lint`: aprovado.
- `npm run typecheck`: aprovado.
- `npm run build`: aprovado, 25 rotas geradas.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilidades.
- `npm audit signatures`: 366 pacotes com assinatura verificada e 98 com atestação.
- desktop 1280 × 720: sem overflow horizontal; sidebar com 264 px e conteúdo com 1001 px.
- mobile 390 × 844: sem overflow horizontal; conteúdo em escrita `horizontal-tb`.

## Banco e proteção de dados

### Aprovado

- segredos locais permanecem ignorados pelo Git;
- nenhuma chave secreta real está versionada;
- tabelas de negócio expostas usam grants explícitos e RLS;
- funções `security definer` privadas usam `search_path` fixo e execução restrita;
- bucket de logo usa prefixo por organização e escrita administrativa;
- restrição de sobreposição impede dois atendimentos simultâneos do mesmo profissional;
- novo conjunto de testes SQL cobre política por papel, vínculo entre organizações e rejeição de SVG.

### Pendente de validação remota

O projeto Supabase indicado (`auidksphelvjffwzzpre`) não está autenticado neste workspace e a chave pública está vazia. Por segurança, nenhuma migration foi aplicada a outro projeto disponível na conta. As migrations e os testes SQL precisam ser executados no projeto correto depois que ele for autorizado.

## Coerência funcional

### Corrigido

- cadastro de cliente agora grava `consent_at` somente quando o operador confirma a autorização;
- agendamento não pode ficar criado sem o cartão correspondente por falha intermediária;
- Kanban e status do agendamento não podem divergir por falha intermediária;
- nome, nicho e paleta da organização são atualizados de forma atômica;
- validação de tamanho e tipo do logo ocorre antes da criação da organização.

### Funcionalidades ainda incompletas

- convite de equipe registra a intenção, mas o envio de e-mail e o fluxo de aceite ainda precisam de um provedor/worker;
- abas avançadas de agenda, notificações e Kanban exibem configuração visual, mas nem todos os controles persistem;
- o perfil analista está protegido contra PII, porém os relatórios agregados dedicados ainda precisam de views/RPCs próprias;
- o sistema opera em demonstração enquanto a chave pública e as migrations do Supabase correto não forem configuradas.

## Identidade visual

- fontes declaradas: Intro Pro como principal e Univers como secundária;
- os arquivos licenciados dessas fontes não vieram na pasta de identidade, portanto o sistema usa as famílias quando instaladas e fallbacks compatíveis quando ausentes;
- o símbolo foi redesenhado para manter o K voltado à direita, retirar o aro fino e usar marcações de relógio mais firmes;
- homepage e workspace foram verificados em desktop e mobile, com hierarquia horizontal e sem textos comprimidos verticalmente.

## Critério para produção

A versão pode ser publicada como demonstração visual e funcional. Para liberar autenticação e persistência reais, são obrigatórios:

1. autorizar o projeto Supabase `auidksphelvjffwzzpre`;
2. aplicar as migrations na ordem versionada;
3. executar `supabase test db` e os advisors de segurança/desempenho;
4. configurar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `NEXT_PUBLIC_SITE_URL` na Vercel;
5. configurar no Supabase as URLs de callback do domínio publicado.

## Publicação Vercel

- projeto: `agenda-kronos`;
- ambiente: produção;
- estado: `READY`;
- domínio: https://agenda-kronos.vercel.app;
- resposta da homepage: HTTP 200;
- framework detectado: Next.js;
- erros de runtime na primeira hora: nenhum;
- cabeçalhos de proteção confirmados no domínio: HSTS, `nosniff`, bloqueio de iframe, política de referência e política de permissões.

A publicação está em modo demonstração porque as variáveis públicas do Supabase ainda não foram autorizadas no ambiente de produção.
