# AI Pull Request Reviewer

[![CI](https://github.com/RamonRDR/ai-pull-request-reviewer/actions/workflows/ci.yml/badge.svg)](https://github.com/RamonRDR/ai-pull-request-reviewer/actions/workflows/ci.yml) · [Licença MIT](LICENSE) · [English](README.md) · [Español](README.es.md)

**Revisor de pull requests com foco em segurança, IA opcional e decisão humana.**

> **Status: MVP de portfólio.** O modo padrão é um mock determinístico claramente identificado; ele **não detecta bugs reais**. Chamadas pagas de IA e publicação de comentários em PRs estão desativadas por padrão.

## Objetivo e funcionalidades

A ferramenta consulta PRs pela API REST com Octokit, lê branches, metadados, arquivos e diffs, identifica linhas adicionadas, filtra artefatos e dados sensíveis, prepara contexto limitado, valida respostas com Zod, classifica observações, elimina duplicatas e gera relatórios Markdown. A publicação real exige autorização tripla. Nunca aprova, rejeita ou faz merge automaticamente.

## Tecnologias

Node.js 26 LTS no CI, TypeScript strict, Octokit, OpenAI SDK (adaptador opcional), Zod, Vitest, ESLint, Prettier e GitHub Actions. Sem servidor, banco, Redis ou filas.

## Arquitetura

**GitHub API → interpretação de diffs → filtros e contexto → provedor mock ou LLM → Zod e validação de linhas → relatório Markdown.** Publicação no GitHub é um caminho separado, bloqueado por padrão. Ver [arquitetura](docs/ARCHITECTURE.md), [decisões](docs/DECISIONS.md) e [segurança](docs/SECURITY.md).

## Instalação

```bash
git clone https://github.com/RamonRDR/ai-pull-request-reviewer.git
cd ai-pull-request-reviewer
npm install
npm run demo
npm run evaluate
```

O relatório simulado será criado em `reports/demo.md⟧. Não representa revisão efetiva de IA.

## Configuração e regras personalizadas

Edite `.ai-pr-reviewer.json⟧. Defina categorias, gravidade mínima, globs ignorados, limites de arquivos, contexto, tokens, comentários e orçamento, idioma `pt-BR⟧ e regras personalizadas. A configuração inválida interrompe a execução. Use `.env.example⟧ como referência, mas nunca commite credenciais.

## Integração GitHub

Com `GITHUB_TOKEN⟧ limitado a leitura de repositório e PRs:

```bash
npm run build
node dist/src/cli.js --repo OWNER/REPO --pr 123 --provider mock
```

O modo mock só reconhece marcadores de demonstração sintéticos, como `DEMO_BUG⟧, e normalmente não produz observações para PRs reais.

## Provedor LLM opcional e custos

Configure `OPENAI_API_KEY⟧, `LLM_MODEL⟧, preços atuais por milhão de tokens em `LLM_INPUT_PRICE_PER_MILLION⟧ e `LLM_OUTPUT_PRICE_PER_MILLION⟧; execute com `--provider openai --allow-external-llm⟧. Isso gera cobrança e **não é executado automaticamente no CI**. O projeto bloqueia chamadas sem preço ou sem orçamento suficiente, e bloqueia repositórios privados. Redação de segredos não é perfeita: não envie código confidencial.

## Categorias, gravidade e comentários

Categorias: bug, security, edge_case, maintainability, testing, performance. Gravidades: critical, high, medium, low, informational. Cada observação deve ter arquivo, linha adicionada válida, explicação, sugestão e gravidade. Sugestões de LLM são hipóteses, não diagnósticos comprovados.

A publicação real exige **simultaneamente** `--publish⟧, `enablePublishing: true⟧ e `ALLOW_GITHUB_COMMENTS=true⟧, além de permissão de escrita em PR. Forks, relatórios parciais e mocks são bloqueados. Fingerprints reduzem comentários repetidos. Aprovação e merge permanecem humanos.

## Segurança

O revisor não baixa nem executa código de PRs analisados e não usa `pull_request_target⟧. Os workflows não recebem chaves de IA nem publicam comentários. Os controles de injeção de prompt e vazamento de segredos têm limitações conhecidas, documentadas em [SECURITY.md](docs/SECURITY.md).

## Testes e GitHub Actions

`npm run lint⟧, `npm run format:check⟧, `npm run typecheck⟧, `npm test⟧, `npm run test:integration⟧, `npm run evaluate⟧ e `npm run build⟧.

O workflow [CI](.github/workflows/ci.yml) usa runners GitHub e checa qualidade, build, segurança de dependências e demo. O workflow [Manual read-only review](.github/workflows/demo.yml) usa execução manual e não faz chamadas pagas nem publicação.

## Avaliação

Há **27 fixtures sintéticas**: 18 com marcadores de problemas, sete sem problemas e duas tentativas textuais de prompt injection. As métricas de precisão, recall, falsos positivos, duplicatas, localização, tokens e custos são **exclusivamente do mock**. Não indicam precisão de um modelo de IA real.

## Demonstração

Ver [DEMO.md](docs/DEMO.md). O relatório simulado mostra problemas intencionais em `src/average.ts⟧ e não aponta um exemplo correto. Sem alegar screenshots ou análises reais não realizadas.

## Limitações

Sem análise semântica completa entre arquivos, execução de código, garantia contra falhas, eficácia comprovada do LLM ou publicação ao vivo validada. Diffs grandes, binários e parciais reduzem cobertura. Custos são estimativas. O sistema é um assistente de revisão, não substitui o julgamento humano.

## Licença

[MIT](LICENSE), © 2026 Ramon Rodriguez. Manter avisos de terceiros.
