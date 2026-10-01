#!/usr/bin/env bash

set -euo pipefail

script_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
package_path="$script_root/package.json"

if [[ ! -f "$package_path" ]]; then
    printf "package.json não foi encontrado em '%s'.\n" "$script_root" >&2
    exit 1
fi

extension_name="$(node -e 'const fs = require("fs"); const p = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.stdout.write(`${p.name}-${p.version}`);' "$package_path")"
vsix_path="$script_root/${extension_name}.vsix"

if [[ ! -f "$vsix_path" ]]; then
    if ! command -v pnpm >/dev/null 2>&1; then
        printf "pnpm não foi encontrado no PATH.\n" >&2
        exit 1
    fi
    (
        cd -- "$script_root"
        pnpm dlx @vscode/vsce package --no-dependencies
    )
fi

if ! command -v code >/dev/null 2>&1; then
    printf "code não foi encontrado no PATH do Linux.\n" >&2
    exit 1
fi

code --install-extension "$vsix_path" --force
printf "Extensão global de atalhos instalada com sucesso.\n"
