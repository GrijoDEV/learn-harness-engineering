# Grijó Workspace Keybindings

Extensão global para aplicar automaticamente `.vscode/keybindings.json` do
workspace ativo. As regras são adicionadas ao `keybindings.json` do usuário
com uma condição de contexto específica do workspace, evitando que um projeto
afete outro.

Para instalar no Linux:

```bash
./.vscode/tools/vscode-workspace-keybindings/install.sh
```

O bootstrap do workspace também verifica e instala essa extensão quando ela
está ausente. Depois da instalação, o workspace que possuir
`.vscode/keybindings.json` será sincronizado automaticamente ao iniciar o VS
Code e quando esse arquivo for criado, alterado ou removido.
