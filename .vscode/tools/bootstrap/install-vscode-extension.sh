#!/usr/bin/env bash

set -euo pipefail

if ! command -v code >/dev/null 2>&1; then
  printf "code não foi encontrado no PATH do Linux.\n" >&2
  exit 1
fi

if [[ "$#" -eq 0 ]]; then
  printf "Informe ao menos um ID de extensão do VS Code.\n" >&2
  exit 1
fi

installed_extensions="$(code --list-extensions 2>/dev/null || true)"

for extension_id in "$@"; do
  if [[ ! "$extension_id" =~ ^[^.]+\.[^.]+$ ]]; then
    printf "ID de extensão inválido: %s\n" "$extension_id" >&2
    exit 1
  fi

  if grep -Fxiq -- "$extension_id" <<< "$installed_extensions"; then
    printf "[OK] Extensão já instalada: %s\n" "$extension_id"
    continue
  fi

  printf "Instalando extensão: %s\n" "$extension_id"
  code --install-extension "$extension_id" --force
done
