const API_INPUT = document.getElementById('apiRoot');
const messageEl = document.getElementById('message');
const employeeGrid = document.getElementById('employeeGrid');
const historyOutput = document.getElementById('historyOutput');
const loadBackendButton = document.getElementById('loadBackend');
const downloadCsvButton = document.getElementById('downloadCsv');

const LOCAL_ENTRIES_KEY = 'drbody_timecard_entries';
const EMPLOYEES = [
  'Hiromi Tsunakawa', 'Yuki Tanaka', 'Yuka Nishi', 'Megumi Tezeni',
  'Mami Yamamoto', 'Betsy Maire', 'Aya Chong', 'Mai Marquez'
];

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

function renderGrid(entries) {
  const latestByEmployee = {};
  entries.forEach(entry => {
    latestByEmployee[entry.employee] = entry;
  });

  employeeGrid.innerHTML = EMPLOYEES.map(name => {
    const entry = latestByEmployee[name];
    const status = entry ? `${entry.action} @ ${formatTime(entry.timestamp)}` : '未打刻';
    return `
      <div class="card">
        <h3>${name}</h3>
        <p>状態: <strong>${status}</strong></p>
        <button data-employee="${name}" data-action="Clock In">Clock In</button>
        <button class="secondary" data-employee="${name}" data-action="Clock Out">Clock Out</button>
      </div>
    `;
  }).join('');

  employeeGrid.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', async () => {
      const employee = btn.dataset.employee;
      const action = btn.dataset.action;
      const entry = createEntry(employee, action);
      const entries = loadLocalEntries();
      entries.push(entry);
      saveLocalEntries(entries);
      updateHistory(entries);
      renderGrid(entries);
      messageEl.textContent = 'ローカルに保存しました。';
      await sendToBackend(entry);
    });
  });
}

function updateHistory(entries) {
  const lines = entries.slice().reverse().map(entry => `${formatTime(entry.timestamp)} | ${entry.employee} | ${entry.action}`);
  historyOutput.textContent = lines.join('\n');
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
    messageEl.textContent = 'バックエンド URL を設定してください。';
    return;
  }
  try {
    messageEl.textContent = 'バックエンドに送信中...';
    const res = await fetch(`${apiRoot}/save-timecard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry })
    });
    if (!res.ok) {
      throw new Error(`保存エラー: ${res.status}`);
    }
    const result = await res.json();
    messageEl.textContent = 'バックエンドに保存しました。';
    return result;
  } catch (error) {
    console.error(error);
    messageEl.textContent = 'バックエンド保存に失敗しました。コンソールを確認してください。';
  }
}

async function loadBackendEntries() {
  const apiRoot = API_INPUT.value.trim();
  if (!apiRoot || apiRoot.includes('YOUR_NETLIFY_SITE')) {
    messageEl.textContent = 'バックエンド URL を設定してください。';
    return;
  }
  try {
    messageEl.textContent = 'バックエンドから読み込み中...';
    const res = await fetch(`${apiRoot}/get-timecard`);
    if (!res.ok) {
      throw new Error(`読み込みエラー: ${res.status}`);
    }
    const result = await res.json();
    const entries = Array.isArray(result) ? result : result.entries || [];
    saveLocalEntries(entries);
    renderGrid(entries);
    updateHistory(entries);
    messageEl.textContent = 'バックエンド履歴を読み込みました。';
  } catch (error) {
    console.error(error);
    messageEl.textContent = 'バックエンド読み込みに失敗しました。';
  }
}

loadBackendButton.addEventListener('click', loadBackendEntries);
downloadCsvButton.addEventListener('click', () => {
  downloadCsv(loadLocalEntries());
});

const entries = loadLocalEntries();
renderGrid(entries);
updateHistory(entries);
messageEl.textContent = 'ローカル履歴を表示しています。バックエンド URL を設定すると同期できます。';
