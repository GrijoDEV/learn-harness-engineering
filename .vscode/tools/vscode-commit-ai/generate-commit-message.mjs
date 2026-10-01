#!/usr/bin/env node

import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_ENV_KEYS = [
  'AI_SUGGESTION_COMMIT_BASE_URL',
  'AI_SUGGESTION_COMMIT_API_KEY',
  'AI_SUGGESTION_COMMIT_DEFAULT_MODEL',
];
const DEFAULT_COMMIT_LANGUAGE = 'pt-BR';
const DEFAULT_MAX_DIFF_CHARS = 120_000;
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_OUTPUT_TOKENS = 256;
const EMPTY_GIT_RESULT = {
  output: '',
  stderr: '',
  exitCode: 0,
  signal: null,
  exceededLimit: false,
};

function parseDotEnvValue(rawValue) {
  const value = rawValue.trim();

  if (value.startsWith('"')) {
    const closingQuote = value.lastIndexOf('"');
    if (closingQuote > 0) {
      try {
        return JSON.parse(value.slice(0, closingQuote + 1));
      } catch {
        return value.slice(1, closingQuote);
      }
    }
  }

  if (value.startsWith("'")) {
    const closingQuote = value.lastIndexOf("'");
    if (closingQuote > 0) return value.slice(1, closingQuote).replaceAll("\\'", "'");
  }

  const inlineComment = value.search(/\s+#/);
  return (inlineComment >= 0 ? value.slice(0, inlineComment) : value).trim();
}

export function parseDotEnv(contents) {
  const values = {};
  const normalizedContents = contents.replace(/^\uFEFF/, '');

  for (const rawLine of normalizedContents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;

    values[match[1]] = parseDotEnvValue(match[2]);
  }

  return values;
}

export function resolvePathWithinRoot(rootPath, configuredPath, description) {
  const root = path.resolve(rootPath);
  const candidate = path.isAbsolute(configuredPath)
    ? path.normalize(configuredPath)
    : path.resolve(root, configuredPath);
  const relative = path.relative(root, candidate);

  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`${description} precisa permanecer dentro da raiz do repositório.`);
  }

  return candidate;
}

export function getGitRoot(cwd) {
  return execFileSync('git', ['rev-parse', '--show-toplevel'], {
    cwd,
    encoding: 'utf8',
  }).trim();
}

function parsePositiveInteger(value, fallback, name) {
  if (value === undefined || value === null || value === '') return fallback;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} precisa ser um número inteiro positivo.`);
  }

  return parsed;
}

async function loadConfiguration(root, envFile) {
  let fileValues = {};

  try {
    fileValues = parseDotEnv(await fs.readFile(envFile, 'utf8'));
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw new Error(`Não foi possível ler o arquivo de ambiente: ${envFile}`);
    }
  }

  const values = { ...process.env, ...fileValues };
  const missingKeys = REQUIRED_ENV_KEYS.filter((key) => !String(values[key] ?? '').trim());
  const language =
    String(
      process.env.AI_SUGGESTION_COMMIT_LANGUAGE ??
        fileValues.AI_SUGGESTION_COMMIT_LANGUAGE ??
        DEFAULT_COMMIT_LANGUAGE,
    )
      .replace(/\s+/g, ' ')
      .trim() || DEFAULT_COMMIT_LANGUAGE;

  if (missingKeys.length > 0) {
    throw new Error(`Variáveis obrigatórias ausentes: ${missingKeys.join(', ')}`);
  }

  return {
    baseUrl: values.AI_SUGGESTION_COMMIT_BASE_URL.trim(),
    apiKey: values.AI_SUGGESTION_COMMIT_API_KEY.trim(),
    model: values.AI_SUGGESTION_COMMIT_DEFAULT_MODEL.trim(),
    language,
    timeoutMs: parsePositiveInteger(
      values.AI_SUGGESTION_COMMIT_TIMEOUT_MS ?? values.AI_PROVIDER_REQUEST_TIMEOUT_MS,
      DEFAULT_TIMEOUT_MS,
      'AI_SUGGESTION_COMMIT_TIMEOUT_MS',
    ),
    maxDiffChars: parsePositiveInteger(
      values.AI_SUGGESTION_COMMIT_MAX_DIFF_CHARS,
      DEFAULT_MAX_DIFF_CHARS,
      'AI_SUGGESTION_COMMIT_MAX_DIFF_CHARS',
    ),
    root,
  };
}

export function isSecretFile(filePath) {
  const baseName = path.basename(filePath);
  return baseName === '.env' || (baseName.startsWith('.env.') && baseName !== '.env.example');
}

function getDiffBaseArguments(root) {
  try {
    execFileSync('git', ['rev-parse', '--verify', 'HEAD'], { cwd: root, stdio: 'ignore' });
    return ['HEAD'];
  } catch {
    return ['--cached'];
  }
}

function parseNullSeparatedPaths(output) {
  return output.split('\0').filter(Boolean);
}

function getTrackedChangedPaths(root) {
  const diffBaseArguments = getDiffBaseArguments(root);
  const changedPaths = execFileSync('git', ['diff', ...diffBaseArguments, '--name-only', '-z'], {
    cwd: root,
    encoding: 'utf8',
  });

  return parseNullSeparatedPaths(changedPaths);
}

function getUntrackedPaths(root) {
  const untrackedPaths = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '-z'], {
    cwd: root,
    encoding: 'utf8',
  });

  return parseNullSeparatedPaths(untrackedPaths);
}

function getChangedPaths(root) {
  return [...new Set([...getTrackedChangedPaths(root), ...getUntrackedPaths(root)])];
}

export function assertNoSecretFilesChanged(root) {
  const secretPaths = getChangedPaths(root).filter(isSecretFile);

  if (secretPaths.length > 0) {
    throw new Error(
      `Arquivos de ambiente não podem ser enviados ao provedor: ${secretPaths.join(', ')}`,
    );
  }
}

function getSafeTrackedChangedPaths(root) {
  return getTrackedChangedPaths(root).filter((changedPath) => !isSecretFile(changedPath));
}

function getSafeUntrackedPaths(root) {
  return getUntrackedPaths(root).filter((changedPath) => !isSecretFile(changedPath));
}

function collectGitOutput(root, gitArguments, maxChars) {
  return new Promise((resolve, reject) => {
    const child = spawn('git', gitArguments, {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    let stderr = '';
    let exceededLimit = false;

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      if (exceededLimit) return;

      const remaining = maxChars - output.length;
      if (chunk.length > remaining) {
        output += chunk.slice(0, Math.max(remaining, 0));
        exceededLimit = true;
        child.kill();
        return;
      }

      output += chunk;
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
      stderr = `${stderr}${chunk}`.slice(0, 4_000);
    });

    child.once('error', reject);
    child.once('close', (exitCode, signal) => {
      resolve({ output, stderr, exitCode, signal, exceededLimit });
    });
  });
}

function throwIfGitFailed(result, acceptedExitCodes = []) {
  if (result.exitCode === 0 || acceptedExitCodes.includes(result.exitCode)) return;

  const detail = result.stderr.trim()
    ? `: ${result.stderr.trim()}`
    : result.signal
      ? ` (${result.signal})`
      : '';
  throw new Error(`Não foi possível ler as alterações do Git${detail}`);
}

async function collectUntrackedOutput(root, untrackedPaths, maxChars, statOnly = false) {
  const diffOptions = statOnly ? ['--stat=120,80,100'] : ['--unified=3'];
  let output = '';

  for (const relativePath of untrackedPaths) {
    const remaining = maxChars - output.length;
    if (remaining <= 0) return { output, exceededLimit: true };

    const result = await collectGitOutput(
      root,
      ['diff', '--no-index', '--no-ext-diff', ...diffOptions, '--', '/dev/null', relativePath],
      remaining,
    );

    if (!result.exceededLimit) throwIfGitFailed(result, [1]);
    output += result.output;

    if (result.exceededLimit) return { output, exceededLimit: true };
  }

  return { output, exceededLimit: false };
}

async function readCompactDiffSummary(root, maxDiffChars) {
  const header = [
    `[O patch completo excede o limite de ${maxDiffChars} caracteres.]`,
    'O conteúdo abaixo é um resumo estatístico do Git. Não invente detalhes que não aparecem nele.',
  ].join('\n');
  const summaryBudget = Math.max(maxDiffChars - header.length - 2, 1);
  const safeTrackedPaths = getSafeTrackedChangedPaths(root);
  const result =
    safeTrackedPaths.length > 0
      ? await collectGitOutput(
          root,
          [
            'diff',
            ...getDiffBaseArguments(root),
            '--no-ext-diff',
            '--stat=120,80,100',
            '--',
            ...safeTrackedPaths,
          ],
          summaryBudget,
        )
      : EMPTY_GIT_RESULT;

  if (!result.exceededLimit) throwIfGitFailed(result);
  let summary = result.output;

  if (!result.exceededLimit) {
    const untrackedResult = await collectUntrackedOutput(
      root,
      getSafeUntrackedPaths(root),
      Math.max(summaryBudget - summary.length, 0),
      true,
    );
    summary += untrackedResult.output;
  }

  summary = summary.trim();
  if (!summary) {
    throw new Error(
      'Nenhuma alteração não commitada encontrada. Edite um arquivo antes de gerar a mensagem.',
    );
  }

  return `${header}\n\n${summary}`;
}

export async function readWorkingTreeDiff(root, maxDiffChars) {
  const safeTrackedPaths = getSafeTrackedChangedPaths(root);
  const trackedResult =
    safeTrackedPaths.length > 0
      ? await collectGitOutput(
          root,
          [
            'diff',
            ...getDiffBaseArguments(root),
            '--no-ext-diff',
            '--unified=3',
            '--',
            ...safeTrackedPaths,
          ],
          maxDiffChars,
        )
      : EMPTY_GIT_RESULT;

  if (trackedResult.exceededLimit) {
    return readCompactDiffSummary(root, maxDiffChars);
  }

  throwIfGitFailed(trackedResult);
  const untrackedResult = await collectUntrackedOutput(
    root,
    getSafeUntrackedPaths(root),
    Math.max(maxDiffChars - trackedResult.output.length, 0),
  );

  if (untrackedResult.exceededLimit) {
    return readCompactDiffSummary(root, maxDiffChars);
  }

  const diff = `${trackedResult.output}${untrackedResult.output}`;
  if (!diff.trim()) {
    throw new Error(
      'Nenhuma alteração não commitada encontrada. Edite um arquivo antes de gerar a mensagem.',
    );
  }

  return diff;
}

export function buildMessages(diff, language = DEFAULT_COMMIT_LANGUAGE) {
  const requestedLanguage =
    String(language ?? DEFAULT_COMMIT_LANGUAGE)
      .replace(/\s+/g, ' ')
      .trim() || DEFAULT_COMMIT_LANGUAGE;

  return [
    {
      role: 'system',
      content: [
        'Você é um assistente especializado em mensagens de commit Git.',
        'Analise somente as alterações não commitadas fornecidas.',
        'Se a entrada trouxer apenas um resumo estatístico, seja conservador e não invente detalhes.',
        'Retorne exatamente uma única linha de mensagem Conventional Commits.',
        `Escreva obrigatoriamente no idioma solicitado: ${requestedLanguage}.`,
        'Não altere o idioma solicitado com base no idioma predominante do projeto.',
        'Não use Markdown, aspas ou explicações.',
        'Mantenha o assunto objetivo e, de preferência, com no máximo 97 caracteres.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: `Gere a mensagem para estas alterações não commitadas:\n\n${diff}`,
    },
  ];
}

export function buildChatCompletionsUrl(baseUrl) {
  let parsedUrl;

  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    throw new Error('AI_SUGGESTION_COMMIT_BASE_URL não é uma URL válida.');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('AI_SUGGESTION_COMMIT_BASE_URL precisa usar HTTP ou HTTPS.');
  }

  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  return normalizedBaseUrl.endsWith('/chat/completions')
    ? normalizedBaseUrl
    : `${normalizedBaseUrl}/chat/completions`;
}

export function isDeepSeekProvider(configuration) {
  try {
    const hostname = new URL(configuration.baseUrl).hostname.toLowerCase();
    return hostname === 'api.deepseek.com' || hostname.endsWith('.deepseek.com');
  } catch {
    return false;
  }
}

export function buildCompletionRequestBody(configuration, messages) {
  const requestBody = {
    model: configuration.model,
    messages,
    max_tokens: DEFAULT_MAX_OUTPUT_TOKENS,
    temperature: 0.2,
    stream: false,
  };

  // DeepSeek V4 habilita thinking por padrão. Para uma mensagem de commit,
  // precisamos do texto final curto, não de uma saída de raciocínio longa.
  if (isDeepSeekProvider(configuration)) {
    requestBody.thinking = { type: 'disabled' };
  }

  return requestBody;
}

export function extractCompletionContent(payload) {
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content === 'string') return content;

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        return typeof part?.text === 'string' ? part.text : '';
      })
      .join('');
  }

  return '';
}

export function normalizeCommitMessage(content) {
  const normalized = String(content)
    .replace(/^```(?:[a-z]+)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  const firstLine =
    normalized
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) ?? '';
  const message = firstLine.replace(/^["'`]+|["'`]+$/g, '').trim();

  if (!message) throw new Error('O provedor retornou uma mensagem de commit vazia.');
  return message;
}

function redact(value, secret) {
  return String(value ?? '')
    .replaceAll(secret, '[redacted]')
    .replace(/\s+/g, ' ')
    .slice(0, 300);
}

export async function requestCompletion(
  configuration,
  messages,
  fetchImplementation = globalThis.fetch,
) {
  if (typeof fetchImplementation !== 'function') {
    throw new Error('Esta versão do Node não disponibiliza fetch global.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), configuration.timeoutMs);

  let response;
  try {
    response = await fetchImplementation(buildChatCompletionsUrl(configuration.baseUrl), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${configuration.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildCompletionRequestBody(configuration, messages)),
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`A chamada ao provedor excedeu ${configuration.timeoutMs} ms.`);
    }
    throw new Error(
      `Falha de rede ao chamar o provedor: ${redact(error?.message, configuration.apiKey)}`,
    );
  } finally {
    clearTimeout(timeout);
  }

  const responseText = await response.text();
  let payload;

  try {
    payload = JSON.parse(responseText);
  } catch {
    throw new Error(`O provedor retornou uma resposta não JSON (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    const providerMessage = payload?.error?.message;
    const suffix = providerMessage ? `: ${redact(providerMessage, configuration.apiKey)}` : '';
    throw new Error(`O provedor retornou HTTP ${response.status}${suffix}`);
  }

  const content = extractCompletionContent(payload);
  if (!content.trim()) {
    const finishReason = payload?.choices?.[0]?.finish_reason;
    if (finishReason === 'length') {
      throw new Error('O provedor esgotou o limite de tokens antes de retornar a mensagem final.');
    }

    throw new Error('O provedor retornou uma mensagem de commit vazia.');
  }

  return normalizeCommitMessage(content);
}

function parseArguments(argumentsList) {
  const options = {};

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];

    if (argument === '--help') {
      options.help = true;
      continue;
    }

    if (['--root', '--env-file', '--max-diff-chars'].includes(argument)) {
      const value = argumentsList[index + 1];
      if (!value) throw new Error(`Valor ausente para ${argument}.`);
      options[argument.slice(2).replaceAll('-', '')] = value;
      index += 1;
      continue;
    }

    throw new Error(`Argumento não reconhecido: ${argument}`);
  }

  return options;
}

function printHelp() {
  console.log(
    'Uso: node generate-commit-message.mjs [--root PATH] [--env-file PATH]',
  );
  console.log(
    'Lê as alterações não commitadas, chama uma API OpenAI-compatible e imprime uma mensagem de commit.',
  );
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const root = options.root ? path.resolve(options.root) : getGitRoot(process.cwd());
  const envFile = options.envfile
    ? resolvePathWithinRoot(root, options.envfile, 'O arquivo de ambiente')
    : path.join(root, '.vscode', 'tools', 'vscode-commit-ai', '.env');
  const configuration = await loadConfiguration(root, envFile);
  const maxDiffChars = parsePositiveInteger(
    options.maxdiffchars ?? configuration.maxDiffChars,
    DEFAULT_MAX_DIFF_CHARS,
    '--max-diff-chars',
  );
  const diff = await readWorkingTreeDiff(root, maxDiffChars);
  const message = await requestCompletion(
    configuration,
    buildMessages(diff, configuration.language),
  );

  process.stdout.write(`${message}\n`);
}

const currentFile = path.resolve(fileURLToPath(import.meta.url));
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : '';

if (currentFile === invokedFile) {
  main().catch((error) => {
    console.error(`Commit AI: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
