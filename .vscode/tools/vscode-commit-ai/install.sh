#!/usr/bin/env bash

set -euo pipefail

script_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
package_path="$script_root/package.json"
skip_package=0

for argument in "$@"; do
    if [[ "$argument" == "--skip-package" ]]; then
        skip_package=1
    fi
done

if [[ ! -f "$package_path" ]]; then
    printf "package.json não foi encontrado em '%s'.\n" "$script_root" >&2
    exit 1
fi

extension_name="$(node -e 'const fs = require("fs"); const packageJson = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.stdout.write(packageJson.name || "");' "$package_path")"
extension_version="$(node -e 'const fs = require("fs"); const packageJson = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); process.stdout.write(packageJson.version || "");' "$package_path")"

if [[ -z "$extension_name" || -z "$extension_version" ]]; then
    printf "package.json precisa definir name e version.\n" >&2
    exit 1
fi

vsix_path="$script_root/${extension_name}-${extension_version}.vsix"
if [[ ! -f "$vsix_path" ]]; then
    if [[ "$skip_package" -eq 1 ]]; then
        printf "O pacote '%s' não existe e --skip-package foi informado.\n" "$vsix_path" >&2
        exit 1
    fi

    if ! command -v pnpm >/dev/null 2>&1; then
        printf "pnpm não foi encontrado. Instale Node.js 18+ e pnpm, ou coloque pnpm no PATH.\n" >&2
        exit 1
    fi

    (
        cd -- "$script_root"
        pnpm dlx @vscode/vsce package
    )
fi

if [[ ! -f "$vsix_path" ]]; then
    printf "O empacotamento não gerou '%s'.\n" "$vsix_path" >&2
    exit 1
fi

if ! command -v code >/dev/null 2>&1; then
    printf "code não foi encontrado no PATH do Linux.\n" >&2
    exit 1
fi

code --install-extension "$vsix_path" --force
printf "Extensão instalada com sucesso.\n"
