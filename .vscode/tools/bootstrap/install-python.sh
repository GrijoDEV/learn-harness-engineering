#!/usr/bin/env bash

set -euo pipefail

python3_is_available() {
  local candidate="$1"
  local output

  command -v "$candidate" >/dev/null 2>&1 || return 1
  output=$("$candidate" --version 2>&1) || return 1
  [[ "$output" =~ Python[[:space:]]3\. ]]
}

run_as_root() {
  if [[ "$EUID" -eq 0 ]]; then
    "$@"
    return
  fi

  if command -v sudo >/dev/null 2>&1 && sudo -n true >/dev/null 2>&1; then
    sudo -n "$@"
    return
  fi

  echo 'Python não está instalado e o bootstrap não possui autorização sudo não interativa.' >&2
  echo 'Execute novamente com sudo ou instale python3 pelo gerenciador de pacotes da distribuição.' >&2
  return 1
}

if python3_is_available python3 || python3_is_available python; then
  echo 'Python 3 já está instalado; nenhuma instalação foi necessária.'
  exit 0
fi

if command -v apt-get >/dev/null 2>&1; then
  run_as_root apt-get update
  run_as_root apt-get install -y python3 python3-pip python3-venv
elif command -v dnf >/dev/null 2>&1; then
  run_as_root dnf install -y python3 python3-pip
elif command -v yum >/dev/null 2>&1; then
  run_as_root yum install -y python3 python3-pip
elif command -v pacman >/dev/null 2>&1; then
  run_as_root pacman -Sy --noconfirm python python-pip
elif command -v apk >/dev/null 2>&1; then
  run_as_root apk add python3 py3-pip
else
  echo 'Não foi encontrado um gerenciador de pacotes compatível para instalar Python 3.' >&2
  exit 1
fi

if ! python3_is_available python3 && ! python3_is_available python; then
  echo 'O gerenciador de pacotes terminou, mas Python 3 não passou na validação.' >&2
  exit 1
fi

echo 'Python 3 foi instalado e validado.'
