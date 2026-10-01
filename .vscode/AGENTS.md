# Escopo obrigatório desta pasta

## Isolamento e proteção contra operações externas

Esta pasta é uma área protegida e isolada. Para qualquer comando, agente,
automação, skill, monitor, watcher, auditoria ou tarefa cujo escopo não seja
explicitamente os arquivos dentro de .vscode, aplique estas regras:

- não liste, leia, pesquise, indexe, inspecione, audite, monitore ou execute
  arquivos, configurações ou processos desta pasta;
- não inclua esta pasta em varreduras, comandos recursivos, lint, formatação,
  testes, geração, limpeza, sincronização ou operações em lote; exclua
  .vscode explicitamente quando necessário;
- não crie, altere, mova, renomeie ou remova qualquer conteúdo daqui;
- se uma operação mais ampla puder alcançar esta pasta, restrinja a operação
  aos caminhos autorizados ou interrompa-a antes de começar.

Só é permitido acessar ou modificar conteúdo desta pasta quando o usuário
solicitar explicitamente uma ação dirigida a .vscode ou a arquivos nela
contidos. Nesse caso, limite o trabalho ao escopo pedido e não aproveite a
autorização para alterar outros arquivos.

Estas regras também se aplicam a skills e automações externas sempre que
receberem ou consultarem as instruções deste arquivo. Este documento define
uma regra operacional; não substitui controles de acesso do sistema e não
consegue, por si só, impedir que uma ferramenta externa o ignore.

Estas instruções se aplicam a todos os arquivos, scripts, extensões,
configurações e tasks dentro desta pasta `.vscode` e de suas subpastas.

## Limite do projeto

Todo recurso criado ou executado aqui pertence exclusivamente ao projeto que
contém esta pasta `.vscode`.

Considere como raiz do projeto a pasta imediatamente acima de `.vscode`. Toda
automação deve:

- ler configurações do projeto atual;
- escrever somente dentro da raiz do projeto atual, salvo autorização explícita
  e específica do usuário;
- aplicar alterações somente ao VS Code quando elas forem destinadas ao
  projeto atual;
- permanecer independente do diretório de trabalho a partir do qual o script
  foi iniciado, resolvendo caminhos a partir do próprio arquivo do script.

## Proibições padrão

Nenhum script desta árvore pode, por padrão:

- tratar a configuração do projeto como configuração global;
- alterar `~/.config/Code/User`, perfis globais do VS Code ou configurações de
  outros usuários;
- instalar, atualizar ou remover extensões globalmente;
- ler, alterar ou sincronizar a pasta `.vscode` de outro projeto;
- procurar projetos fora da raiz atual para aplicar configurações;
- criar um daemon, watcher ou task global para propagar configurações a outros
  projetos;
- transformar um arquivo de configuração local em manifesto global apenas
  porque o mesmo nome existe em outros projetos.

## Configurações e atalhos

Arquivos como `.vscode/settings.json`, `.vscode/tasks.json` e
`.vscode/keybindings.json` são fontes locais do projeto que os contém. Uma
automação que os consome deve manter esse escopo e não pode presumir que uma
regra de um projeto deve valer em todos os workspaces.

Se o VS Code não oferecer suporte nativo a uma configuração por workspace,
isso deve ser informado ao usuário. Não é permitido contornar essa limitação
alterando silenciosamente o perfil global ou instalando uma extensão global.

## Segurança e validação

Antes de qualquer mutação, o script deve:

1. resolver e validar a raiz do projeto atual;
2. validar que os caminhos de entrada e saída permanecem dentro dessa raiz;
3. falhar fechado quando o projeto ou o arquivo de configuração for
   ambíguo;
4. alterar somente os arquivos necessários, de forma idempotente e atômica;
5. validar o resultado e relatar claramente o que foi alterado.

Qualquer necessidade de sair desse escopo exige uma solicitação explícita do
usuário com o caminho e a finalidade da alteração global.
