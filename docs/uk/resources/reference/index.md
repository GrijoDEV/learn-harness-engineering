# Довідник

Ці нотатки пояснюють, як використовувати шаблони як повноцінний harness, а не
просто набір розрізнених файлів.

## Внутрішні довідкові нотатки

- [`method-map.md`](./method-map.md): відображення поширених режимів збою при
  тривалій роботі на артефакт або політику, що усуває їх у першу чергу
- [`initializer-agent-playbook.md`](./initializer-agent-playbook.md): що
  ініціалізатор повинен залишити після себе до початку роботи над функціями
- [`coding-agent-startup-flow.md`](./coding-agent-startup-flow.md): фіксований
  процес запуску сесії для подальших сесій кодування
- [`prompt-calibration.md`](./prompt-calibration.md): як підтримувати кореневі
  інструкції чіткими без перевантаження та крихкості

## Основні статті

Цей список навмисно вузький. Harness означає систему виконання навколо моделі:
цикл агента, виконання інструментів, ізоляцію, стан, контекст, верифікацію,
завершення, оркестрацію та спостережуваність. Загальні статті про prompt-інженерію
або широкі фреймворки агентів до основного списку не включаються.

Три оригінальні статті залишаються основою курсу:

- [OpenAI: Harness engineering: leveraging Codex in an agent-first world](https://openai.com/index/harness-engineering/) (2026-02-11): репозиторії з пріоритетом агентів, локальний контекст репозиторію, власний лінтинг та структурні запобіжники.
- [Anthropic: Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) (2025-11-26): агент-ініціалізатор, агент кодування, список функцій, журнал прогресу та передача між контекстними вікнами.
- [Anthropic: Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps) (2026-03-24): ролі планувальника / генератора / оцінювача, скидання контексту, спрощення harness та застарілі припущення.

Додано лише кілька вкрай актуальних статей 2026 року:

- [OpenAI: Unrolling the Codex agent loop](https://openai.com/index/unrolling-the-codex-agent-loop/) (2026-01-23): harness runtime Codex, виклики інструментів, зростання контексту та завершення циклу.
- [Anthropic: Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) (2026-01-09): спільна оцінка моделі та harness, розмежування harness оцінювання та harness агента.
- [LangChain: Improving Deep Agents with harness engineering](https://www.langchain.com/blog/improving-deep-agents-with-harness-engineering) (2026-02-17): фіксація моделі при покращенні системних підказок, інструментів, middleware, трасування та самоверифікації для переміщення агента кодування з Топ-30 у Топ-5 на Terminal Bench 2.0.
- [Thoughtworks / Martin Fowler: Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html) (2026-04-02): harness для користувачів агентів кодування як випереджувальні напрямники та зворотні датчики, з детермінованими та інференційними засобами управління.
- [Cursor: Continually improving our agent harness](https://cursor.com/blog/continually-improving-agent-harness) (2026-04-30): harness як безперервно вдосконалюваний продукт з офлайн-оцінками, онлайн-метриками, таксономією помилок інструментів, налаштуванням під конкретні моделі та перемиканням моделей під час чату.

## Розширені посилання 2026 року

Це не основні джерела курсу, але вони корисні при проектуванні конкретних модулів
harness. Цей розділ містить лише джерела, тіло яких безпосередньо охоплює цикл
агента, виконання інструментів, управління контекстом, верифікацію, ізоляцію,
рівні управління або регресійне управління. Суто агентні продукти, оголошення
платформ, кейси команд та тести продуктивності виключаються.

- [OpenAI: Unlocking the Codex harness: how we built the App Server](https://openai.com/index/unlocking-the-codex-harness/) (2026-02-04): harness як протокол App Server для повторного використання з lifecycle потоку, відновленням, форком, дифами та клієнтськими інтеграціями.
- [OpenAI Developers: Run long horizon tasks with Codex](https://developers.openai.com/blog/run-long-horizon-tasks-with-codex) (2026-02-23): довгострокова пам'ять проекту, валідація проміжних результатів та приклади умов завершення для тривалих задач.
- [OpenAI: The next evolution of the Agents SDK](https://openai.com/index/the-next-evolution-of-the-agents-sdk/) (2026-04-15): нативні для моделі harness, виконання в пісочниці та виконання файлів/команд.
- [OpenAI: An open-source spec for Codex orchestration: Symphony](https://openai.com/index/open-source-codex-orchestration-symphony/) (2026-04-27): перетворення трекера задач або дошки Linear на площину управління мультиагентами.
- [Anthropic: Building a C compiler with a team of parallel Claudes](https://www.anthropic.com/engineering/building-c-compiler) (2026-02-05): паралельні команди агентів, блокування задач, синхронізація git, ізоляція контейнерів та автономні цикли.
- [Anthropic: Scaling Managed Agents: Decoupling the brain from the hands](https://www.anthropic.com/engineering/managed-agents) (2026-04-08): погляд на мета-harness, що розділяє сесію, harness та пісочницю як замінні інтерфейси.
- [Anthropic: An update on recent Claude Code quality reports](https://www.anthropic.com/engineering/april-23-postmortem) (2026-04-23): зусилля на міркування, скорочення контексту та системні підказки як зміни harness, що потребують регресійного управління.
- [LangChain: Context Management for Deep Agents](https://www.langchain.com/blog/context-management-for-deepagents) (2026-01-28): вивантаження у файлову систему, скорочення викликів інструментів, резюмування та цільові оцінки для harness управління контекстом.
- [LangChain: Tuning Deep Agents to Work Well with Different Models](https://www.langchain.com/blog/tuning-deep-agents-different-models) (2026-04-29): профілі harness для конкретних моделей щодо підказок, назв інструментів, middleware та конфігурації підагентів.
- [LangChain: Continual learning for AI agents](https://www.langchain.com/blog/continual-learning-for-ai-agents) (2026-04-05): розподіл вдосконалення агента на рівні моделі, harness та контексту на основі трасувань.
- [Microsoft: Agent Harness in Agent Framework](https://devblogs.microsoft.com/agent-framework/agent-harness-in-agent-framework/) (2026-03-12): harness оболонки/файлової системи, процес затвердження, виконання оболонки на хості та ущільнення контексту.
- [Google: Announcing ADK for Java 1.0.0](https://developers.googleblog.com/announcing-adk-for-java-100-building-the-future-of-ai-agents-in-java/) (2026-03-30): плагіни, ущільнення подій, HITL, сервіси сесій/пам'яті та A2A як примітиви harness для повторного використання.
- [GitHub: Automate repository tasks with GitHub Agentic Workflows](https://github.blog/ai-and-ml/automate-repository-tasks-with-github-agentic-workflows/) (2026-02-13): GitHub Actions як виконавець агентних робочих процесів із захищеними виводами, ізоляцією, дозволами та перевіркою.
- [AWS: AI agents in enterprises: Best practices with Amazon Bedrock AgentCore](https://aws.amazon.com/blogs/machine-learning/ai-agents-in-enterprises-best-practices-with-amazon-bedrock-agentcore/) (2026-02-03): enterprise-рівні harness для Runtime, Memory, Gateway, Identity/Policy, Observability та Evaluations.
- [Stripe: Minions: Stripe's one-shot, end-to-end coding agents](https://stripe.dev/blog/minions-stripes-one-shot-end-to-end-coding-agents) (2026-02-09) та [Частина 2](https://stripe.dev/blog/minions-stripes-one-shot-end-to-end-coding-agents-part-2) (2026-02-19): ізоляція devbox, власні harness агентів, машини станів blueprint, файли правил, підбір інструментів MCP, засоби безпеки та цикли зворотного зв'язку pre-push/CI.
- [Cognition: What We Learned Building Cloud Agents](https://cognition.ai/blog/what-we-learned-building-cloud-agents) (2026-04-23): ізоляція ВМ, знімок/відновлення сесії, оркестрація, управління, журналювання аудиту та інтеграції для runtime хмарних агентів.
- [Cognition: Multi-Agents: What's Actually Working](https://cognition.ai/blog/multi-agents-working) (2026-04-22): цикли генератор-верифікатор, рецензенти з чистим контекстом, маршрутизація розумного помічника, координація менеджер-дочірній агент та межі міжагентної комунікації.
- [Replit: Decision-Time Guidance: Keeping Replit Agent Reliable](https://blog.replit.com/decision-time-guidance) (2026-01-20, оновлено 2026-01-23): легкий класифікатор вставляє коротку ситуативну настанову в момент прийняття рішення замість завантаження всіх правил у системну підказку.
- [Vercel: How we made v0 an effective coding agent](https://vercel.com/blog/how-we-made-v0-an-effective-coding-agent) (2026-01-07): динамічні системні підказки, шар потокового переписування та детерміновані/керовані моделлю автовиправники.
- [Vercel: Introducing deepsec](https://vercel.com/blog/introducing-deepsec-find-and-fix-vulnerabilities-in-your-code-base) (2026-05-04): harness агента кодування з акцентом на безпеці зі кроками сканування, дослідження, повторної валідації, збагачення, експорту, плагінів та перевірки відмов.
- [Sourcegraph: CodeScaleBench](https://sourcegraph.com/blog/codescalebench-testing-coding-agents-on-large-codebases-and-multi-repo-software-engineering-tasks) (2026-03-03): довідник harness оцінювання/інструментарію, що охоплює прийняття інструментів MCP, транскрипти використання інструментів, контроль якості тестів, верифікаційні/відтворювані шлюзи та ітерації підказок/преамбул.

Суто загальні посилання лише 2025 року виключені з основного списку. Оригінальна
стаття Anthropic про harness 2025 року залишається, оскільки є базовим джерелом
курсу.

- [ETH Zurich: Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?](https://www.sri.inf.ethz.ch/publications/gloaguen2026agentsmd): Дослідження файлів контексту: успішність, вартість інференсу та мінімальні вимоги. Див. анотацію і висновки.

- [On the Impact of AGENTS.md Files on the Efficiency of AI Coding Agents](https://arxiv.org/html/2601.20404v2): gpt-5.2-codex; 10 repos / 124 PR tasks; Table 1.

## Рекомендований порядок читання

1. `method-map.md`
2. `initializer-agent-playbook.md`
3. `coding-agent-startup-flow.md`
4. `prompt-calibration.md`
5. OpenAI Harness engineering
6. Anthropic Effective harnesses
7. Anthropic Harness design for long-running application development
8. OpenAI Codex agent loop
9. Anthropic agent evals
10. LangChain Improving Deep Agents
11. Thoughtworks / Martin Fowler Harness engineering for coding agent users
12. Cursor Continually improving our agent harness
