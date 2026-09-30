[中文版 →](../../../zh/lectures/lecture-01-why-capable-agents-still-fail/)

> Exemplos de código: [code/](https://github.com/walkinglabs/learn-harness-engineering/blob/main/docs/pt-BR/lectures/lecture-01-why-capable-agents-still-fail/code/)
> Projeto prático: [Projeto 01. Apenas Prompt vs. Regras Primeiro: Quanta Diferença um Harness Faz](./../../projects/project-01-baseline-vs-minimal-harness/index.md)

# Aula 01. Modelos Fortes Não Significam Execução Confiável

Claude Sonnet 4.5 · 2025-09-29 · SWE-bench Verified

| Score | Tasks | Trials | Scaffold |
| --- | --- | --- | --- |
| 77.2% | 500 | 10 | bash + string replacement |

Resultados de produção não isolam uma causa. Pontuações valem para o modelo, scaffold, dados e condições de avaliação indicados, não toda tarefa real. [Anthropic: methodology](https://www.anthropic.com/news/claude-sonnet-4-5)

Quando isso acontece, a primeira reação da maioria das pessoas é: “o modelo não é bom o suficiente — vou tentar um mais caro”. Antes de abrir a carteira, considere que talvez o problema não seja o modelo.

## Mesmo Cavalo, Destinos Diferentes

> Mesmo modelo e prompt, mas diferentes orçamentos de tempo e custo. Não é um experimento de orçamento igual isolando um componente. A jogabilidade essencial funcionou, mas havia defeitos. [Anthropic](https://www.anthropic.com/engineering/harness-design-long-running-apps)

Mesmo modelo e prompt, mas diferentes orçamentos de tempo e custo. Não é um experimento de orçamento igual isolando um componente. A jogabilidade essencial funcionou, mas havia defeitos. [Anthropic](https://www.anthropic.com/engineering/harness-design-long-running-apps)

| Opus 4.5 | Duration | USD |
| --- | --- | --- |
| Solo | 20 min | 9 |
| Full harness | 6 h | 200 |

Eles não mudaram o modelo. Opus 4.5 continuava sendo Opus 4.5. O que mudou foi o equipamento.

Resultados de produção não isolam uma causa. Pontuações valem para o modelo, scaffold, dados e condições de avaliação indicados, não toda tarefa real. [OpenAI: 2026-02-11](https://openai.com/index/harness-engineering/)

## Onde os Agentes Realmente Falham

Os modos de falha específicos se resumem basicamente a alguns pontos:

- **Requisitos vagos — o agente só consegue adivinhar.** “Adicione uma funcionalidade de busca” — essa frase significa quase nada. Buscar o quê? Texto completo ou consultas estruturadas? Os resultados devem ser paginados? Destacados? Você não especificou, então o agente precisa adivinhar. Acertar é sorte; errar significa retrabalho que custa muito mais do que teria custado ser específico desde o início.
- **Convenções implícitas não documentadas — o agente não tem como seguir.** Todo o seu time usa a nova sintaxe do SQLAlchemy 2.0, mas o agente gera código 1.x por padrão. Todos os endpoints da API devem utilizar OAuth 2.0, mas essa regra existe apenas na sua cabeça e em uma mensagem no Slack de três meses atrás. O agente não faz ideia disso — não é que ele não queira seguir a regra, ele literalmente nunca a viu.
- **Configuração de ambiente incompleta — o agente desperdiça energia corrigindo o ambiente.** Setup de desenvolvimento incompleto, dependências ausentes, versões erradas de ferramentas — o agente gasta contexto precioso lidando com erros de `pip install` e conflitos de versão do Node em vez de fazer o trabalho real.
- **Ausência de métodos de verificação — o agente considera concluído quando acha que terminou.** Sem testes, sem lint ou comandos de verificação nunca comunicados ao agente. O agente escreve o código, revisa superficialmente, acha que está tudo certo e declara conclusão. A Anthropic também observou um fenômeno interessante: quando os agentes percebem que o contexto está acabando, eles aceleram para terminar, pulam etapas de verificação e escolhem soluções simples em vez das melhores soluções. Eles chamam isso de “ansiedade de contexto”.
- **Perda de estado entre sessões — toda nova sessão começa do zero.** — Registre progresso e verificações em arquivos versionados para a próxima sessão inspecionar o estado. A fonte explica o mecanismo sem quantificar redução no tempo de início. [Anthropic](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

## Terminologia Essencial

Com os cenários acima em mente, estes conceitos deixam de ser apenas jargões:

- Resultados de produção não isolam uma causa. Pontuações valem para o modelo, scaffold, dados e condições de avaliação indicados, não toda tarefa real.
- **Harness**: Tudo que está fora do modelo — instruções, ferramentas, ambiente, gerenciamento de estado e feedback de verificação. Se não são os pesos do modelo, então é harness. O que chamamos anteriormente de “equipamento”.
- **Harness-Induced Failure**: O modelo possui capacidade suficiente, mas o ambiente de execução possui defeitos estruturais. O experimento controlado da Anthropic já demonstrou isso.
- **Verification Gap**: A diferença entre a confiança do agente em sua resposta e a correção real. O agente diz “terminei” quando ainda não terminou — esse é o modo de falha mais comum.
- **Diagnostic Loop**: Executar, observar a falha, atribuir a uma camada específica do harness, corrigir essa camada e executar novamente. Essa é a metodologia central da harness engineering.
- **Definition of Done**: Um conjunto de condições verificáveis por comando — testes passando, lint limpo, type checks aprovados. Sem uma definição explícita de conclusão, o agente inventará a própria definição.

## Quando Algo Falhar, Corrija o Harness Primeiro

Existe apenas um princípio central: **quando algo falhar, não troque o modelo primeiro — verifique o harness.** Se o mesmo modelo consegue resolver tarefas semelhantes e bem estruturadas, assuma que o problema está no harness.

Como isso funciona na prática? Atribua cada falha a uma camada específica. Não diga apenas “o modelo não é bom o suficiente”. Pergunte-se: a tarefa estava clara? O contexto era suficiente? Existiam métodos de verificação? Mapeie cada falha para uma das cinco camadas de defesa — especificação da tarefa, fornecimento de contexto, ambiente de execução, feedback de verificação e gerenciamento de estado. Desenvolva esse hábito e você verá “o modelo não é bom o suficiente” aparecer cada vez menos nos seus logs.

Depois, escreva uma Definition of Done explícita para cada tarefa. Não diga apenas “adicione uma busca”. Seja específico:

```txt
Critérios de conclusão:
- Novo endpoint GET /api/search?q=xxx
- Suporte à paginação, 20 itens por padrão
- Resultados incluem trechos destacados
- Todo novo código passa no pytest
- Verificação de tipos aprovada (mypy --strict)
```
Adicione um arquivo `AGENTS.md` na raiz do repositório informando ao agente a stack do projeto, convenções arquiteturais e comandos de verificação. Esse é o primeiro passo da harness engineering — e também o de maior retorno sobre investimento. Um único `AGENTS.md` pode ser mais eficiente do que migrar para um modelo mais caro — e isso não é exagero.

A partir daí, construa um loop de diagnóstico. Não trate falhas como “o modelo sendo burro novamente”. Trate-as como sinais de que o seu harness expôs um defeito. A cada falha, identifique a camada, corrija-a e evite falhar da mesma forma novamente. Após algumas iterações, o harness fica mais forte e o desempenho do agente se estabiliza. Um log simples já basta — para cada tarefa, registre se ela teve sucesso ou falhou e qual camada causou a falha. Depois de algumas rodadas, ficará claro qual camada é o gargalo, permitindo concentrar energia nela.

## O Experimento do Milhão de Linhas

Resultados de produção não isolam uma causa. Pontuações valem para o modelo, scaffold, dados e condições de avaliação indicados, não toda tarefa real. [OpenAI: 2026-02-11](https://openai.com/index/harness-engineering/)

O progresso inicial foi surpreendentemente lento. O Codex não era ruim — apenas não possuía ferramentas e estruturas suficientes para avançar em direção a objetivos de alto nível. Aos poucos, os engenheiros descobriram um padrão: quebrar grandes objetivos em pequenos blocos — design, código, revisão, testes — deixar o agente montar esses blocos individualmente e depois combiná-los em tarefas mais complexas. Sempre que algo dava errado, o problema quase nunca era “não estamos tentando o suficiente”. A pergunta correta era sempre: “o que o agente ainda não possui, e essa capacidade pode ser fornecida de maneira compreensível e executável?”

Resultados de produção não isolam uma causa. Pontuações valem para o modelo, scaffold, dados e condições de avaliação indicados, não toda tarefa real.

> Fonte: [OpenAI: Engenharia de aproveitamento: alavancando o Codex em um mundo centrado em agentes.](https://openai.com/index/harness-engineering/)

## Exemplo didático

> Ilustração didática: o cenário e seus números são hipóteses explicativas, não medições de um experimento publicado.

Um time utilizou Claude Sonnet para adicionar novos endpoints de API em uma aplicação web Python de médio porte (FastAPI + PostgreSQL + Redis, ~15 mil linhas de código).

Inicialmente, forneceram apenas uma frase: “adicione endpoints de preferências do usuário em `/api/v2/users`”. O resultado? O agente gastou 40% da janela de contexto explorando a estrutura do repositório, gerou código aparentemente razoável, mas sem seguir os padrões de tratamento de erros do projeto, utilizou sintaxe antiga do SQLAlchemy e declarou conclusão enquanto os endpoints ainda apresentavam erros em runtime. A sessão seguinte precisou refazer todo o trabalho de descoberta.

Depois, adicionaram um `AGENTS.md` (descrevendo arquitetura do projeto e versões da stack), comandos explícitos de verificação (`pytest tests/api/v2/ && python -m mypy src/`) e registros de decisões arquiteturais. O mesmo modelo passou a ter sucesso em todas as três execuções independentes, com aproximadamente 60% mais eficiência de contexto.

Eles não mudaram o modelo. Mudaram o harness.

## Principais Conclusões

- Capacidade do modelo e confiabilidade de execução são coisas diferentes. Até um cavalo puro-sangue precisa de um bom equipamento.
- Quando algo falhar, verifique o harness antes do modelo. Trocar de modelo é a opção mais cara — e frequentemente o problema nem está no modelo.
- Toda falha é um sinal: seu harness possui um defeito estrutural. Descubra qual é e corrija.
- Não diga apenas “o modelo não é bom o suficiente”. Trabalhe sistematicamente pelas cinco camadas: tarefa mal definida, contexto insuficiente, ambiente mal configurado, ausência de verificação ou perda de estado entre sessões. Em nove de cada dez casos, o problema está em uma dessas camadas.
- Um único arquivo `AGENTS.md` pode ser mais eficiente do que migrar para um modelo mais caro.

## Leituras Complementares

- [OpenAI: Harness Engineering — Leveraging Codex in an Agent-First World](https://openai.com/index/harness-engineering/)
- [Anthropic: Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [HumanLayer: Skill Issue — Harness Engineering for Coding Agents](https://www.humanlayer.dev/blog/skill-issue-harness-engineering-for-coding-agents)
- [SWE-bench Leaderboard](https://www.swebench.com/)
- [Thoughtworks Technology Radar: Harness Engineering](https://www.thoughtworks.com/radar)

- [Anthropic: Sonnet 4.5 SWE-bench methodology, 2025-09-29](https://www.anthropic.com/news/claude-sonnet-4-5)

## Exercícios

1. **Experimento de comparação**: Escolha uma base de código que você conhece bem e uma tarefa de modificação não trivial. Primeiro, execute o agente sem suporte de harness e registre as falhas. Depois, adicione um `AGENTS.md` e comandos explícitos de verificação, execute novamente com o mesmo agente e compare os resultados, atribuindo cada falha a uma das cinco camadas de defesa.

2. **Medição do verification gap**: Escolha 5 tarefas de programação. Após cada tarefa, registre se o agente afirma ter concluído o trabalho e depois valide a correção real com testes independentes. Calcule a proporção de vezes em que o agente afirma ter terminado quando na verdade ainda não terminou — esse é o seu verification gap. Depois reflita: quais comandos de verificação poderiam reduzir essa proporção?

3. **Prática de diagnostic loope**: Encontre uma tarefa na qual o agente falha repetidamente no seu projeto. Execute uma vez e registre a falha. Atribua-a a uma das cinco camadas. Corrija essa camada. Execute novamente. Repita de três a cinco rodadas registrando as melhorias a cada tentativa.
