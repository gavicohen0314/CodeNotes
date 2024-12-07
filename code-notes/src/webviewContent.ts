export function getWebviewContent(data: { notes: any[], checklist: any[] }): string {
  const initialData = JSON.stringify(data);
  return /* html */`
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <style>
      body {
        font-family: sans-serif;
        margin: 0; padding: 0;
        background: #f4f4f4;
        color: #333;
      }
      .container {
        display: flex;
        flex-direction: column;
        height: 100vh;
        box-sizing: border-box;
      }
      .section {
        padding: 20px;
        box-sizing: border-box;
        overflow-y: auto;
      }
      .section:not(:first-child) {
        border-top: 1px solid #ddd;
      }
      h1 {
        margin-top: 0;
      }
      ul {
        list-style: none;
        padding-left: 0;
        margin: 0;
      }
      li {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 5px;
        background: #fff;
        padding: 5px;
        border-radius: 4px;
      }
      li.completed .content span {
        text-decoration: line-through;
        opacity: 0.6;
      }

      .content {
        display: flex;
        align-items: flex-start;
        flex: 1;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .content span {
        flex: 1;
        margin-left: 5px;
      }

      .actions {
        display: flex;
        align-items: center;
        flex-shrink: 0;
        white-space: nowrap;
      }

      li button {
        margin-left: 5px;
        background: #eee;
        border: none;
        padding: 2px 5px;
        cursor: pointer;
        border-radius: 3px;
        white-space: nowrap;
      }
      li button:hover {
        background: #ddd;
      }

      .add-note, .add-checklist {
        display: flex;
        margin-top: 10px;
      }
      .add-note input, .add-checklist input {
        flex: 1;
        padding: 5px;
        font-size: 14px;
        margin-right: 5px;
        border: 1px solid #ccc;
        border-radius: 3px;
      }
      .add-note button, .add-checklist button {
        padding: 5px 10px;
        font-size: 14px;
        cursor: pointer;
        border: none;
        background: #3a8ee6;
        color: #fff;
        border-radius: 3px;
      }
      .add-note button:hover, .add-checklist button:hover {
        background: #337acc;
      }
      .actions-panel {
        margin-top: 10px;
      }
      .actions-panel button {
        background: #e63a3a;
        color: #fff;
        border: none;
        padding: 5px 10px;
        border-radius: 3px;
        cursor: pointer;
      }
      .actions-panel button:hover {
        background: #cc3333;
      }

      .edit-container {
        display: flex;
        align-items: center;
        flex: 1;
      }
      .edit-container input[type="text"], .edit-container input[type="number"] {
        padding: 3px;
        margin-right: 5px;
      }
      .file-section {
        margin-top: 20px;
      }
      .file-section h2 {
        margin-top: 0;
      }
      .line-label {
        font-weight: bold;
        margin-right: 5px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <!-- My Notes (no file/line association) -->
      <div class="section" id="my-notes-section">
        <h1>My Notes</h1>
        <ul id="myNotes"></ul>
        <div class="add-note">
          <input type="text" id="newMyNote" placeholder="Type a new personal note..."/>
          <button id="addMyNoteBtn">Add</button>
        </div>
      </div>

      <!-- File-based Notes -->
      <div class="section" id="notes-section">
        <h1>File Notes</h1>
        <div id="fileNotesContainer"></div>
      </div>

      <!-- Checklist -->
      <div class="section" id="checklist-section">
        <h1>Checklist</h1>
        <ul id="checklist"></ul>
        <div class="add-checklist">
          <input type="text" id="newChecklistItem" placeholder="Add a checklist item..."/>
          <button id="addChecklistBtn">Add</button>
        </div>
        <div class="actions-panel">
          <button id="clearCompletedBtn">Clear Completed</button>
        </div>
      </div>
    </div>

    <script>
      const vscode = acquireVsCodeApi();
      let { notes, checklist } = ${initialData};

      const myNotesList = document.getElementById('myNotes');
      const fileNotesContainer = document.getElementById('fileNotesContainer');
      const checklistList = document.getElementById('checklist');

      const addMyNoteBtn = document.getElementById('addMyNoteBtn');
      const newMyNoteInput = document.getElementById('newMyNote');

      const addChecklistBtn = document.getElementById('addChecklistBtn');
      const newChecklistInput = document.getElementById('newChecklistItem');
      const clearCompletedBtn = document.getElementById('clearCompletedBtn');

      addMyNoteBtn.addEventListener('click', () => {
        const text = newMyNoteInput.value.trim();
        if (text) {
          // My Notes have no file/line
          notes.push({ text });
          newMyNoteInput.value = '';
          renderAll();
          saveAll();
        }
      });

      addChecklistBtn.addEventListener('click', () => {
        const text = newChecklistInput.value.trim();
        if (text) {
          checklist.push({ text, checked: false });
          newChecklistInput.value = '';
          renderChecklist();
          saveAll();
        }
      });

      clearCompletedBtn.addEventListener('click', () => {
        checklist = checklist.filter(item => !item.checked);
        renderChecklist();
        saveAll();
      });

      myNotesList.addEventListener('click', handleMyNotesClick);
      fileNotesContainer.addEventListener('click', handleFileNotesClick);
      checklistList.addEventListener('click', handleChecklistClick);
      checklistList.addEventListener('change', handleChecklistChange);

      window.addEventListener('message', event => {
        const message = event.data;
        if (message.command === 'updateData') {
          notes = message.notes;
          checklist = message.checklist;
          renderAll();
        }
      });

      renderAll();

      function renderAll() {
        renderMyNotes();
        renderFileNotes();
        renderChecklist();
      }

      function renderMyNotes() {
        myNotesList.innerHTML = '';
        // My Notes are those without file/line
        const myNotes = notes.filter(n => !n.file && !n.line);
        myNotes.forEach((note, indexInMyNotes) => {
          // Need global index to manage edits/deletions
          const globalIndex = notes.indexOf(note);

          const li = document.createElement('li');
          li.dataset.index = globalIndex;

          const contentDiv = document.createElement('div');
          contentDiv.className = 'content';

          const actionsDiv = document.createElement('div');
          actionsDiv.className = 'actions';

          const textSpan = document.createElement('span');
          textSpan.textContent = note.text;

          const editBtn = document.createElement('button');
          editBtn.textContent = 'Edit';
          editBtn.className = 'edit-btn';

          const deleteBtn = document.createElement('button');
          deleteBtn.textContent = 'Delete';
          deleteBtn.className = 'delete-btn';

          contentDiv.appendChild(textSpan);
          actionsDiv.appendChild(editBtn);
          actionsDiv.appendChild(deleteBtn);

          li.appendChild(contentDiv);
          li.appendChild(actionsDiv);
          myNotesList.appendChild(li);
        });
      }

      function renderFileNotes() {
        fileNotesContainer.innerHTML = '';

        // File notes have file and line
        const fileNotes = notes.filter(n => n.file && typeof n.line === 'number');
        const notesByFile = {};
        fileNotes.forEach((note) => {
          if (!notesByFile[note.file]) {
            notesByFile[note.file] = [];
          }
          notesByFile[note.file].push(note);
        });

        for (const file in notesByFile) {
          const fileSection = document.createElement('div');
          fileSection.className = 'file-section';

          const fileHeading = document.createElement('h2');
          fileHeading.textContent = file;
          fileSection.appendChild(fileHeading);

          const ul = document.createElement('ul');
          notesByFile[file].forEach((note) => {
            const globalIndex = notes.indexOf(note);

            const li = document.createElement('li');
            li.dataset.index = globalIndex.toString();

            const contentDiv = document.createElement('div');
            contentDiv.className = 'content';

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'actions';

            const lineSpan = document.createElement('span');
            lineSpan.innerHTML = '<span class="line-label">Line:</span> ' + note.line;

            const textSpan = document.createElement('span');
            textSpan.textContent = note.text;

            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit';
            editBtn.className = 'edit-btn';

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Delete';
            deleteBtn.className = 'delete-btn';

            const goToLineBtn = document.createElement('button');
            goToLineBtn.textContent = 'Go to Line';
            goToLineBtn.className = 'goto-line-btn';

            contentDiv.appendChild(lineSpan);
            contentDiv.appendChild(textSpan);
            actionsDiv.appendChild(editBtn);
            actionsDiv.appendChild(deleteBtn);
            actionsDiv.appendChild(goToLineBtn);

            li.appendChild(contentDiv);
            li.appendChild(actionsDiv);
            ul.appendChild(li);
          });

          fileSection.appendChild(ul);
          fileNotesContainer.appendChild(fileSection);
        }
      }

      function renderChecklist() {
        checklistList.innerHTML = '';
        checklist.forEach((item, index) => {
          const li = document.createElement('li');
          li.dataset.index = index;
          li.className = item.checked ? 'completed' : '';

          const contentDiv = document.createElement('div');
          contentDiv.className = 'content';

          const actionsDiv = document.createElement('div');
          actionsDiv.className = 'actions';

          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.checked = item.checked;
          checkbox.dataset.index = index;

          const textSpan = document.createElement('span');
          textSpan.textContent = item.text;

          const editBtn = document.createElement('button');
          editBtn.textContent = 'Edit';
          editBtn.className = 'edit-btn';

          const deleteBtn = document.createElement('button');
          deleteBtn.textContent = 'Delete';
          deleteBtn.className = 'delete-btn';

          contentDiv.appendChild(checkbox);
          contentDiv.appendChild(textSpan);
          actionsDiv.appendChild(editBtn);
          actionsDiv.appendChild(deleteBtn);

          li.appendChild(contentDiv);
          li.appendChild(actionsDiv);
          checklistList.appendChild(li);
        });
      }

      // Handling my notes (no file/line)
      function handleMyNotesClick(event) {
        const target = event.target;
        const li = target.closest('li');
        if (!li) return;
        const index = parseInt(li.dataset.index, 10);

        if (target.classList.contains('edit-btn')) {
          startEditingMyNote(li, index);
        } else if (target.classList.contains('delete-btn')) {
          notes.splice(index, 1);
          renderAll();
          saveAll();
        } else if (target.classList.contains('save-btn')) {
          const input = li.querySelector('input[type="text"]');
          const newText = input.value.trim();
          if (newText) {
            notes[index].text = newText;
          }
          renderAll();
          saveAll();
        } else if (target.classList.contains('cancel-btn')) {
          renderAll();
        }
      }

      function startEditingMyNote(li, index) {
        const note = notes[index];
        li.innerHTML = '';
        const editContainer = document.createElement('div');
        editContainer.className = 'edit-container';

        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.value = note.text;

        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.className = 'save-btn';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.className = 'cancel-btn';

        editContainer.appendChild(textInput);
        editContainer.appendChild(saveBtn);
        editContainer.appendChild(cancelBtn);
        li.appendChild(editContainer);
      }

      // Handling file notes
      function handleFileNotesClick(event) {
        const target = event.target;
        const li = target.closest('li');
        if (!li) return;
        const index = parseInt(li.dataset.index, 10);
        const note = notes[index];

        if (target.classList.contains('edit-btn')) {
          startEditingFileNote(li, index);
        } else if (target.classList.contains('delete-btn')) {
          notes.splice(index, 1);
          renderAll();
          saveAll();
        } else if (target.classList.contains('save-btn')) {
          const textInput = li.querySelector('input[type="text"]');
          const newText = textInput.value.trim();
          if (newText) {
            notes[index].text = newText;
            // File and line are not editable now, so leave them as is
          }
          renderAll();
          saveAll();
        } else if (target.classList.contains('cancel-btn')) {
          renderAll();
        } else if (target.classList.contains('goto-line-btn')) {
          if (note && note.file && note.line) {
            vscode.postMessage({ command: 'goToLine', file: note.file, line: note.line });
          }
        }
      }

      function startEditingFileNote(li, index) {
        const note = notes[index];
        li.innerHTML = '';
        const editContainer = document.createElement('div');
        editContainer.className = 'edit-container';

        // We do NOT allow editing file/line now, only text
        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.value = note.text;

        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.className = 'save-btn';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.className = 'cancel-btn';

        editContainer.appendChild(textInput);
        editContainer.appendChild(saveBtn);
        editContainer.appendChild(cancelBtn);
        li.appendChild(editContainer);
      }

      // Handling checklist
      function handleChecklistClick(event) {
        const target = event.target;
        const li = target.closest('li');
        if (!li) return;

        const index = parseInt(li.dataset.index, 10);

        if (target.classList.contains('edit-btn')) {
          startEditingChecklistItem(li, index);
        } else if (target.classList.contains('delete-btn')) {
          checklist.splice(index, 1);
          renderChecklist();
          saveAll();
        } else if (target.classList.contains('save-btn')) {
          const input = li.querySelector('input[type="text"]');
          const newText = input.value.trim();
          if (newText) {
            checklist[index].text = newText;
          }
          renderChecklist();
          saveAll();
        } else if (target.classList.contains('cancel-btn')) {
          renderChecklist();
        }
      }

      function handleChecklistChange(event) {
        const target = event.target;
        if (target.type === 'checkbox') {
          const li = target.closest('li');
          const index = parseInt(li.dataset.index, 10);
          checklist[index].checked = target.checked;
          renderChecklist();
          saveAll();
        }
      }

      function startEditingChecklistItem(li, index) {
        const item = checklist[index];
        li.innerHTML = '';
        const editContainer = document.createElement('div');
        editContainer.className = 'edit-container';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = item.checked;
        checkbox.disabled = true;

        const input = document.createElement('input');
        input.type = 'text';
        input.value = item.text;

        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.className = 'save-btn';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.className = 'cancel-btn';

        editContainer.appendChild(checkbox);
        editContainer.appendChild(input);
        editContainer.appendChild(saveBtn);
        editContainer.appendChild(cancelBtn);
        li.appendChild(editContainer);
      }

      function saveAll() {
        vscode.postMessage({ command: 'saveNotes', notes, checklist });
      }
    </script>
  </body>
  </html>
  `;
}
