export function getWebviewContent(data: { notes: any[], checklist: any[] }): string {
	// Simple test content to ensure toggling works
	return /* html */`
	<!DOCTYPE html>
	<html lang="en">
	<head><meta charset="UTF-8"></head>
	<body>
	  <h1>My Notes</h1>
	  <p>Open/close this panel with Ctrl+Shift+N</p>
	</body>
	</html>
	`;
  }