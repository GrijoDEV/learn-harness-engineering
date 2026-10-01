const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const vscode = require('vscode');

const execFileAsync = promisify(execFile);
const CONTEXT_KEY = 'grijo.workspaceKeybindingsWorkspace';
const SOURCE_RELATIVE_PATH = path.join('.vscode', 'keybindings.json');
const SCRIPT_NAME = 'apply-keybindings.mjs';

function getWorkspaceId(folders) {
  const material = folders.map((folder) => folder.uri.fsPath).join('\0');
  return crypto.createHash('sha256').update(material).digest('hex').slice(0, 20);
}

function getTargetPath() {
  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(configHome, 'Code', 'User', 'keybindings.json');
}

async function runScript(context, folders, workspaceId, removeScope) {
  const scriptPath = path.join(context.extensionPath, SCRIPT_NAME);
  const sourcePaths = folders
    .map((folder) => path.join(folder.uri.fsPath, SOURCE_RELATIVE_PATH))
    .filter((sourcePath) => fs.existsSync(sourcePath));
  const args = [
    scriptPath,
    '--target',
    getTargetPath(),
    '--scope',
    workspaceId,
    '--context-key',
    CONTEXT_KEY,
    '--context-value',
    workspaceId,
  ];

  if (removeScope) args.push('--remove-scope');
  else sourcePaths.forEach((sourcePath) => args.push('--source', sourcePath));

  await execFileAsync(process.execPath, args, {
    cwd: folders[0]?.uri.fsPath,
    env: { ...process.env },
    timeout: 15000,
    maxBuffer: 1_048_576,
  });
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}

function activate(context) {
  let watchers = [];
  let activeWorkspaceId = null;
  let syncChain = Promise.resolve();

  const resetWatchers = () => {
    watchers.forEach((watcher) => watcher.dispose());
    watchers = [];
    for (const folder of vscode.workspace.workspaceFolders ?? []) {
      const pattern = new vscode.RelativePattern(folder, SOURCE_RELATIVE_PATH);
      const watcher = vscode.workspace.createFileSystemWatcher(pattern);
      const queue = () => queueSync();
      watcher.onDidCreate(queue, null, context.subscriptions);
      watcher.onDidChange(queue, null, context.subscriptions);
      watcher.onDidDelete(queue, null, context.subscriptions);
      watchers.push(watcher);
    }
  };

  const syncWorkspace = async () => {
    const folders = vscode.workspace.workspaceFolders ?? [];
    if (!vscode.workspace.isTrusted || folders.length === 0) {
      await vscode.commands.executeCommand('setContext', CONTEXT_KEY, null);
      return;
    }

    const workspaceId = getWorkspaceId(folders);
    await vscode.commands.executeCommand('setContext', CONTEXT_KEY, workspaceId);
    const hasSource = folders.some((folder) =>
      fs.existsSync(path.join(folder.uri.fsPath, SOURCE_RELATIVE_PATH)),
    );

    await runScript(context, folders, workspaceId, !hasSource);
    activeWorkspaceId = workspaceId;
  };

  function queueSync() {
    syncChain = syncChain
      .then(syncWorkspace)
      .catch((error) => {
        vscode.window.showErrorMessage(`Workspace Keybindings: ${formatError(error)}`);
      });
    return syncChain;
  }

  resetWatchers();
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      resetWatchers();
      void queueSync();
    }),
    vscode.workspace.onDidGrantWorkspaceTrust(() => void queueSync()),
  );
  void queueSync();

  context.subscriptions.push({
    dispose() {
      watchers.forEach((watcher) => watcher.dispose());
      watchers = [];
      activeWorkspaceId = null;
    },
  });
}

function deactivate() {}

module.exports = { activate, deactivate };
