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
        flex-direction: row;
        height: 100vh;
        box-sizing: border-box;
      }
      .section {
        flex: 1;
        border-right: 1px solid #ddd;
        padding: 20px;
        box-sizing: border-box;
        overflow-y: auto;
      }
      .section:last-child {
        border-right: none;
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

      /* Content area for text and checkbox */
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

      /* Actions area for edit/delete buttons */
      .actions {
        display: flex;
        align-items: center;
        flex-shrink: 0;
        white-space: nowrap;
      }

      li input[type="checkbox"] {
        margin-top: 2px;
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
      .edit-container input[type="text"] {
        flex: 1;
        padding: 3px;
        margin-right: 5px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="section" id="notes-section">
        <h1>Notes</h1>
        <ul id="notes"></ul>
        <div class="add-note">
          <input type="text" id="newNote" placeholder="Type a new note..."/>
          <button id="addNoteBtn">Add</button>
        </div>
      </div>

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

      const notesList = document.getElementById('notes');
      const checklistList = document.getElementById('checklist');

      const addNoteBtn = document.getElementById('addNoteBtn');
      const newNoteInput = document.getElementById('newNote');

      const addChecklistBtn = document.getElementById('addChecklistBtn');
      const newChecklistInput = document.getElementById('newChecklistItem');
      const clearCompletedBtn = document.getElementById('clearCompletedBtn');

      renderNotes();
      renderChecklist();

      addNoteBtn.addEventListener('click', () => {
        const text = newNoteInput.value.trim();
        if (text) {
          notes.push({ text });
          newNoteInput.value = '';
          renderNotes();
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

      notesList.addEventListener('click', handleNotesClick);
      checklistList.addEventListener('click', handleChecklistClick);
      checklistList.addEventListener('change', handleChecklistChange);

      function handleNotesClick(event) {
        const target = event.target;
        const li = target.closest('li');
        if (!li) return;

        const index = parseInt(li.dataset.index, 10);

        if (target.classList.contains('edit-btn')) {
          startEditingNote(li, index);
        } else if (target.classList.contains('delete-btn')) {
          notes.splice(index, 1);
          renderNotes();
          saveAll();
        } else if (target.classList.contains('save-btn')) {
          const input = li.querySelector('input[type="text"]');
          const newText = input.value.trim();
          if (newText) {
            notes[index].text = newText;
          }
          renderNotes();
          saveAll();
        } else if (target.classList.contains('cancel-btn')) {
          renderNotes();
        }
      }

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

      function renderNotes() {
        notesList.innerHTML = '';
        notes.forEach((note, index) => {
          const li = document.createElement('li');
          li.dataset.index = index;

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
          notesList.appendChild(li);
        });
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

      function startEditingNote(li, index) {
        const note = notes[index];
        li.innerHTML = '';
        const editContainer = document.createElement('div');
        editContainer.className = 'edit-container';

        const input = document.createElement('input');
        input.type = 'text';
        input.value = note.text;

        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.className = 'save-btn';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.className = 'cancel-btn';

        editContainer.appendChild(input);
        editContainer.appendChild(saveBtn);
        editContainer.appendChild(cancelBtn);
        li.appendChild(editContainer);
      }

      function startEditingChecklistItem(li, index) {
        const item = checklist[index];
        li.innerHTML = '';
        const editContainer = document.createElement('div');
        editContainer.className = 'edit-container';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = item.checked;
        checkbox.disabled = true; // disabled during text edit

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
