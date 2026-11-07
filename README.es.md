# AI Pull Request Reviewer

[![CI](https://github.com/RamonRDR/ai-pull-request-reviewer/actions/workflows/ci.yml/badge.svg)](https://github.com/RamonRDR/ai-pull-request-reviewer/actions/workflows/ci.yml) · [Licencia MIT](LICENSE) · [English](README.md) · [Português](README.pt-BR.md)

**Revisor de pull requests centrado en la seguridad, con IA opcional y control humano.**

> **Estado: MVP de portafolio.** El proveedor predeterminado es un mock determinista claramente marcado; **no detecta errores reales**. Las llamadas pagadas y los comentarios en PR reales están desactivados inicialmente.

## Objetivo y funcionalidades

Consulta PR mediante GitHub REST y Octokit, lee metadatos, ramas, archivos y diffs, localiza líneas agregadas, excluye artefactos, redacta patrones de secretos, limita el contexto, valida respuestas con Zod, clasifica hallazgos, elimina duplicados y genera informes Markdown. Publicar comentarios exige una autorización triple y nunca aprueba, rechaza ni fusiona PR automáticamente.

## Tecnologías

Node.js 26 LTS para CI, TypeScript strict, Octokit, OpenAI SDK (adaptador optativo), Zod, Vitest, ESLint, Prettier y GitHub Actions. Sin servidor, base de datos ni colas.

## Arquitectura

**API de GitHub → parser de diff → filtros y contexto → mock o LLM → validación Zod y anclajes → informe Markdown.** La publicación permanece separada y desactivada. Consulte [arquitectura](docs/ARCHITECTURE.md), [decisiones](docs/DECISIONS.md) y [seguridad](docs/SECURITY.md).

## Instalación

```bash
git clone https://github.com/RamonRDR/ai-pull-request-reviewer.git
cd ai-pull-request-reviewer
npm install
npm run demo
npm run evaluate
```

La demostración gratuita genera `reports/demo.md⟧. Es una simulación, no una revisión real mediante IA.

## Configuración y reglas del repositorio

Personalice `.ai-pr-reviewer.json⟧: categorías, gravedad mínima, patrones ignorados, límites de archivos, contexto, tokens, presupuesto y comentarios, idioma `es⟧ y reglas personalizadas. Los esquemas inválidos detienen el análisis. `.env.example⟧ documenta variables, pero las credenciales no deben registrarse en Git.

## Integración con GitHub

Utilice un `GITHUB_TOKEN⟧ de solo lectura, limitado al repositorio:

```bash
npm run build
node dist/src/cli.js --repo OWNER/REPO --pr 123 --provider mock
```

El mock responde solo a marcadores sintéticos intencionados, como `DEMO_BUG⟧; los PR normales probablemente no generan hallazgos.

## Proveedor LLM opcional y control de costos

Configure `OPENAI_API_KEY⟧, `LLM_MODEL⟧, `LLM_INPUT_PRICE_PER_MILLION⟧ y `LLM_OUTPUT_PRICE_PER_MILLION⟧ con precios verificados; use `--provider openai --allow-external-llm⟧. Esta operación puede generar costos y **no se ejecuta automáticamente en CI**. Los límites bloquean solicitudes sin presupuesto o precios. No se permiten repositorios privados y la redacción de secretos no ofrece garantías absolutas.

## Categorías, gravedad y comentarios

Categorías: bug, security, edge_case, maintainability, testing, performance. Gravedad: critical, high, medium, low, informational. Los hallazgos necesitan archivo, línea agregada, explicación, sugerencia y gravedad. Las sugerencias de LLM son hipótesis y requieren verificación humana.

Para publicar se necesitan `--publish⟧, `enablePublishing: true⟧ y `ALLOW_GITHUB_COMMENTS=true⟧, además de permiso de escritura. Se bloquean forks, informes incompletos y mocks. Los identificadores estables ayudan a evitar duplicados. La aprobación y el merge son decisiones humanas.

## Seguridad

El revisor no ejecuta código de PR ni utiliza `pull_request_target⟧. CI no recibe claves de IA ni publica comentarios. Las limitaciones de protección ante prompt injection y fuga de datos se describen en [SECURITY.md](docs/SECURITY.md).

## Pruebas y GitHub Actions

`npm run lint⟧, `npm run format:check⟧, `npm run typecheck⟧, `npm test⟧, `npm run test:integration⟧, `npm run evaluate⟧ y `npm run build⟧. [CI](.github/workflows/ci.yml) utiliza runners alojados por GitHub. [Manual read-only review](.github/workflows/demo.yml) nunca genera cargos ni publica resultados.

## Evaluación

La suite contiene **27 casos sintéticos**: 18 con marcadores, siete cambios correctos y dos textos de prompt injection. Precisión, recall, falsos positivos, duplicados, localización, tokens y costos miden exclusivamente el **mock**, no un modelo real.

## Demostración

Vea [DEMO.md](docs/DEMO.md). El ejemplo de aritmética contiene errores sintéticos deliberados; el ejemplo limpio no genera observaciones. No se afirma disponer de capturas o pruebas externas no realizadas.

## Limitaciones conocidas

Sin análisis semántico completo, ejecución de código, garantía de detección de vulnerabilidades, rendimiento real del LLM probado ni publicación en vivo validada. Diffs grandes, binarios o incompletos reducen cobertura. Los costos son estimados y la revisión humana sigue siendo imprescindible.

## Licencia

[MIT](LICENSE), © 2026 Ramon Rodriguez. Conservar avisos de terceros.
