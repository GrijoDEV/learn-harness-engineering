#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const workspaceRoot = path.resolve(path.dirname(scriptPath), "..", "..", "..");
const commandLine = process.argv.slice(2);

function getOption(name, fallback = null) {
  const index = commandLine.indexOf(name);
  if (index === -1 || index + 1 >= commandLine.length) return fallback;
  return commandLine[index + 1];
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
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
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

function readJsonc(filePath) {
  try {
    return JSON.parse(stripJsonComments(fs.readFileSync(filePath, "utf8")));
  } catch (error) {
    throw new Error(
      "Não foi possível ler JSONC em " + filePath + ": " + error.message,
    );
  }
}

function resolveWorkspacePath(value, description) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(description + " precisa ser um caminho de texto.");
  }

  const candidate = path.resolve(workspaceRoot, value);
  const relative = path.relative(workspaceRoot, candidate);
  if (
    relative === ".." ||
    relative.startsWith(".." + path.sep) ||
    path.isAbsolute(relative)
  ) {
    throw new Error(
      description + " precisa permanecer dentro da raiz do workspace.",
    );
  }

  return candidate;
}

function resolveCodeCommand() {
  const result = spawnSync("which", ["code"], { encoding: "utf8" });
  if (result.status === 0 && result.stdout.trim()) {
    return result.stdout.trim().split(/\r?\n/)[0];
  }

  throw new Error("code não foi encontrado no PATH do Linux.");
}

function runCommand(command, argumentsList, options = {}) {
  const result = spawnSync(command, argumentsList, {
    encoding: "utf8",
    shell: false,
    stdio: options.capture ? "pipe" : "inherit",
  });

  if (result.error) {
    throw new Error(
      "Falha ao executar " + command + ": " + result.error.message,
    );
  }

  if (result.status !== 0) {
    throw new Error(command + " terminou com código " + result.status + ".");
  }

  return result;
}

function getInstalledExtensionIds(codeCommand) {
  const result = runCommand(codeCommand, ["--list-extensions"], {
    capture: true,
  });
  return new Set(
    (result.stdout || "")
      .split(/\r?\n/)
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

function commandExists(command) {
  const result = spawnSync("which", [command], {
    encoding: "utf8",
  });
  return result.status === 0;
}

function normalizeCommandCandidate(value, description) {
  if (typeof value === "string") {
    if (!value.trim()) {
      throw new Error(description + " precisa definir um command não vazio.");
    }

    return { command: value.trim(), arguments: [] };
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(
      description + " precisa ser um command ou um objeto de command.",
    );
  }

  if (typeof value.command !== "string" || !value.command.trim()) {
    throw new Error(
      description + " precisa definir command como texto não vazio.",
    );
  }

  const argumentsList = value.arguments === undefined ? [] : value.arguments;
  if (
    !Array.isArray(argumentsList) ||
    argumentsList.some((item) => typeof item !== "string")
  ) {
    throw new Error(
      "Os argumentos de " + description + " precisam ser textos.",
    );
  }

  return {
    command: value.command.trim(),
    arguments: argumentsList,
  };
}

function getCommandCandidates(check) {
  if (check.commands !== undefined) {
    if (!Array.isArray(check.commands) || check.commands.length === 0) {
      throw new Error(
        "Os commands de " +
          check.name +
          " precisam definir uma lista.",
      );
    }

    return check.commands.map((candidate, index) =>
      normalizeCommandCandidate(
        candidate,
        "O command " + (index + 1) + " de " + check.name,
      ),
    );
  }

  if (typeof check.command !== "string" || !check.command.trim()) {
    throw new Error(
      "O pré-requisito " + check.name + " precisa definir command ou commands.",
    );
  }

  return [
    normalizeCommandCandidate(check.command, "O command de " + check.name),
  ];
}

function parseVersion(value, description) {
  if (typeof value !== "string" || !/^\d+\.\d+\.\d+$/.test(value.trim())) {
    throw new Error(description + " precisa usar o formato major.minor.patch.");
  }

  return value.trim().split(".").map(Number);
}

function getMinimumVersion(check) {
  if (check.minimumVersion === undefined) return null;
  return parseVersion(
    check.minimumVersion,
    "A minimumVersion de " + check.name,
  );
}

function extractVersion(output) {
  const match = String(output || "").match(
    /(?:Python\s+)?(\d+)\.(\d+)\.(\d+)/i,
  );
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

function isVersionAtLeast(actual, minimum) {
  for (let index = 0; index < minimum.length; index += 1) {
    if (actual[index] > minimum[index]) return true;
    if (actual[index] < minimum[index]) return false;
  }

  return true;
}

function commandSatisfies(commandCandidate, minimumVersion) {
  if (!commandExists(commandCandidate.command)) return false;
  if (!minimumVersion) return true;

  const result = spawnSync(
    commandCandidate.command,
    [...commandCandidate.arguments, "--version"],
    {
      encoding: "utf8",
    },
  );

  if (result.error || result.status !== 0) return false;

  const actualVersion = extractVersion(
    `${result.stdout || ""}\n${result.stderr || ""}`,
  );
  return actualVersion
    ? isVersionAtLeast(actualVersion, minimumVersion)
    : false;
}

function formatCommandCandidate(commandCandidate) {
  return [commandCandidate.command, ...commandCandidate.arguments].join(" ");
}

function getInstallerPath(check) {
  const installer = check.installer;
  if (typeof installer === "string") {
    return resolveWorkspacePath(installer, "O installer de " + check.name);
  }

  if (!installer || typeof installer !== "object" || Array.isArray(installer)) {
    throw new Error("O pré-requisito " + check.name + " não possui installer.");
  }

  const installerValue = installer.linux;
  if (typeof installerValue !== "string" || !installerValue.trim()) {
    throw new Error(
      "O pré-requisito " +
        check.name +
        " não possui installer para Linux" +
        ".",
    );
  }

  return resolveWorkspacePath(installerValue, "O installer de " + check.name);
}

function getInstallerArguments(check) {
  if (check.arguments === undefined) return [];
  if (
    !Array.isArray(check.arguments) ||
    check.arguments.some((item) => typeof item !== "string")
  ) {
    throw new Error(
      "Os argumentos do installer de " + check.name + " precisam ser textos.",
    );
  }
  return check.arguments;
}

function runInstaller(check, whatIf) {
  const installerPath = getInstallerPath(check);
  if (!fs.existsSync(installerPath)) {
    throw new Error(
      "O installer de " +
        check.name +
        " não foi encontrado em " +
        installerPath +
        ".",
    );
  }

  const installerArguments = getInstallerArguments(check);
  const extension = path.extname(installerPath).toLowerCase();
  if (whatIf) {
    console.log("[WHATIF] O installer de " + check.name + " seria executado.");
    return;
  }

  if (extension === ".sh") {
    runCommand("bash", [installerPath, ...installerArguments]);
    return;
  }

  if (extension === ".mjs" || extension === ".js") {
    runCommand("node", [installerPath, ...installerArguments]);
    return;
  }

  throw new Error(
    "Extensão de installer não suportada para " +
      check.name +
      ": " +
      extension +
      ".",
  );
}

function determineTarget() {
  if (process.platform === "linux") return "linux";
  throw new Error(
    "Sistema operacional não suportado: " + process.platform + ".",
  );
}

function main() {
  const requestedManifest = getOption("--manifest", ".vscode/bootstrap.json");
  const whatIf = hasFlag("--what-if");
  const manifestPath = resolveWorkspacePath(requestedManifest, "O manifesto");
  if (!fs.existsSync(manifestPath)) {
    throw new Error("O manifesto não foi encontrado em " + manifestPath + ".");
  }

  determineTarget();
  const manifest = readJsonc(manifestPath);
  if (!Array.isArray(manifest.checks)) {
    throw new Error("O manifesto precisa definir checks como uma lista.");
  }

  console.log("Bootstrap: linux");

  let codeCommand = null;
  let installedExtensionIds = null;
  for (const check of manifest.checks) {
    if (!check || typeof check !== "object") {
      throw new Error("O manifesto contém um pré-requisito inválido.");
    }

    const name = typeof check.name === "string" ? check.name.trim() : "";
    const type =
      typeof check.type === "string" ? check.type.trim().toLowerCase() : "";
    if (!name || !type) {
      throw new Error("Cada pré-requisito precisa definir name e type.");
    }

    let satisfied = false;
    let satisfiedBy = null;
    if (type === "vscode-extension") {
      const extensionId = typeof check.id === "string" ? check.id.trim() : "";
      if (!/^[^.]+\.[^.]+$/.test(extensionId)) {
        throw new Error(
          "O ID da extensão de " + name + " precisa usar publisher.extension.",
        );
      }
      if (!codeCommand) codeCommand = resolveCodeCommand();
      if (!installedExtensionIds)
        installedExtensionIds = getInstalledExtensionIds(codeCommand);
      satisfied = installedExtensionIds.has(extensionId.toLowerCase());
    } else if (type === "path") {
      const checkPath = resolveWorkspacePath(check.path, "O path de " + name);
      satisfied = fs.existsSync(checkPath);
    } else if (type === "command") {
      const commandCandidates = getCommandCandidates(check);
      const minimumVersion = getMinimumVersion(check);
      satisfiedBy = commandCandidates.find((candidate) =>
        commandSatisfies(candidate, minimumVersion),
      );
      satisfied = Boolean(satisfiedBy);
    } else {
      throw new Error(
        "Tipo de pré-requisito não suportado para " + name + ": " + type + ".",
      );
    }

    if (satisfied) {
      const commandSuffix = satisfiedBy
        ? " (" + formatCommandCandidate(satisfiedBy) + ")"
        : "";
      console.log("[OK] " + name + commandSuffix);
      continue;
    }

    runInstaller(check, whatIf);
  }

  return 0;
}

try {
  process.exitCode = main();
} catch (error) {
  console.error("Bootstrap: " + error.message);
  process.exitCode = 1;
}
