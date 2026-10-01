#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const commandLine = process.argv.slice(2);
const managedBlockPrefix = "// BEGIN grijo workspace keybindings:";
const managedBlockEndPrefix = "// END grijo workspace keybindings:";

function getOption(name, fallback = null) {
  const index = commandLine.indexOf(name);
  if (index === -1 || index + 1 >= commandLine.length) return fallback;
  return commandLine[index + 1];
}

function getOptions(name) {
  const values = [];
  for (let index = 0; index < commandLine.length - 1; index += 1) {
    if (commandLine[index] === name) values.push(commandLine[index + 1]);
  }
  return values;
}

function hasFlag(name) {
  return commandLine.includes(name);
}

function stripJsonComments(source) {
  let result = "";
  let inString = false;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const nextCharacter = source[index + 1];

    if (inLineComment) {
      if (character === "\n") {
        inLineComment = false;
        result += character;
      }
      continue;
    }

    if (inBlockComment) {
      if (character === "*" && nextCharacter === "/") {
        inBlockComment = false;
        index += 1;
      } else if (character === "\n") {
        result += character;
      }
      continue;
    }

    if (inString) {
      result += character;
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
      continue;
    }

    if (character === '"') {
      inString = true;
      result += character;
    } else if (character === "/" && nextCharacter === "/") {
      inLineComment = true;
      index += 1;
    } else if (character === "/" && nextCharacter === "*") {
      inBlockComment = true;
      index += 1;
    } else {
      result += character;
    }
  }

  return result.replace(/,\s*([}\]])/g, "$1");
}

function parseJsonc(source, filePath) {
  try {
    return JSON.parse(stripJsonComments(source));
  } catch (error) {
    throw new Error(`Não foi possível ler JSONC em ${filePath}: ${error.message}`);
  }
}

function readRules(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo de atalhos não encontrado: ${filePath}`);
  }

  const rules = parseJsonc(fs.readFileSync(filePath, "utf8"), filePath);
  if (!Array.isArray(rules)) {
    throw new Error(`O arquivo de atalhos precisa conter uma lista: ${filePath}`);
  }

  for (const [index, rule] of rules.entries()) {
    if (!rule || typeof rule !== "object" || Array.isArray(rule)) {
      throw new Error(`Regra inválida na posição ${index} de ${filePath}`);
    }
    if (typeof rule.key !== "string" || !rule.key.trim()) {
      throw new Error(`A regra na posição ${index} precisa definir key.`);
    }
    if (typeof rule.command !== "string" || !rule.command.trim()) {
      throw new Error(`A regra na posição ${index} precisa definir command.`);
    }
  }

  return rules;
}

function removeBlock(source, blockStart, blockEnd) {
  let result = source;
  while (true) {
    const startIndex = result.indexOf(blockStart);
    if (startIndex === -1) return result;

    const endIndex = result.indexOf(blockEnd, startIndex);
    if (endIndex === -1) {
      throw new Error("O keybindings.json possui um bloco gerenciado incompleto.");
    }

    result = result.slice(0, startIndex) + result.slice(endIndex + blockEnd.length);
  }
}

function removeManagedBlocks(source, scope) {
  const blockStart = `${managedBlockPrefix} ${scope}`;
  const blockEnd = `${managedBlockEndPrefix} ${scope}`;
  let result = removeBlock(source, blockStart, blockEnd);

  // Remove formatos usados pelas versões anteriores deste automatizador.
  result = removeBlock(
    result,
    "// BEGIN managed VS Code keybindings",
    "// END managed VS Code keybindings",
  );
  result = removeBlock(
    result,
    "// BEGIN libs workspace keybindings",
    "// END libs workspace keybindings",
  );
  return result;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonicalize(item)]),
  );
}

function rulesEqual(left, right) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

function scopeRules(rules) {
  const contextKey = getOption("--context-key");
  const contextValue = getOption("--context-value");
  if (Boolean(contextKey) !== Boolean(contextValue)) {
    throw new Error("--context-key e --context-value precisam ser informados juntos.");
  }
  if (!contextKey) return rules;

  const condition = `${contextKey} == '${contextValue}'`;
  return rules.map((rule) => ({
    ...rule,
    when: rule.when ? `(${rule.when}) && ${condition}` : condition,
  }));
}

function indentJson(value) {
  return JSON.stringify(value, null, 2)
    .split("\n")
    .map((line) => "  " + line)
    .join("\n");
}

function formatKeybindings(userRules, projectRules, scope) {
  const lines = ["["];
  userRules.forEach((rule) => lines.push(indentJson(rule) + ","));
  lines.push(`  ${managedBlockPrefix} ${scope}`);
  projectRules.forEach((rule, index) => {
    lines.push(indentJson(rule) + (index < projectRules.length - 1 ? "," : ""));
  });
  lines.push(`  ${managedBlockEndPrefix} ${scope}`, "]", "");
  return lines.join("\n");
}

function resolveTargetPath() {
  const requested = getOption(
    "--target",
    process.env.VSCODE_KEYBINDINGS_PATH || null,
  );
  if (requested) return path.resolve(requested);
  if (process.platform !== "linux") {
    throw new Error("Defina --target ou VSCODE_KEYBINDINGS_PATH fora do Linux.");
  }
  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return path.join(configHome, "Code", "User", "keybindings.json");
}

function writeAtomically(filePath, content, mode) {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });
  const temporaryDirectory = fs.mkdtempSync(path.join(directory, ".keybindings-tmp-"));
  const temporaryPath = path.join(temporaryDirectory, "keybindings.json");
  try {
    fs.writeFileSync(temporaryPath, content, { encoding: "utf8", mode });
    fs.renameSync(temporaryPath, filePath);
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

function main() {
  const scope = getOption("--scope", "global");
  if (!/^[A-Za-z0-9._-]+$/.test(scope)) {
    throw new Error("--scope precisa conter apenas letras, números, ponto, hífen ou sublinhado.");
  }

  const targetPath = resolveTargetPath();
  const targetExists = fs.existsSync(targetPath);
  const originalTarget = targetExists ? fs.readFileSync(targetPath, "utf8") : "[]\n";
  const targetWithoutManagedBlocks = removeManagedBlocks(originalTarget, scope);
  const existingRules = targetExists ? parseJsonc(targetWithoutManagedBlocks, targetPath) : [];
  if (!Array.isArray(existingRules)) {
    throw new Error("O arquivo de destino precisa conter uma lista de atalhos.");
  }

  const removeOnly = hasFlag("--remove-scope");
  const sourcePaths = getOptions("--source");
  const resolvedSourcePaths = sourcePaths.length
    ? sourcePaths.map((sourcePath) => path.resolve(sourcePath))
    : [path.resolve(process.cwd(), ".vscode/keybindings.json")];
  const sourceRules = removeOnly
    ? []
    : sourcePaths.length
      ? resolvedSourcePaths.flatMap(readRules)
      : readRules(resolvedSourcePaths[0]);
  const projectRules = scopeRules(sourceRules);
  const userRules = existingRules.filter(
    (existingRule) => !projectRules.some((projectRule) => rulesEqual(existingRule, projectRule)),
  );
  const updatedTarget = formatKeybindings(userRules, projectRules, scope);
  const unchanged = targetExists && originalTarget === updatedTarget;

  console.log("Escopo: " + scope);
  console.log("Destino: " + targetPath);
  console.log("Arquivos de origem: " + (removeOnly ? 0 : resolvedSourcePaths.length));
  console.log("Regras aplicadas: " + projectRules.length);

  if (unchanged) {
    console.log("Atalhos já estão sincronizados.");
    return 0;
  }
  if (hasFlag("--dry-run")) {
    console.log("Simulação: nenhuma alteração foi gravada.");
    return 0;
  }

  const mode = targetExists ? fs.statSync(targetPath).mode & 0o777 : 0o600;
  writeAtomically(targetPath, updatedTarget, mode);
  console.log("Atalhos sincronizados com sucesso.");
  return 0;
}

try {
  process.exitCode = main();
} catch (error) {
  console.error("Atalhos do workspace: " + error.message);
  process.exitCode = 1;
}
