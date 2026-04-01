import * as vscode from 'vscode';
import * as path from 'path';
import * as net from 'net';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
  console.log('Platypus extension activated');

  const serverModule = context.asAbsolutePath(
    path.join('bin', 'platypus')
  );

  const serverOptions: ServerOptions = {
    run: {
      command: serverModule,
      args: ['--lsp'],
      transport: TransportKind.stdio
    },
    debug: {
      command: serverModule,
      args: ['--lsp', '--verbose'],
      transport: TransportKind.stdio
    }
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: '*' }],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*')
    }
  };

  client = new LanguageClient(
    'platypus',
    'Platypus AI Agent',
    serverOptions,
    clientOptions
  );

  client.start();

  context.subscriptions.push(
    vscode.commands.registerCommand('platypus.ask', async () => {
      const input = await vscode.window.showInputBox({
        prompt: 'Ask Platypus...',
        placeHolder: 'What do you want to do?'
      });

      if (input) {
        const panel = vscode.window.createWebviewPanel(
          'platypus',
          'Platypus',
          vscode.ViewColumn.Beside,
          {}
        );

        panel.webview.html = getWebviewContent(input);
      }
    }),

    vscode.commands.registerCommand('platypus.edit', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
      }

      const selection = editor.selection;
      const selectedText = editor.document.getText(selection);

      const input = await vscode.window.showInputBox({
        prompt: 'How to edit?',
        placeHolder: 'e.g., refactor to use async/await'
      });

      if (input && selectedText) {
        vscode.window.showInformationMessage(
          `Platypus: Editing "${input}" on selected code`
        );
      }
    }),

    vscode.commands.registerCommand('platypus.explain', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('No active editor');
        return;
      }

      const selection = editor.selection;
      const selectedText = editor.document.getText(selection);

      if (selectedText) {
        const panel = vscode.window.createWebviewPanel(
          'platypus-explain',
          'Platypus: Explain',
          vscode.ViewColumn.Beside,
          {}
        );

        panel.webview.html = getExplainWebviewContent(selectedText);
      } else {
        vscode.window.showWarningMessage('No code selected');
      }
    })
  );
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}

function getWebviewContent(question: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Platypus</title>
  <style>
    body { font-family: var(--vscode-font-family); padding: 20px; }
    .question { color: var(--vscode-foreground); margin-bottom: 20px; }
    .response { color: var(--vscode-editor-foreground); }
    .loading { color: var(--vscode-descriptionForeground); }
  </style>
</head>
<body>
  <div class="question"><strong>Q:</strong> ${question}</div>
  <div class="loading">Platypus is working...</div>
</body>
</html>`;
}

function getExplainWebviewContent(code: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Platypus: Explain</title>
  <style>
    body { font-family: var(--vscode-font-family); padding: 20px; }
    pre { background: var(--vscode-textCodeBlock-background); padding: 10px; overflow-x: auto; }
    .loading { color: var(--vscode-descriptionForeground); }
  </style>
</head>
<body>
  <h3>Selected Code:</h3>
  <pre>${code}</pre>
  <div class="loading">Platypus is analyzing...</div>
</body>
</html>`;
}
