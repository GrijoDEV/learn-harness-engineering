import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCompletionRequestBody,
  buildChatCompletionsUrl,
  buildMessages,
  extractCompletionContent,
  assertNoSecretFilesChanged,
  isSecretFile,
  normalizeCommitMessage,
  parseDotEnv,
  readWorkingTreeDiff,
  requestCompletion,
} from '../generate-commit-message.mjs';

test('parseDotEnv aceita comentários, export e valores entre aspas', () => {
  const values = parseDotEnv(`\n# comentário\nexport PROVIDER=deepseek\nTOKEN = "abc=123"\nMODE='fast' # comentário\n`);

  assert.deepEqual(values, {
    PROVIDER: 'deepseek',
    TOKEN: 'abc=123',
    MODE: 'fast',
  });
});

test('buildChatCompletionsUrl preserva endpoint completo e adiciona endpoint à base', () => {
  assert.equal(
    buildChatCompletionsUrl('https://api.deepseek.com/'),
    'https://api.deepseek.com/chat/completions',
  );
  assert.equal(
    buildChatCompletionsUrl('https://generativelanguage.googleapis.com/v1beta/openai/'),
    'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
  );
  assert.equal(
    buildChatCompletionsUrl('https://gateway.example.test/v1/chat/completions'),
    'https://gateway.example.test/v1/chat/completions',
  );
});

test('extractCompletionContent aceita conteúdo textual e partes com text', () => {
  assert.equal(
    extractCompletionContent({ choices: [{ message: { content: 'feat: add commit helper' } }] }),
    'feat: add commit helper',
  );
  assert.equal(
    extractCompletionContent({
      choices: [{ message: { content: [{ text: 'fix: ' }, { text: 'parse env' }] } }],
    }),
    'fix: parse env',
  );
});

test('normalizeCommitMessage retorna somente o assunto sem markdown', () => {
  assert.equal(
    normalizeCommitMessage('```text\nfeat: add provider switch\n\nExplicação\n```'),
    'feat: add provider switch',
  );
});

test('buildMessages instrui o provedor a usar o idioma configurado', () => {
  const [systemMessage] = buildMessages('diff', 'English');

  assert.match(systemMessage.content, /idioma solicitado: English/);
  assert.match(systemMessage.content, /Não altere o idioma solicitado/);
});

test('requestCompletion envia o contrato OpenAI-compatible', async () => {
  let capturedUrl;
  let capturedOptions;

  const message = await requestCompletion(
    {
      baseUrl: 'https://api.example.test/v1',
      apiKey: 'secret-key',
      model: 'commit-model',
      timeoutMs: 1000,
    },
    [{ role: 'user', content: 'diff' }],
    async (url, options) => {
      capturedUrl = url;
      capturedOptions = options;
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ choices: [{ message: { content: 'chore: update commit tooling' } }] }),
      };
    },
  );

  assert.equal(message, 'chore: update commit tooling');
  assert.equal(capturedUrl, 'https://api.example.test/v1/chat/completions');
  assert.equal(capturedOptions.headers.Authorization, 'Bearer secret-key');
  assert.deepEqual(JSON.parse(capturedOptions.body), {
    model: 'commit-model',
    messages: [{ role: 'user', content: 'diff' }],
    max_tokens: 256,
    temperature: 0.2,
    stream: false,
  });
});

test('buildCompletionRequestBody desativa thinking automaticamente na DeepSeek', () => {
  assert.deepEqual(
    buildCompletionRequestBody(
      {
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-v4-pro',
      },
      [{ role: 'user', content: 'diff' }],
    ),
    {
      model: 'deepseek-v4-pro',
      messages: [{ role: 'user', content: 'diff' }],
      max_tokens: 256,
      temperature: 0.2,
      stream: false,
      thinking: { type: 'disabled' },
    },
  );
});

test('readWorkingTreeDiff inclui alterações não staged em arquivos rastreados', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'grijo-commit-ai-'));

  try {
    execFileSync('git', ['init', '--quiet'], { cwd: root });
    execFileSync('git', ['config', 'user.email', 'commit-ai-test@example.test'], { cwd: root });
    execFileSync('git', ['config', 'user.name', 'Commit AI Test'], { cwd: root });
    const trackedPath = path.join(root, 'tracked.txt');
    await fs.writeFile(trackedPath, 'base');
    execFileSync('git', ['add', 'tracked.txt'], { cwd: root });
    execFileSync('git', ['commit', '--quiet', '--no-gpg-sign', '-m', 'initial'], { cwd: root });
    await fs.writeFile(trackedPath, 'base' + String.fromCharCode(10) + 'working change');
    const diff = await readWorkingTreeDiff(root, 10_000);
    assert.match(diff, /working change/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('readWorkingTreeDiff inclui arquivos novos exibidos em Changes', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'grijo-commit-ai-'));

  try {
    execFileSync('git', ['init', '--quiet'], { cwd: root });
    execFileSync('git', ['config', 'user.email', 'commit-ai-test@example.test'], { cwd: root });
    execFileSync('git', ['config', 'user.name', 'Commit AI Test'], { cwd: root });
    const trackedPath = path.join(root, 'tracked.txt');
    await fs.writeFile(trackedPath, 'base');
    execFileSync('git', ['add', 'tracked.txt'], { cwd: root });
    execFileSync('git', ['commit', '--quiet', '--no-gpg-sign', '-m', 'initial'], { cwd: root });

    const untrackedPath = path.join(root, 'new-file.txt');
    await fs.writeFile(untrackedPath, 'new content');

    const diff = await readWorkingTreeDiff(root, 10_000);
    assert.match(diff, /new-file\.txt/);
    assert.match(diff, /new content/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('readWorkingTreeDiff usa resumo compacto para diffs maiores que o limite', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'grijo-commit-ai-'));

  try {
    execFileSync('git', ['init', '--quiet'], { cwd: root });
    execFileSync('git', ['config', 'user.email', 'commit-ai-test@example.test'], { cwd: root });
    execFileSync('git', ['config', 'user.name', 'Commit AI Test'], { cwd: root });
    const trackedPath = path.join(root, 'tracked.txt');
    await fs.writeFile(trackedPath, 'base');
    execFileSync('git', ['add', 'tracked.txt'], { cwd: root });
    execFileSync('git', ['commit', '--quiet', '--no-gpg-sign', '-m', 'initial'], { cwd: root });
    await fs.writeFile(trackedPath, `${'x'.repeat(20_000)}\n`);

    const summary = await readWorkingTreeDiff(root, 1_000);
    assert.match(summary, /patch completo excede o limite de 1000 caracteres/);
    assert.match(summary, /tracked\.txt/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('readWorkingTreeDiff inclui arquivos novos no resumo compacto', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'grijo-commit-ai-'));

  try {
    execFileSync('git', ['init', '--quiet'], { cwd: root });
    execFileSync('git', ['config', 'user.email', 'commit-ai-test@example.test'], { cwd: root });
    execFileSync('git', ['config', 'user.name', 'Commit AI Test'], { cwd: root });
    const trackedPath = path.join(root, 'tracked.txt');
    await fs.writeFile(trackedPath, 'base');
    execFileSync('git', ['add', 'tracked.txt'], { cwd: root });
    execFileSync('git', ['commit', '--quiet', '--no-gpg-sign', '-m', 'initial'], { cwd: root });

    await fs.writeFile(path.join(root, 'tracked.txt'), 'working change');
    await fs.writeFile(path.join(root, 'new-file.txt'), `${'x'.repeat(20_000)}\n`);

    const summary = await readWorkingTreeDiff(root, 1_000);
    assert.match(summary, /patch completo excede o limite de 1000 caracteres/);
    assert.match(summary, /new-file\.txt/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('readWorkingTreeDiff não inclui arquivos ignorados', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'grijo-commit-ai-'));

  try {
    execFileSync('git', ['init', '--quiet'], { cwd: root });
    execFileSync('git', ['config', 'user.email', 'commit-ai-test@example.test'], { cwd: root });
    execFileSync('git', ['config', 'user.name', 'Commit AI Test'], { cwd: root });
    const gitignorePath = path.join(root, '.gitignore');
    await fs.writeFile(gitignorePath, 'ignored.txt\n');
    execFileSync('git', ['add', '.gitignore'], { cwd: root });
    execFileSync('git', ['commit', '--quiet', '--no-gpg-sign', '-m', 'initial'], { cwd: root });
    await fs.writeFile(path.join(root, 'ignored.txt'), 'ignored content');

    await assert.rejects(
      readWorkingTreeDiff(root, 10_000),
      /Nenhuma alteração não commitada encontrada/,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('readWorkingTreeDiff exclui arquivo de ambiente rastreado', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'grijo-commit-ai-'));

  try {
    execFileSync('git', ['init', '--quiet'], { cwd: root });
    execFileSync('git', ['config', 'user.email', 'commit-ai-test@example.test'], { cwd: root });
    execFileSync('git', ['config', 'user.name', 'Commit AI Test'], { cwd: root });
    await fs.writeFile(path.join(root, 'tracked.txt'), 'base');
    await fs.writeFile(path.join(root, '.env'), 'AI_SUGGESTION_COMMIT_API_KEY=secret-value');
    execFileSync('git', ['add', '.'], { cwd: root });
    execFileSync('git', ['commit', '--quiet', '--no-gpg-sign', '-m', 'initial'], { cwd: root });

    await fs.writeFile(path.join(root, 'tracked.txt'), 'working change');
    await fs.writeFile(path.join(root, '.env'), 'AI_SUGGESTION_COMMIT_API_KEY=changed-secret');

    const diff = await readWorkingTreeDiff(root, 10_000);
    assert.match(diff, /working change/);
    assert.doesNotMatch(diff, /changed-secret/);
    assert.doesNotMatch(diff, /AI_SUGGESTION_COMMIT_API_KEY/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('readWorkingTreeDiff exclui arquivo de ambiente novo e mantém código novo', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'grijo-commit-ai-'));

  try {
    execFileSync('git', ['init', '--quiet'], { cwd: root });
    execFileSync('git', ['config', 'user.email', 'commit-ai-test@example.test'], { cwd: root });
    execFileSync('git', ['config', 'user.name', 'Commit AI Test'], { cwd: root });
    await fs.writeFile(path.join(root, 'tracked.txt'), 'base');
    execFileSync('git', ['add', 'tracked.txt'], { cwd: root });
    execFileSync('git', ['commit', '--quiet', '--no-gpg-sign', '-m', 'initial'], { cwd: root });

    await fs.writeFile(path.join(root, '.env'), 'AI_SUGGESTION_COMMIT_API_KEY=new-secret');
    await fs.writeFile(path.join(root, 'new-file.txt'), 'new content');

    const diff = await readWorkingTreeDiff(root, 10_000);
    assert.match(diff, /new-file\.txt/);
    assert.match(diff, /new content/);
    assert.doesNotMatch(diff, /new-secret/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('assertNoSecretFilesChanged bloqueia arquivo de ambiente não rastreado', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'grijo-commit-ai-'));

  try {
    execFileSync('git', ['init', '--quiet'], { cwd: root });
    await fs.writeFile(path.join(root, '.env'), 'AI_SUGGESTION_COMMIT_API_KEY=secret');

    assert.throws(
      () => assertNoSecretFilesChanged(root),
      /Arquivos de ambiente não podem ser enviados ao provedor: \.env/,
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('isSecretFile bloqueia arquivos de ambiente, mas permite o exemplo', () => {
  assert.equal(isSecretFile('.env'), true);
  assert.equal(isSecretFile('/tmp/.env.local'), true);
  assert.equal(isSecretFile('.env.example'), false);
  assert.equal(isSecretFile('src/config.ts'), false);
});
