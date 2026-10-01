const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const vscode = require('vscode');

const execFileAsync = promisify(execFile);
const COMMAND = 'grijo.commitAi.generate';
const DEFAULT_SCRIPT_PATH = '.vscode/tools/vscode-commit-ai/generate-commit-message.mjs';
const DEFAULT_ENV_FILE = '.vscode/tools/vscode-commit-ai/.env';
const DEFAULT_MAX_DIFF_CHARS = 120000;
const GENERATOR_TIMEOUT_MS = 120000;

function resolveRepositoryPath(repositoryRoot, configuredPath, description) {
  const root = path.resolve(repositoryRoot);
  const candidate = path.isAbsolute(configuredPath)
    ? path.normalize(configuredPath)
    : path.resolve(root, configuredPath);
  const relative = path.relative(root, candidate);

  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`${description} precisa permanecer dentro da raiz do repositório.`);
  }

  return candidate;
}

async function getGitApi() {
  const gitExtension = vscode.extensions.getExtension('vscode.git');
  if (!gitExtension) throw new Error('A extensão Git integrada do VS Code não está disponível.');

  const extensionExports = gitExtension.isActive ? gitExtension.exports : await gitExtension.activate();
  if (!extensionExports || typeof extensionExports.getAPI !== 'function') {
    throw new Error('A API integrada do Git não pôde ser inicializada.');
  }

  const api = extensionExports.getAPI(1);
  if (api.state !== 'initialized') {
    await new Promise((resolve, reject) => {
      let subscription;
      const timeout = setTimeout(() => {
        subscription?.dispose();
        reject(new Error('A API do Git não ficou pronta dentro do tempo esperado.'));
      }, 10000);

      subscription = api.onDidChangeState((state) => {
        if (state !== 'initialized') return;
        clearTimeout(timeout);
        subscription.dispose();
        resolve();
      });
    });
  }

  return api;
}

function findRepository(api) {
  const activeDocumentUri = vscode.window.activeTextEditor?.document.uri;
  if (activeDocumentUri) {
    const activeRepository = api.getRepository(activeDocumentUri);
    if (activeRepository) return activeRepository;
  }

  for (const workspaceFolder of vscode.workspace.workspaceFolders ?? []) {
    const repository = api.getRepository(workspaceFolder.uri);
    if (repository) return repository;
  }

  return api.repositories.find((repository) => repository.ui?.selected) ?? api.repositories[0];
}

function getConfiguredValue(configuration, key, fallback) {
  const value = configuration.get(key, fallback);
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

async function runGenerator(repository) {
  const root = repository.rootUri.fsPath;
  const configuration = vscode.workspace.getConfiguration('grijo.commitAi', repository.rootUri);
  const configuredScriptPath = getConfiguredValue(configuration, 'scriptPath', DEFAULT_SCRIPT_PATH);
  const configuredEnvFile = getConfiguredValue(configuration, 'envFile', DEFAULT_ENV_FILE);
  const configuredMaxDiffChars = configuration.get('maxDiffChars', DEFAULT_MAX_DIFF_CHARS);
  const maxDiffChars = Number.isInteger(configuredMaxDiffChars) && configuredMaxDiffChars > 0
    ? configuredMaxDiffChars
    : DEFAULT_MAX_DIFF_CHARS;
  const scriptPath = resolveRepositoryPath(root, configuredScriptPath, 'O caminho do gerador');
  const envFile = resolveRepositoryPath(root, configuredEnvFile, 'O arquivo de ambiente');

  const result = await execFileAsync(
    process.execPath,
    [
      scriptPath,
      '--root',
      root,
      '--env-file',
      envFile,
      '--max-diff-chars',
      String(maxDiffChars),
    ],
    {
      cwd: root,
      env: { ...process.env },
      timeout: GENERATOR_TIMEOUT_MS,
      maxBuffer: 1_048_576,
    },
  );

  const message = result.stdout.trim();
  if (!message) throw new Error('O gerador não retornou uma mensagem.');
  return message;
}

function formatError(error) {
  if (error?.code === 'ETIMEDOUT' || error?.killed) {
    return 'A geração excedeu o tempo limite de 120 segundos.';
  }

  return error instanceof Error ? error.message : String(error);
}

async function generateCommitMessage() {
  if (!vscode.workspace.isTrusted) {
    throw new Error('Confie neste workspace antes de executar o gerador de commit.');
  }

  const api = await getGitApi();
  const repository = findRepository(api);
  if (!repository) throw new Error('Nenhum repositório Git aberto foi encontrado.');

  if (repository.inputBox.value.trim()) {
    const choice = await vscode.window.showWarningMessage(
      'O campo de commit já contém texto. Deseja substituí-lo?',
      { modal: true },
      'Substituir',
      'Cancelar',
    );
    if (choice !== 'Substituir') return;
  }

  const message = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Gerando mensagem de commit…',
      cancellable: false,
    },
    () => runGenerator(repository),
  );

  repository.inputBox.value = message;
  await vscode.commands.executeCommand('workbench.view.scm');
  vscode.window.showInformationMessage('Mensagem gerada e inserida no campo de commit.');
}

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND, () =>
      generateCommitMessage().catch((error) => {
        vscode.window.showErrorMessage(`Commit AI: ${formatError(error)}`);
      }),
    ),
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
