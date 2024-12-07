import * as vscode from 'vscode';
import { getWebviewContent } from './webviewContent';

let currentPanel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
  // Command to show the notes panel
  const openPanelDisposable = vscode.commands.registerCommand('code-notes.openNotesPanel', () => {
    if (currentPanel) {
      currentPanel.dispose();
    } else {
      currentPanel = vscode.window.createWebviewPanel(
        'myNotes',
        'My Code Notes',
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          retainContextWhenHidden: true
        }
      );

      const notes = context.globalState.get('notes', []) as any[];
      const checklist = context.globalState.get('checklist', []) as any[];

      currentPanel.webview.html = getWebviewContent({ notes, checklist });

      currentPanel.webview.onDidReceiveMessage(async (message) => {
        if (message.command === 'saveNotes') {
          context.globalState.update('notes', message.notes);
          context.globalState.update('checklist', message.checklist);
        } else if (message.command === 'goToLine') {
          const filePath = message.file;
          const lineNumber = parseInt(message.line, 10);

          if (filePath && !isNaN(lineNumber)) {
            try {
              const doc = await vscode.workspace.openTextDocument(filePath);
              const editor = await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
              const pos = new vscode.Position(Math.max(lineNumber - 1, 0), 0);
              editor.selection = new vscode.Selection(pos, pos);
              editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
            } catch (error) {
              vscode.window.showErrorMessage('Could not open file. File deleted or file path changed: ' + filePath);
            }
          } else {
            vscode.window.showErrorMessage('File or line number missing or invalid.');
          }
        } else if (message.command === 'addFileNote') {
          // Add a new file-based note from the extension side
          const newNotes = context.globalState.get('notes', []) as any[];
          newNotes.push({ text: message.text, file: message.file, line: message.line });
          context.globalState.update('notes', newNotes);
          // Update the webview
          if (currentPanel) {
            currentPanel.webview.postMessage({ command: 'updateData', notes: newNotes, checklist });
          }
        }
      });

      currentPanel.onDidDispose(() => {
        currentPanel = undefined;
      });
    }
  });

  // Command to add a file-based note from the current editor and line
  const addFileNoteDisposable = vscode.commands.registerCommand('code-notes.addFileNote', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('Click on a line in the editor to add a new file note.');
      return;
    }
	const document = editor.document;
	if (document.uri.scheme === 'untitled') {
		vscode.window.showInformationMessage('You must save the file before you can add notes to it.');
		return;
	}

    const filePath = editor.document.uri.fsPath;
    const lineNumber = editor.selection.active.line + 1; // 1-based line number

    const noteText = await vscode.window.showInputBox({ prompt: 'Enter note text' });
    if (!noteText) {
      return;
    }

    // Send a message to the webview to add this note if the panel is open
    if (currentPanel) {
		vscode.commands.executeCommand('code-notes.openNotesPanel');
    }
    // If panel not open, store in global state and open panel
    const notes = context.globalState.get('notes', []) as any[];
    const checklist = context.globalState.get('checklist', []) as any[];
    notes.push({ text: noteText, file: filePath, line: lineNumber });
    context.globalState.update('notes', notes);
    // Optionally open the panel
    vscode.commands.executeCommand('code-notes.openNotesPanel');
    
  });

  context.subscriptions.push(openPanelDisposable);
  context.subscriptions.push(addFileNoteDisposable);
}

export function deactivate() {}