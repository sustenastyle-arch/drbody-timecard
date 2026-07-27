const API_INPUT = document.getElementById('apiRoot');
const messageEl = document.getElementById('message');
const employeeGrid = document.getElementById('employeeGrid');
const historyOutput = document.getElementById('historyOutput');
const historyTable = document.getElementById('historyTable');
const loadBackendButton = document.getElementById('loadBackend');
const downloadCsvButton = document.getElementById('downloadCsv');
const saveBackendAllButton = document.getElementById('saveBackendAll');
const filterFrom = document.getElementById('filterFrom');
const filterTo = document.getElementById('filterTo');
const periodFilter = document.getElementById('periodFilter');
const applyFilterButton = document.getElementById('applyFilter');
const resetFilterButton = document.getElementById('resetFilter');

const LOCAL_ENTRIES_KEY = 'drbody_timecard_entries';
const EMPLOYEES = [
  'Hiromi Tsunakawa', 'Yuki Tanaka', 'Yuka Nishi', 'Megumi Tezeni',
  'Mami Yamamoto', 'Betsy Maire', 'Aya Chong', 'Mai Marquez'
];
const ACTIONS = ['Time In', 'Time Out'];
const STATUS_LABELS = {
  'Time In': 'Working',
  'Time Out': 'Off Duty'
};

function loadLocalEntries() {
  try {
    const json = localStorage.getItem(LOCAL_ENTRIES_KEY);
    return json ? JSON.parse(json) : [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

function saveLocalEntries(entries) {
  localStorage.setItem(LOCAL_ENTRIES_KEY, JSON.stringify(entries));
}

function createEntry(employee, action) {
  return {
    employee,
    action,
    timestamp: new Date().toISOString()
  };
}

function formatTime(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function getCurrentState(entry) {
  if (!entry) return 'Not clocked';
  return STATUS_LABELS[entry.action] || entry.action;
}

function getStatusClass(entry) {
  if (!entry) return 'not-clocked';
  if (entry.action === 'Time In') return 'working';
  if (entry.action === 'Time Out') return 'off-duty';
  return 'not-clocked';
}

function isActionEnabled(latestAction, action) {
  if (!latestAction) {
    return action === 'Time In';
  }
  if (latestAction === 'Time In') {
    return action === 'Time Out';
  }
  if (latestAction === 'Time Out') {
    return action === 'Time In';
  }
  return action === 'Time In';
}

function renderGrid(entries) {
  const latestByEmployee = {};
  entries.forEach(entry => {
    latestByEmployee[entry.employee] = entry;
  });

  employeeGrid.innerHTML = EMPLOYEES.map(name => {
    const entry = latestByEmployee[name];
    const currentState = getCurrentState(entry);
    const timeLabel = entry ? ` @ ${formatTime(entry.timestamp)}` : '';
    const statusText = entry ? `${currentState}${timeLabel}` : currentState;
    const buttons = ACTIONS.map(action => {
      const disabled = !isActionEnabled(entry ? entry.action : null, action);
      return `<button data-employee="${name}" data-action="${action}" ${disabled ? 'disabled' : ''}>${action}</button>`;
    }).join('');

    const statusClass = getStatusClass(entry);
    return `
      <div class="card">
        <h3>${name}</h3>
        <p>Status: <strong class="status-text ${statusClass}">${statusText}</strong></p>
        <div class="button-row">
          ${buttons}
        </div>
      </div>
    `;
  }).join('');

  employeeGrid.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (btn.disabled) return;
      const employee = btn.dataset.employee;
      const action = btn.dataset.action;
      const entry = createEntry(employee, action);
      const entries = loadLocalEntries();
      entries.push(entry);
      saveLocalEntries(entries);
      updateHistory(entries);
      renderGrid(entries);
      renderHistory(entries);
      messageEl.textContent = 'Saved locally.';
      await sendToBackend(entry);
    });
  });
}

function getPeriodKey(timestamp) {
  const d = new Date(timestamp);
  const day = d.getDate();
  return day >= 1 && day <= 15 ? '1-15' : '16-end';
}

function applyFilters(entries) {
  return entries.filter(entry => {
    const ts = new Date(entry.timestamp);
    if (filterFrom.value) {
      const fromDate = new Date(filterFrom.value);
      fromDate.setHours(0,0,0,0);
      if (ts < fromDate) return false;
    }
    if (filterTo.value) {
      const toDate = new Date(filterTo.value);
      toDate.setHours(23,59,59,999);
      if (ts > toDate) return false;
    }
    const periodKey = getPeriodKey(entry.timestamp);
    if (periodFilter.value !== 'all' && periodFilter.value !== periodKey) return false;
    return true;
  });
}

function renderHistory(entries) {
  const indexed = entries.map((entry, index) => ({ entry, index }));
  const filtered = indexed.filter(item => applyFilters([item.entry]).length > 0 ? true : false);
  const rows = filtered.reverse();
  if (!rows.length) {
    historyTable.innerHTML = '<tr><td>No history entries found.</td></tr>';
  } else {
    historyTable.innerHTML = `
      <thead>
        <tr><th>Timestamp</th><th>Employee</th><th>Action</th><th>Period</th><th>Edit</th><th>Delete</th></tr>
      </thead>
      <tbody>
        ${rows.map(item => {
          return `<tr>
            <td>${formatTime(item.entry.timestamp)}</td>
            <td>${item.entry.employee}</td>
            <td>${item.entry.action}</td>
            <td>${getPeriodKey(item.entry.timestamp)}</td>
            <td><button data-index="${item.index}" class="edit-btn">Edit</button></td>
            <td><button data-index="${item.index}" class="delete-btn">Delete</button></td>
          </tr>`;
        }).join('')}
      </tbody>
    `;
    historyTable.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => editEntry(entries, Number(btn.dataset.index)));
    });
    historyTable.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteEntry(entries, Number(btn.dataset.index)));
    });
  }
  updateHistory(entries);
}

function updateHistory(entries) {
  const lines = entries.slice().reverse().map(entry => `${formatTime(entry.timestamp)} | ${entry.employee} | ${entry.action}`);
  historyOutput.textContent = lines.join('\n');
}

function editEntry(entries, index) {
  const entry = entries[index];
  if (!entry) return;
  const updatedEmployee = prompt('Employee name', entry.employee);
  if (updatedEmployee === null) return;
  const updatedAction = prompt('Action (Time In / Time Out)', entry.action);
  if (updatedAction === null) return;
  const updatedTimestamp = prompt('Timestamp (YYYY-MM-DDTHH:MM:SS)', entry.timestamp);
  if (updatedTimestamp === null) return;
  entry.employee = updatedEmployee.trim() || entry.employee;
  entry.action = updatedAction === 'Time Out' ? 'Time Out' : 'Time In';
  if (!isNaN(new Date(updatedTimestamp))) {
    entry.timestamp = new Date(updatedTimestamp).toISOString();
  }
  saveLocalEntries(entries);
  renderGrid(entries);
  renderHistory(entries);
  messageEl.textContent = 'Entry updated locally.';
}

function deleteEntry(entries, index) {
  if (!confirm('Delete this entry?')) return;
  entries.splice(index, 1);
  saveLocalEntries(entries);
  renderGrid(entries);
  renderHistory(entries);
  messageEl.textContent = 'Entry deleted locally.';
}

async function saveAllToBackend(entries) {
  const apiRoot = API_INPUT.value.trim();
  if (!apiRoot || apiRoot.includes('YOUR_NETLIFY_SITE')) {
    messageEl.textContent = 'Please set the backend URL.';
    return;
  }
  try {
    messageEl.textContent = 'Saving all entries to backend...';
    for (const entry of entries) {
      const res = await fetch(`${apiRoot}/save-timecard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry })
      });
      if (!res.ok) {
        throw new Error(`Save error: ${res.status}`);
      }
    }
    messageEl.textContent = 'All entries saved to backend.';
  } catch (error) {
    console.error(error);
    messageEl.textContent = 'Failed to save all entries to backend.';
  }
}

function downloadCsv(entries) {
  const header = ['timestamp', 'employee', 'action'];
  const rows = entries.map(e => [e.timestamp, e.employee, e.action].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  const csv = [header.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'timecard_entries.csv';
  a.click();
  URL.revokeObjectURL(url);
}

async function sendToBackend(entry) {
  const apiRoot = API_INPUT.value.trim();
  if (!apiRoot || apiRoot.includes('YOUR_NETLIFY_SITE')) {
    messageEl.textContent = 'Please set the backend URL.';
    return;
  }
  try {
    messageEl.textContent = 'Sending to backend...';
    const res = await fetch(`${apiRoot}/save-timecard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry })
    });
    if (!res.ok) {
      throw new Error(`Save error: ${res.status}`);
    }
    const result = await res.json();
    messageEl.textContent = 'Saved to backend.';
    return result;
  } catch (error) {
    console.error(error);
    messageEl.textContent = 'Backend save failed. Check the console.';
  }
}

async function loadBackendEntries() {
  const apiRoot = API_INPUT.value.trim();
  if (!apiRoot || apiRoot.includes('YOUR_NETLIFY_SITE')) {
    messageEl.textContent = 'Please set the backend URL.';
    return;
  }
  try {
    messageEl.textContent = 'Loading backend history...';
    const res = await fetch(`${apiRoot}/get-timecard`);
    if (!res.ok) {
      throw new Error(`Load error: ${res.status}`);
    }
    const result = await res.json();
    const entries = Array.isArray(result) ? result : result.entries || [];
    saveLocalEntries(entries);
    renderGrid(entries);
    renderHistory(entries);
    messageEl.textContent = 'Loaded backend history.';
  } catch (error) {
    console.error(error);
    messageEl.textContent = 'Failed to load backend history.';
  }
}

loadBackendButton.addEventListener('click', loadBackendEntries);
downloadCsvButton.addEventListener('click', () => {
  downloadCsv(applyFilters(loadLocalEntries()));
});
saveBackendAllButton.addEventListener('click', () => {
  saveAllToBackend(loadLocalEntries());
});
applyFilterButton.addEventListener('click', () => renderHistory(loadLocalEntries()));
resetFilterButton.addEventListener('click', () => {
  filterFrom.value = '';
  filterTo.value = '';
  periodFilter.value = 'all';
  renderHistory(loadLocalEntries());
});

const entries = loadLocalEntries();
renderGrid(entries);
renderHistory(entries);
messageEl.textContent = 'Showing local history. Set backend URL to sync with the server.';
