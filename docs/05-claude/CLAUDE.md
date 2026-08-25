# Contexto operacional — Kronos

Você está trabalhando na Kronos, um sistema de agendamento adaptativo para pequenos negócios de serviço.

## Leia antes de alterar

1. `../02-produto/PRD.md`
2. `../02-produto/ARQUITETURA-DE-INFORMACAO.md`
3. `../02-produto/MOTOR-ADAPTATIVO.md`
4. `../01-marca/DESIGN-SYSTEM.md`
5. `../01-marca/TABELAS-DE-CORES-POR-NICHO.md`
6. `../04-engenharia/ARQUITETURA-TECNICA.md`

## Regras invioláveis

- Use **Kronos**; não introduza “Kronus Day”.
- Preserve a moldura visual da marca e aplique cor de nicho por tokens.
- Nichos são templates configuráveis e versionados; não crie forks do app.
- Toda recomendação mostra origem, evidência e controle humano.
- Agenda, atendimento e cliente são entidades relacionadas, não cópias.
- Não declare um módulo clínico, jurídico ou fiscal como conforme sem revisão especialista.
- Mantenha responsividade, foco visível, contraste AA e alternativa em lista para a agenda.
- Textos da interface devem ser em português do Brasil, diretos e orientados à ação.

## Comandos do protótipo

```bash
npm install
npm run dev
npm run build
```

## Definição de pronto

Código tipado, build verde, navegação por teclado, estados loading/empty/error, tokens sem cores arbitrárias, dados isolados por organização e documentação atualizada quando contrato ou comportamento mudar.
