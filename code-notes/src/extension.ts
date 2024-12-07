import * as vscode from 'vscode';
import { getWebviewContent } from './webviewContent';

let currentPanel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
	const disposable = vscode.commands.registerCommand('code-notes.openNotesPanel', () => {
	  if (currentPanel) {
		// If the panel is currently open, dispose it (close it)
		currentPanel.dispose();
	  } else {
		// No panel open, create a new one
		currentPanel = vscode.window.createWebviewPanel(
		  'myNotes',
		  'My Code Notes',
		  vscode.ViewColumn.Beside,
		  {
			enableScripts: true,
			retainContextWhenHidden: true
		  }
		);
  
		// Restore previous state
		const notes = context.globalState.get('notes', []) as any[];
		const checklist = context.globalState.get('checklist', []) as any[];
	
		currentPanel.webview.html = getWebviewContent({ notes, checklist });
	
		// Handle messages from the webview
		currentPanel.webview.onDidReceiveMessage((message) => {
		  if (message.command === 'saveNotes') {
			context.globalState.update('notes', message.notes);
			context.globalState.update('checklist', message.checklist);
		  }
		});

		// Clean up when the panel is closed by the user
		currentPanel.onDidDispose(() => {
			currentPanel = undefined;
		});
	  }
	});
  
	context.subscriptions.push(disposable);
  }
  
  export function deactivate() {}