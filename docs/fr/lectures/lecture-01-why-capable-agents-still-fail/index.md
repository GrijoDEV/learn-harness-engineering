[中文版本 →](../../../zh/lectures/lecture-01-why-capable-agents-still-fail/)

> Exemples de code : [code/](https://github.com/walkinglabs/learn-harness-engineering/blob/main/docs/fr/lectures/lecture-01-why-capable-agents-still-fail/code/)
> Projet pratique : [Projet 01. Prompt seul vs règles d'abord](./../../projects/project-01-baseline-vs-minimal-harness/index.md)

# Leçon 01. Les modèles forts ne garantissent pas une exécution fiable

Vous pensez connaître le monde de l'IA : abonnement Claude Pro, clé API GPT-4o, chiffres du leaderboard SWE-bench en tête. Un jour, vous confiez enfin un vrai projet à un agent IA, plein de confiance. Résultat ? Il ajoute une fonctionnalité mais casse les tests, corrige un bug mais en introduit deux autres, tourne pendant 20 minutes et annonce fièrement « terminé » — puis vous regardez le code, et ce n'est pas du tout ce que vous aviez demandé.

Votre premier réflexe pourrait être : « ce modèle n'est pas assez bon, il faut passer au niveau supérieur ». Attendez. Avant de sortir la carte bancaire, envisagez que le problème ne soit peut-être pas le modèle.

Claude Sonnet 4.5 · 2025-09-29 · SWE-bench Verified

| Score | Tasks | Trials | Scaffold |
| --- | --- | --- | --- |
| 77.2% | 500 | 10 | bash + string replacement |

Les résultats de production n’isolent pas une cause. Les scores s’appliquent au modèle, scaffold, jeu de données et protocole indiqués, pas à toutes les tâches réelles. [Anthropic: methodology](https://www.anthropic.com/news/claude-sonnet-4-5)

Derrière ces chiffres se cache pourtant une vérité contre-intuitive.

## Même cheval, destins différents

> Même modèle et même prompt, mais budgets de temps et de coût différents. Ce n’est pas une expérience à budget égal isolant un composant. Le jeu fonctionnait au niveau essentiel, avec des défauts persistants. [Anthropic](https://www.anthropic.com/engineering/harness-design-long-running-apps)

Même modèle et même prompt, mais budgets de temps et de coût différents. Ce n’est pas une expérience à budget égal isolant un composant. Le jeu fonctionnait au niveau essentiel, avec des défauts persistants. [Anthropic](https://www.anthropic.com/engineering/harness-design-long-running-apps)

| Opus 4.5 | Duration | USD |
| --- | --- | --- |
| Solo | 20 min | 9 |
| Full harness | 6 h | 200 |

Ils n'ont pas changé de modèle. Opus 4.5 restait Opus 4.5. Ce qui a changé, c'est le harnachement.

L'article d'OpenAI sur le harness engineering le formule simplement : Codex dans un dépôt bien harnessed passe de « peu fiable » à « fiable ». Pas « un peu mieux », mais un changement qualitatif. Comme un pur-sang : vous pouvez le monter sans harnachement adapté, mais vous n'irez ni loin ni vite, et tomber n'a rien d'étonnant. Le harness est cet ensemble de harnachement : **tout ce qui, dans l'infrastructure d'ingénierie, se trouve hors des poids du modèle.**

## Où les agents se bloquent vraiment

Qu'est-ce qui se passe concrètement ?

Le plus courant : la tâche n'a jamais été définie clairement. Vous dites « ajoute une recherche », et l'agent comprend autre chose que vous — rechercher quoi ? Plein texte ou structuré ? Pagination ? Surlignage ? Sans précision, l'agent devine. Une bonne supposition est de la chance ; une mauvaise coûte plus cher à corriger que la précision initiale. C'est comme entrer au restaurant et dire au chef « je veux du poisson » : braisé, vapeur ou en fondue, tout dépend du hasard.

Même lorsque la tâche est claire, le projet a des conventions implicites que l'agent ignore. Votre équipe utilise SQLAlchemy 2.0, mais l'agent écrit du 1.x par défaut. Tous les endpoints doivent utiliser OAuth 2.0, mais cette règle n'existe que dans votre tête et un message Slack vieux de trois mois. L'agent ne peut pas la voir. Il ne refuse pas d'obéir ; il ne sait littéralement pas que la règle existe.

L'environnement est aussi un piège. Environnement dev incomplet, dépendances manquantes, versions d'outils incorrectes. L'agent brûle du contexte sur des échecs `pip install` et des versions Node incohérentes au lieu de résoudre la vraie tâche. C'est comme embaucher un excellent menuisier sans lui donner marteau, clous ni établi stable.

Plus fréquent encore : il n'y a aucun moyen de vérifier. Pas de tests, pas de lint, ou les commandes de vérification ne sont jamais communiquées. L'agent écrit du code, le regarde, décide que ça va et dit « terminé ». Comme un élève qui rend un devoir sans corrigé : il pense avoir bon, mais la correction révèle une pile d'erreurs. Anthropic a aussi observé que les agents, lorsqu'ils sentent le contexte se remplir, se dépêchent de finir, sautent la vérification et choisissent une solution simple plutôt qu'optimale. Ils appellent cela « context anxiety ».

Les tâches longues sur plusieurs sessions sont encore pires : les découvertes de la session précédente se perdent, et chaque nouvelle session doit réexplorer le projet. Sans état persistant, le taux d'échec grimpe fortement sur les tâches dépassant 30 minutes.

## Concepts clés

- Les résultats de production n’isolent pas une cause. Les scores s’appliquent au modèle, scaffold, jeu de données et protocole indiqués, pas à toutes les tâches réelles.
- **Harness** : tout ce qui est hors du modèle — instructions, outils, environnement, gestion d'état, feedback de vérification. Si ce ne sont pas des poids de modèle, c'est du harness.
- **Échec induit par le harness** : le modèle a la capacité, mais l'environnement d'exécution a des défauts structurels.
- **Écart de vérification** : différence entre la confiance de l'agent et la correction réelle. L'agent dit « terminé » alors que ce n'est pas terminé.
- **Boucle de diagnostic** : exécuter, observer l'échec, l'attribuer à une couche du harness, corriger cette couche, réexécuter.
- **Definition of Done** : ensemble de conditions vérifiables par machine — tests passent, lint propre, types valides. Sans définition explicite, l'agent invente la sienne.

## Quand ça échoue, corriger le harness d'abord

Principe central : **quand ça échoue, ne changez pas d'abord de modèle — vérifiez le harness.** Si le même modèle réussit sur des tâches similaires bien structurées, supposez un problème de harness. Comme une voiture en panne : on vérifie d'abord l'essence avant d'accuser le moteur.

**Attribuer chaque échec à une couche précise.** Ne dites pas « le modèle est nul ». Demandez : la tâche était-elle floue ? Le contexte insuffisant ? La vérification absente ? Reliez chaque échec à une des cinq couches : spécification, contexte, environnement, feedback de vérification, état. Ce sont des couches de diagnostic pratiques, pas les six termes du glossaire ci-dessus.

**Écrire une Definition of Done explicite.**
```
Completion criteria:
- New endpoint GET /api/search?q=xxx
- Supports pagination, default 20 items
- Results include highlighted snippets
- All new code passes pytest
- Type checking passes (mypy --strict)
```

**Créer un fichier AGENTS.md.** Placez-le à la racine du dépôt pour décrire stack technique, conventions d'architecture et commandes de vérification. C'est la première étape du harness engineering et souvent celle avec le meilleur retour. Un `AGENTS.md` peut valoir plus qu'un modèle plus cher.

**Construire une boucle de diagnostic.** Traitez chaque échec comme un signal de défaut du harness. Identifiez la couche, corrigez-la, puis évitez que ce mode d'échec revienne.

**Quantifier les améliorations.** Tenez un journal simple : succès ou échec, couche responsable. Après quelques tours, le goulot d'étranglement devient visible.

## L'expérience du million de lignes

Les résultats de production n’isolent pas une cause. Les scores s’appliquent au modèle, scaffold, jeu de données et protocole indiqués, pas à toutes les tâches réelles. [OpenAI: 2026-02-11](https://openai.com/index/harness-engineering/)

Les résultats de production n’isolent pas une cause. Les scores s’appliquent au modèle, scaffold, jeu de données et protocole indiqués, pas à toutes les tâches réelles.

Au début, la progression était plus lente que prévu. Non pas parce que Codex était incapable, mais parce que l'environnement était incomplet : il manquait outils, abstractions et structures internes. Le travail des ingénieurs est devenu : découper de grands objectifs en petits blocs (design, code, review, test), laisser l'agent les assembler, puis utiliser ces blocs pour débloquer des tâches plus complexes. Quand quelque chose échouait, la correction était rarement « essaie plus fort », mais plutôt « quelle capacité manque à l'agent, et comment la rendre compréhensible et exécutable ? ».

Les résultats de production n’isolent pas une cause. Les scores s’appliquent au modèle, scaffold, jeu de données et protocole indiqués, pas à toutes les tâches réelles.

> Source : [OpenAI: Harness engineering: leveraging Codex in an agent-first world](https://openai.com/index/harness-engineering/)

## Exemple pédagogique

> Illustration pédagogique : le scénario et ses chiffres sont des hypothèses explicatives, pas des mesures d’une expérience publiée.

Une équipe a utilisé Claude Sonnet pour ajouter un endpoint API à une application Python moyenne (FastAPI + PostgreSQL + Redis, environ 15 000 lignes).

Au départ, elle donne une seule phrase : « ajoute les endpoints de préférences utilisateur sous `/api/v2/users` ». Résultat : l'agent consomme 40 % de son contexte à explorer le dépôt, produit un code plausible mais incompatible avec les patterns d'erreur du projet, utilise l'ancienne syntaxe SQLAlchemy et déclare terminé alors que l'endpoint échoue au runtime. La session suivante doit refaire toute la découverte.

Plus tard, l'équipe ajoute `AGENTS.md`, des commandes de vérification explicites (`pytest tests/api/v2/ && python -m mypy src/`) et des décisions d'architecture. Le même modèle réussit trois exécutions indépendantes, avec environ 60 % d'efficacité de contexte en plus.

Ils n'ont pas changé le modèle. Ils ont changé le harness.

## Points clés

- Capacité du modèle et fiabilité d'exécution sont deux choses différentes.
- Quand ça échoue, vérifiez le harness avant le modèle.
- Chaque échec est un signal : votre harness a un défaut structurel.
- Cinq couches de défense : spécification, contexte, environnement, feedback de vérification, état.
- Un seul `AGENTS.md` peut être plus efficace qu'un modèle plus cher.

## Pour aller plus loin

- [OpenAI: Harness Engineering — Leveraging Codex in an Agent-First World](https://openai.com/index/harness-engineering/)
- [Anthropic: Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [HumanLayer: Skill Issue — Harness Engineering for Coding Agents](https://www.humanlayer.dev/blog/skill-issue-harness-engineering-for-coding-agents)
- [SWE-bench Leaderboard](https://www.swebench.com/)
- [Thoughtworks Technology Radar: Harness Engineering](https://www.thoughtworks.com/radar)

- [Anthropic: Sonnet 4.5 SWE-bench methodology, 2025-09-29](https://www.anthropic.com/news/claude-sonnet-4-5)

## Exercices

1. **Expérience comparative** : choisissez un codebase connu et une tâche non triviale. Exécutez d'abord sans harness, puis avec `AGENTS.md` et commandes de vérification explicites. Comparez les échecs par couche.

2. **Mesure de l'écart de vérification** : choisissez 5 tâches. Notez si l'agent affirme avoir terminé, puis vérifiez indépendamment. Calculez la proportion de faux « terminé ».

3. **Pratique de boucle diagnostic** : trouvez une tâche où l'agent échoue souvent. Exécutez, attribuez l'échec à une couche, corrigez-la, réexécutez et mesurez l'amélioration.
