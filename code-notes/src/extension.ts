import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	console.log('Code notes is now active!');

	const disposable = vscode.commands.registerCommand('code-notes.openNotesPanel', () => {
		
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
