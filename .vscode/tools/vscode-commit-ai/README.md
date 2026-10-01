# Grijó Commit AI

Extensão local do VS Code que lê as alterações não commitadas, chama uma API compatível com
OpenAI Chat Completions e coloca a mensagem retornada no campo de commit do
Git. O commit continua manual. No endpoint oficial da DeepSeek, o modo de
thinking é desativado automaticamente para evitar que o limite curto de uma
mensagem de commit seja consumido pelo raciocínio antes do texto final.

## Configuração

Use o arquivo `.env.example` como modelo. O arquivo local com as
credenciais fica em `.vscode/tools/vscode-commit-ai/.env`, ao lado da extensão;
essa pasta é ignorada pelo Git. A extensão e o gerador usam esse caminho por
padrão.

Exemplo de configuração local:

```env
AI_SUGGESTION_COMMIT_BASE_URL=https://api.deepseek.com
AI_SUGGESTION_COMMIT_API_KEY=sua-chave
AI_SUGGESTION_COMMIT_DEFAULT_MODEL=deepseek-v4-pro
```

Para o endpoint de compatibilidade do Gemini, altere apenas a base e o modelo:

```env
AI_SUGGESTION_COMMIT_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
AI_SUGGESTION_COMMIT_API_KEY=sua-chave
AI_SUGGESTION_COMMIT_DEFAULT_MODEL=gemini-3.7-flash
```

O gerador acrescenta `/chat/completions` à base quando necessário. O `.env`
real não deve ser commitado. Para usar outro caminho dentro do repositório,
configure `grijo.commitAi.envFile` no VS Code ou passe `--env-file` ao gerador.

A análise inclui alterações staged e não staged de arquivos rastreados, além dos
arquivos novos exibidos em **Changes**. Arquivos ignorados pelo Git continuam
fora da análise, e arquivos de ambiente não podem ser enviados ao provedor.

Quando o patch completo ultrapassa o limite configurado, o gerador envia um
resumo estatístico do Git para manter a geração possível sem estourar o buffer
ou o contexto da API.

## Uso

Depois de instalar a extensão, use uma destas opções enquanto houver alterações no repositório:

- botão **Grijó: Gerar mensagem de commit** na visão Source Control;
- Command Palette → **Grijó: Gerar mensagem de commit**;
- atalho `Ctrl+Alt+M`.

A extensão chama `.vscode/tools/vscode-commit-ai/generate-commit-message.mjs`, preenche o campo Git e
deixa o botão **Commit** para sua confirmação.

## Instalação no Linux

### Pré-requisitos

- VS Code instalado, com `code` disponível no `PATH`;
- Node.js 18+ somente se o VSIX precisar ser gerado novamente;
- o arquivo `grijo-commit-ai-0.1.4.vsix` ou o `pnpm` disponível para empacotá-lo.

### Instalação rápida

Na raiz do repositório, execute:

```bash
cd .vscode/tools/vscode-commit-ai
bash ./install.sh
```

O instalador lê `package.json`, monta o nome do VSIX a partir de `name` e
`version`, usa o pacote localizado nesta mesma pasta e executa a instalação
com `--force`. Se o VSIX não existir, ele executa `pnpm dlx @vscode/vsce
package` antes de instalar.

### Bootstrap automático de pré-requisitos e extensões

O workspace possui uma tarefa automática chamada Grijó: verificar
pré-requisitos. Ela lê .vscode/bootstrap.json ao abrir a pasta e verifica cada
item antes de executar seu installer. Atualmente ela verifica Python 3, a
extensão Commit AI e os dois temas configurados em settings.json.

O bootstrap suporta vscode-extension, path e command. Um installer pode ser
definido como um caminho relativo à raiz do workspace. No Linux, são aceitos
installers Bash e Node.js.

As extensões de tema também estão listadas em `.vscode/extensions.json` como
recomendações do workspace. O bootstrap faz a instalação automaticamente
quando elas não estão presentes.

A configuração task.allowAutomaticTasks está habilitada neste workspace. O VS
Code ainda exige um workspace confiável para executar tarefas automáticas.

### Opções

Simule o bootstrap sem instalar:

```bash
node .vscode/tools/bootstrap/ensure-prerequisites.mjs --what-if
```

Exija que o VSIX já exista:

```bash
bash .vscode/tools/vscode-commit-ai/install.sh --skip-package
```

O VS Code registra a extensão no diretório de extensões do usuário. A pasta
`.vscode/tools/vscode-commit-ai` permanece como origem do código e do VSIX; ela
não precisa ser adicionada ao `--extensions-dir` para a extensão
funcionar na instalação padrão do VS Code.

## Instalação manual pelo VSIX

Na raiz do repositório:

```bash
cd .vscode/tools/vscode-commit-ai
pnpm dlx @vscode/vsce package
code --install-extension grijo-commit-ai-0.1.4.vsix --force
```

Também é possível usar **Extensions: Install from VSIX…** no VS Code e
selecionar o arquivo `.vsix` gerado.

## Validação do gerador

O script não precisa de dependências externas além do Node.js 18+:

```bash
node --test __tests__/generate-commit-message.test.mjs
```
