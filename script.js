const API_INPUT = document.getElementById('apiRoot');
const messageEl = document.getElementById('message');
const employeeGrid = document.getElementById('employeeGrid');
const historyOutput = document.getElementById('historyOutput');
let currentView = 'staff';

const DEFAULT_API_ROOT = (window.location.protocol === 'http:' || window.location.protocol === 'https:')
  ? `${window.location.origin}/api`
  : '';

function getApiRoot() {
  const apiRoot = API_INPUT.value.trim();
  if (apiRoot && !apiRoot.includes('YOUR_NETLIFY_SITE')) {
    return apiRoot;
  }
  return DEFAULT_API_ROOT;
}

function isBackendAvailable() {
  return !!getApiRoot();
}

const historyTable = document.getElementById('historyTable');
const loadBackendButton = document.getElementById('loadBackend');
const downloadCsvButton = document.getElementById('downloadCsv');
const saveBackendAllButton = document.getElementById('saveBackendAll');
const adminSyncMessage = document.getElementById('adminSyncMessage');
const exportFrom = document.getElementById('exportFrom');
const exportTo = document.getElementById('exportTo');
const filterFrom = document.getElementById('filterFrom');
const filterTo = document.getElementById('filterTo');
const applyFilterButton = document.getElementById('applyFilter');
const resetFilterButton = document.getElementById('resetFilter');
const showStaffView = document.getElementById('showStaffView');
const showAdminView = document.getElementById('showAdminView');
const staffSection = document.getElementById('staffSection');
const adminSection = document.getElementById('adminSection');
const adminLoginSection = document.getElementById('adminLoginSection');
const adminPanel = document.getElementById('adminPanel');
const staffManagementSection = document.getElementById('staffManagementSection');
const toggleStaffManagementButton = document.getElementById('toggleStaffManagement');
const adminLoginButton = document.getElementById('adminLoginButton');
const adminLogoutButton = document.getElementById('adminLogoutButton');
const adminLoginHint = document.getElementById('adminLoginHint');
const ADMIN_PASSWORD_KEY = 'drbody_timecard_admin_password';
const FIXED_ADMIN_PASSWORD = 'drbodytimes2019';
let isAdminAuthenticated = false;
const EMPLOYEES_KEY = 'drbody_timecard_employees';
const LOCAL_ENTRIES_KEY = 'drbody_timecard_entries';
const PENDING_ENTRIES_KEY = 'drbody_timecard_pending_entries';
const employeeList = document.getElementById('employeeList');
const newEmployeeName = document.getElementById('newEmployeeName');
const addEmployeeButton = document.getElementById('addEmployeeButton');
const adminPasswordInput = document.getElementById('adminPasswordInput');
const editEntryModal = document.getElementById('editEntryModal');
const editEmployeeInput = document.getElementById('editEmployeeInput');
const editActionSelect = document.getElementById('editActionSelect');
const editTimestampInput = document.getElementById('editTimestampInput');
const saveEditEntryButton = document.getElementById('saveEditEntryButton');
const cancelEditEntryButton = document.getElementById('cancelEditEntryButton');
let editingEntryIndex = null;

const ACTION_CLOCK_IN = 'Clock In';
const ACTION_CLOCK_OUT = 'Clock Out';
const LEGACY_ACTION_CLOCK_IN = 'Time In';
const LEGACY_ACTION_CLOCK_OUT = 'Time Out';

const DEFAULT_EMPLOYEES = [
  'Hiromi Tsunakawa', 'Yuki Tanaka', 'Yuka Nishi', 'Megumi Tezeni',
  'Mami Yamamoto', 'Betsy Maire', 'Aya Chong', 'Mai Marquez'
];
const ACTIONS = [ACTION_CLOCK_IN, ACTION_CLOCK_OUT];
const STATUS_LABELS = {
  [ACTION_CLOCK_IN]: 'Clocked In',
  [ACTION_CLOCK_OUT]: 'Clocked Out'
};
const BACKEND_SYNC_INTERVAL_MS = 20000;
const STAFF_NAME_STYLES = {
  'Hiromi Tsunakawa': { bg: '#fb923c', fg: '#111827' },
  'Yuki Tanaka': { bg: '#dc2626', fg: '#ffffff' },
  'Megumi Tezeni': { bg: '#a855f7', fg: '#ffffff' },
  'Betsy Maire': { bg: '#facc15', fg: '#111827' },
  'Aya Chong': { bg: '#92400e', fg: '#ffffff' },
  'Mai Marquez': { bg: '#16a34a', fg: '#ffffff' },
  'Yuka Nishi': { bg: '#84cc16', fg: '#111827' },
  'Mami Yamamoto': { bg: '#2563eb', fg: '#ffffff' }
};

function normalizeAction(action) {
  if (action === LEGACY_ACTION_CLOCK_IN) return ACTION_CLOCK_IN;
  if (action === LEGACY_ACTION_CLOCK_OUT) return ACTION_CLOCK_OUT;
  if (action === ACTION_CLOCK_IN || action === ACTION_CLOCK_OUT) return action;
  return ACTION_CLOCK_IN;
}

function isClockIn(action) {
  return normalizeAction(action) === ACTION_CLOCK_IN;
}

function isClockOut(action) {
  return normalizeAction(action) === ACTION_CLOCK_OUT;
}

function displayAction(action) {
  return normalizeAction(action);
}

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

function entryKey(entry) {
  if (!entry) return '';
  if (entry.id) return `id:${entry.id}`;
  return `legacy:${entry.employee || ''}|${entry.action || ''}|${entry.timestamp || ''}`;
}

function loadPendingEntries() {
  try {
    const json = localStorage.getItem(PENDING_ENTRIES_KEY);
    return json ? JSON.parse(json) : [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

function savePendingEntries(entries) {
  localStorage.setItem(PENDING_ENTRIES_KEY, JSON.stringify(entries));
}

function mergeUniqueEntries(primary, secondary) {
  const merged = [];
  const seen = new Set();
  [...primary, ...secondary].forEach(entry => {
    const key = entryKey(entry);
    if (!key || seen.has(key)) return;
    seen.add(key);
    merged.push(entry);
  });
  return merged.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

function loadAdminPassword() {
  return localStorage.getItem(ADMIN_PASSWORD_KEY) || FIXED_ADMIN_PASSWORD;
}

function saveAdminPassword(password) {
  localStorage.setItem(ADMIN_PASSWORD_KEY, password);
}

function enforceAdminPassword() {
  if (localStorage.getItem(ADMIN_PASSWORD_KEY) !== FIXED_ADMIN_PASSWORD) {
    saveAdminPassword(FIXED_ADMIN_PASSWORD);
  }
}

function verifyAdminPassword() {
  if (!isAdminAuthenticated) {
    alert('Please sign in as admin first.');
    return false;
  }
  return true;
}

function loadEmployees() {
  try {
    const json = localStorage.getItem(EMPLOYEES_KEY);
    return json ? JSON.parse(json) : DEFAULT_EMPLOYEES.slice();
  } catch (error) {
    console.error(error);
    return DEFAULT_EMPLOYEES.slice();
  }
}

function saveEmployees(employees) {
  localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
}

function getSafeFilterValue(filterElement) {
  return filterElement && filterElement.value ? filterElement.value : '';
}

function setAdminSyncMessage(text, isError = false) {
  if (!adminSyncMessage) return;
  adminSyncMessage.textContent = text || '';
  adminSyncMessage.style.color = isError ? '#b91c1c' : '#475569';
}

function updateAdminLoginState() {
  if (isAdminAuthenticated) {
    adminPanel.classList.remove('hidden');
    staffManagementSection.classList.remove('hidden');
    toggleStaffManagementButton.textContent = 'Hide Staff Management';
    adminLogoutButton.classList.remove('hidden');
    adminLoginButton.classList.add('hidden');
    adminPasswordInput.disabled = true;
    adminLoginHint.textContent = 'Admin mode active. You can edit history and manage staff.';
  } else {
    adminPanel.classList.add('hidden');
    staffManagementSection.classList.add('hidden');
    toggleStaffManagementButton.textContent = 'Show Staff Management';
    adminLogoutButton.classList.add('hidden');
    adminLoginButton.classList.remove('hidden');
    adminPasswordInput.disabled = false;
    adminLoginHint.textContent = 'Enter the admin password and click Sign In.';
  }
}

function handleAdminLogin() {
  const input = adminPasswordInput.value.trim();
  if (input === loadAdminPassword()) {
    isAdminAuthenticated = true;
    updateAdminLoginState();
    renderHistory(loadLocalEntries(), currentView === 'admin' && isAdminAuthenticated);
    messageEl.textContent = 'Admin signed in.';
    adminPasswordInput.value = '';
  } else {
    alert('Admin password does not match.');
    messageEl.textContent = 'Admin sign-in failed.';
  }
}

function handleAdminLogout() {
  isAdminAuthenticated = false;
  updateAdminLoginState();
  renderHistory(loadLocalEntries(), currentView === 'admin' && isAdminAuthenticated);
  messageEl.textContent = 'Admin signed out.';
}

function tryAdminLoginWithEnter(event) {
  const isEnter = event.key === 'Enter' || event.code === 'Enter' || event.keyCode === 13;
  if (!isEnter) return;
  if (isAdminAuthenticated) return;
  if (event.isComposing) return;
  event.preventDefault();
  handleAdminLogin();
}

function toggleStaffManagement() {
  const isHidden = staffManagementSection.classList.toggle('hidden');
  toggleStaffManagementButton.textContent = isHidden ? 'Show Staff Management' : 'Hide Staff Management';
}

function createEntry(employee, action) {
  return {
    id: (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    employee,
    action: normalizeAction(action),
    timestamp: new Date().toISOString()
  };
}

function queuePendingEntry(entry) {
  const pending = loadPendingEntries();
  const key = entryKey(entry);
  if (!pending.some(item => entryKey(item) === key)) {
    pending.push(entry);
    savePendingEntries(pending);
  }
}

function removePendingEntry(entry) {
  const key = entryKey(entry);
  const pending = loadPendingEntries().filter(item => entryKey(item) !== key);
  savePendingEntries(pending);
}

async function postEntryToBackend(apiRoot, entry) {
  const res = await fetch(`${apiRoot}/save-timecard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entry })
  });
  if (!res.ok) {
    throw new Error(`Save error: ${res.status}`);
  }
  return res.json();
}

async function flushPendingEntries(options = {}) {
  const silent = !!options.silent;
  const apiRoot = getApiRoot();
  if (!apiRoot) return;

  const pending = loadPendingEntries();
  if (!pending.length) return;

  let sentCount = 0;
  for (const entry of pending) {
    try {
      await postEntryToBackend(apiRoot, entry);
      removePendingEntry(entry);
      sentCount += 1;
    } catch (error) {
      console.error(error);
      if (!silent) {
        messageEl.textContent = 'Some pending entries could not be synced yet. They will retry automatically.';
      }
      return;
    }
  }

  if (!silent && sentCount > 0) {
    messageEl.textContent = `Synced ${sentCount} pending entries.`;
  }
}

function formatTime(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getCurrentState(entry) {
  if (!entry) return 'Not clocked';
  return STATUS_LABELS[normalizeAction(entry.action)] || normalizeAction(entry.action);
}

function getStatusClass(entry) {
  if (!entry) return 'not-clocked';
  if (isClockIn(entry.action)) return 'clocked-in';
  if (isClockOut(entry.action)) return 'clocked-out';
  return 'not-clocked';
}

function getStaffNameInlineStyle(name) {
  const style = STAFF_NAME_STYLES[name];
  if (!style) return '';
  return `background:${style.bg};color:${style.fg};`;
}

function isActionEnabled(latestAction, action) {
  const normalizedLatestAction = normalizeAction(latestAction);
  const normalizedAction = normalizeAction(action);
  if (!latestAction) {
    return normalizedAction === ACTION_CLOCK_IN;
  }
  if (normalizedLatestAction === ACTION_CLOCK_IN) {
    return normalizedAction === ACTION_CLOCK_OUT;
  }
  if (normalizedLatestAction === ACTION_CLOCK_OUT) {
    return normalizedAction === ACTION_CLOCK_IN;
  }
  return normalizedAction === ACTION_CLOCK_IN;
}

function renderGrid(entries) {
  if (messageEl) messageEl.textContent = '';
  const employees = loadEmployees();
  const latestByEmployee = {};
  entries.forEach(entry => {
    latestByEmployee[entry.employee] = entry;
  });

  employeeGrid.innerHTML = employees.map(name => {
    const entry = latestByEmployee[name];
    const currentState = getCurrentState(entry);
    const timeLabel = entry ? ` @ ${formatTime(entry.timestamp)}` : '';
    const statusText = entry ? `${currentState}${timeLabel}` : currentState;
    const statusClass = getStatusClass(entry);
    const nameStyle = getStaffNameInlineStyle(name);
    const buttons = ACTIONS.map(action => {
      const disabled = !isActionEnabled(entry ? entry.action : null, action);
      return `<button data-employee="${name}" data-action="${action}" ${disabled ? 'disabled' : ''}>${action}</button>`;
    }).join('');

    return `
      <div class="card">
        <h3 class="staff-name" style="${nameStyle}">${name}</h3>
        <p>State: <strong class="status-text ${statusClass}">${statusText}</strong></p>
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
      renderHistory(entries, currentView === 'admin');
      messageEl.textContent = 'Saved locally.';
      await sendToBackend(entry);
    });
  });
}

function applyFilters(entries) {
  const fromValue = getSafeFilterValue(filterFrom);
  const toValue = getSafeFilterValue(filterTo);
  return entries.filter(entry => {
    const ts = new Date(entry.timestamp);
    if (fromValue) {
      const fromDate = new Date(fromValue);
      fromDate.setHours(0,0,0,0);
      if (ts < fromDate) return false;
    }
    if (toValue) {
      const toDate = new Date(toValue);
      toDate.setHours(23,59,59,999);
      if (ts > toDate) return false;
    }
    return true;
  });
}

function renderHistory(entries, showAdminActions = false) {
  const indexed = entries.map((entry, index) => ({ entry, index }));
  const filtered = indexed.filter(item => applyFilters([item.entry]).length > 0 ? true : false);
  const rows = filtered.reverse();
  if (!rows.length) {
    historyTable.innerHTML = '<tr><td>No history entries found.</td></tr>';
  } else {
    const header = showAdminActions
      ? '<tr><th>Timestamp</th><th>Employee</th><th>Action</th><th>Edit</th><th>Delete</th></tr>'
      : '<tr><th>Timestamp</th><th>Employee</th><th>Action</th></tr>';
    historyTable.innerHTML = `
      <thead>
        ${header}
      </thead>
      <tbody>
        ${rows.map(item => {
          if (showAdminActions) {
            return `<tr>
              <td>${formatTime(item.entry.timestamp)}</td>
              <td>${item.entry.employee}</td>
              <td>${displayAction(item.entry.action)}</td>
              <td><button data-index="${item.index}" class="edit-btn">Edit</button></td>
              <td><button data-index="${item.index}" class="delete-btn">Delete</button></td>
            </tr>`;
          }
          return `<tr>
            <td>${formatTime(item.entry.timestamp)}</td>
            <td>${item.entry.employee}</td>
            <td>${displayAction(item.entry.action)}</td>
          </tr>`;
        }).join('')}
      </tbody>
    `;

    if (showAdminActions) {
      historyTable.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => editEntry(entries, Number(btn.dataset.index)));
      });
      historyTable.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteEntry(entries, Number(btn.dataset.index)));
      });
    }
  }
  updateHistory(entries);
}

function updateHistory(entries) {
  const lines = entries.slice().reverse().map(entry => `${formatTime(entry.timestamp)} | ${entry.employee} | ${displayAction(entry.action)}`);
  historyOutput.textContent = lines.join('\n');
}

function toDateTimeLocalValue(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

function openEditEntryModal(entry, index) {
  editingEntryIndex = index;
  editEmployeeInput.value = entry.employee || '';
  editActionSelect.value = normalizeAction(entry.action);
  editTimestampInput.value = toDateTimeLocalValue(entry.timestamp);
  editEntryModal.classList.remove('hidden');
  editEntryModal.setAttribute('aria-hidden', 'false');
}

function closeEditEntryModal() {
  editingEntryIndex = null;
  editEntryModal.classList.add('hidden');
  editEntryModal.setAttribute('aria-hidden', 'true');
}

async function saveEditEntryFromModal() {
  if (editingEntryIndex === null || editingEntryIndex < 0) {
    closeEditEntryModal();
    return;
  }
  const employee = editEmployeeInput.value.trim();
  const action = normalizeAction(editActionSelect.value);
  const tsText = editTimestampInput.value;
  const ts = new Date(tsText);
  if (!employee) {
    alert('Please enter an employee name.');
    return;
  }
  if (isNaN(ts)) {
    alert('Please enter a valid timestamp.');
    return;
  }
  const entries = loadLocalEntries();
  const entry = entries[editingEntryIndex];
  if (!entry) {
    closeEditEntryModal();
    return;
  }
  entry.employee = employee;
  entry.action = action;
  entry.timestamp = ts.toISOString();
  saveLocalEntries(entries);
  renderGrid(entries);
  renderHistory(entries, currentView === 'admin' && isAdminAuthenticated);
  messageEl.textContent = 'Entry updated locally. Syncing backend...';
  await saveAllToBackend(entries, { silent: true });
  closeEditEntryModal();
}

function editEntry(entries, index) {
  if (!verifyAdminPassword()) {
    messageEl.textContent = 'Admin password required to edit entry.';
    return;
  }
  const entry = entries[index];
  if (!entry) return;
  openEditEntryModal(entry, index);
}

async function deleteEntry(entries, index) {
  if (!verifyAdminPassword()) {
    messageEl.textContent = 'Admin password required to delete entry.';
    return;
  }
  if (!confirm('Delete this entry?')) return;
  entries.splice(index, 1);
  saveLocalEntries(entries);
  renderGrid(entries);
  renderHistory(entries, currentView === 'admin' && isAdminAuthenticated);
  messageEl.textContent = 'Entry deleted locally. Syncing backend...';
  await saveAllToBackend(entries, { silent: true });
}

async function saveAllToBackend(entries, options = {}) {
  const silent = !!options.silent;
  const apiRoot = getApiRoot();
  if (!apiRoot) {
    messageEl.textContent = 'Please set the backend URL.';
    if (!silent) {
      setAdminSyncMessage('Backend URL is not set.', true);
    }
    return;
  }
  try {
    messageEl.textContent = 'Saving all entries to backend...';
    if (!silent) {
      setAdminSyncMessage('Saving all entries...');
    }

    // Load backend first, then merge to avoid overwriting entries from other devices.
    const getRes = await fetch(`${apiRoot}/get-timecard`);
    if (!getRes.ok) {
      throw new Error(`Load error: ${getRes.status}`);
    }
    const getResult = await getRes.json();
    const backendEntries = Array.isArray(getResult) ? getResult : (getResult.entries || []);
    const mergedEntries = mergeUniqueEntries(backendEntries, entries);

    const res = await fetch(`${apiRoot}/save-timecard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'replace', entries: mergedEntries })
    });
    if (!res.ok) {
      throw new Error(`Save error: ${res.status}`);
    }
    messageEl.textContent = 'All entries saved to backend.';
    if (!silent) {
      setAdminSyncMessage('All entries saved (merged).');
    }
  } catch (error) {
    console.error(error);
    messageEl.textContent = 'Failed to save all entries to backend.';
    if (!silent) {
      setAdminSyncMessage('Save failed. Please try again.', true);
    }
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

function parseRangeBound(value, isEnd = false) {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date)) return null;
  if (isEnd) {
    date.setHours(23, 59, 59, 999);
  } else {
    date.setHours(0, 0, 0, 0);
  }
  return date;
}

function filterEntriesByRange(entries, fromValue, toValue) {
  const fromDate = parseRangeBound(fromValue, false);
  const toDate = parseRangeBound(toValue, true);
  return entries.filter(entry => {
    const ts = new Date(entry.timestamp);
    if (fromDate && ts < fromDate) return false;
    if (toDate && ts > toDate) return false;
    return true;
  });
}

function toLocalDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function toDateLabel(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const weekdayNames = ['日', '月', '火', '水', '木', '金', '土'];
  return `${month}/${day}(${weekdayNames[date.getDay()]})`;
}

function toHoursDecimal(ms) {
  return Math.round((ms / 3600000) * 100) / 100;
}

function toHourMinuteText(ms) {
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

function toHourMinuteClock(ms) {
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}`;
}

function addDurationByDay(start, end, weekdayMs, workedDates, dailyMsByDate) {
  let cursor = new Date(start);
  while (cursor < end) {
    const nextDay = new Date(cursor);
    nextDay.setHours(24, 0, 0, 0);
    const segmentEnd = end < nextDay ? end : nextDay;
    const segmentMs = segmentEnd - cursor;
    if (segmentMs > 0) {
      const dayIndex = cursor.getDay();
      const dayKey = toLocalDateKey(cursor);
      weekdayMs[dayIndex] += segmentMs;
      workedDates.add(dayKey);
      dailyMsByDate[dayKey] = (dailyMsByDate[dayKey] || 0) + segmentMs;
    }
    cursor = segmentEnd;
  }
}

function buildDateKeysInRange(fromValue, toValue, entries) {
  const fromDate = parseRangeBound(fromValue, false);
  const toDate = parseRangeBound(toValue, true);
  let start = fromDate;
  let end = toDate;

  if (!start || !end) {
    const validDates = entries
      .map(entry => new Date(entry.timestamp))
      .filter(date => !isNaN(date))
      .sort((a, b) => a - b);
    if (!validDates.length) return [];
    if (!start) {
      start = new Date(validDates[0]);
      start.setHours(0, 0, 0, 0);
    }
    if (!end) {
      end = new Date(validDates[validDates.length - 1]);
      end.setHours(23, 59, 59, 999);
    }
  }

  const dates = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);

  while (cursor <= endDay) {
    dates.push(toLocalDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function buildSummary(entries, fromValue, toValue) {
  const rangeEntries = filterEntriesByRange(entries, fromValue, toValue);
  const rangeDateKeys = buildDateKeysInRange(fromValue, toValue, rangeEntries);
  const byEmployee = {};
  const employees = loadEmployees();
  employees.forEach(name => {
    byEmployee[name] = [];
  });
  rangeEntries.forEach(entry => {
    if (!byEmployee[entry.employee]) {
      byEmployee[entry.employee] = [];
    }
    byEmployee[entry.employee].push(entry);
  });

  const summary = [];
  Object.keys(byEmployee).forEach(name => {
    const records = byEmployee[name].slice().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const weekdayMs = [0, 0, 0, 0, 0, 0, 0];
    const workedDates = new Set();
    const dailyMsByDate = {};
    rangeDateKeys.forEach(dateKey => {
      dailyMsByDate[dateKey] = 0;
    });
    let lastIn = null;

    for (const record of records) {
      const ts = new Date(record.timestamp);
      if (isNaN(ts)) continue;
      const action = normalizeAction(record.action);
      if (action === ACTION_CLOCK_IN) {
        lastIn = ts;
      } else if (action === ACTION_CLOCK_OUT && lastIn) {
        if (ts > lastIn) {
          addDurationByDay(lastIn, ts, weekdayMs, workedDates, dailyMsByDate);
        }
        lastIn = null;
      }
    }

    const totalMilliseconds = weekdayMs.reduce((sum, ms) => sum + ms, 0);
    summary.push({
      employee: name,
      daysWorked: workedDates.size,
      workedDates: Array.from(workedDates).sort(),
      workedDateLabels: Array.from(workedDates).sort().map(toDateLabel),
      dailyMsByDate,
      sunHours: toHoursDecimal(weekdayMs[0]),
      monHours: toHoursDecimal(weekdayMs[1]),
      tueHours: toHoursDecimal(weekdayMs[2]),
      wedHours: toHoursDecimal(weekdayMs[3]),
      thuHours: toHoursDecimal(weekdayMs[4]),
      friHours: toHoursDecimal(weekdayMs[5]),
      satHours: toHoursDecimal(weekdayMs[6]),
      totalMilliseconds,
      totalHoursDecimal: toHoursDecimal(totalMilliseconds),
      totalText: toHourMinuteText(totalMilliseconds)
    });
  });
  return { summary, rangeDateKeys };
}

function downloadSummaryCsv(entries, fromValue, toValue) {
  const { summary, rangeDateKeys } = buildSummary(entries, fromValue, toValue);
  const dateHeaders = rangeDateKeys.map(toDateLabel);
  const rows = summary.map(item => {
    const row = { employee: item.employee };
    rangeDateKeys.forEach((dateKey, idx) => {
      row[dateHeaders[idx]] = toHourMinuteClock(item.dailyMsByDate[dateKey] || 0);
    });
    row.total_hour = toHourMinuteClock(item.totalMilliseconds || 0);
    return row;
  });

  if (typeof XLSX !== 'undefined' && XLSX.utils) {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Summary');
    XLSX.writeFile(workbook, 'timecard_summary.xlsx');
    if (messageEl) {
      messageEl.textContent = 'Summary Excel exported.';
    }
    return;
  }

  // Fallback: export CSV if XLSX library is unavailable.
  const header = ['employee', ...dateHeaders, 'total_hour'];
  const csvRows = summary.map(item => {
    const values = [
      item.employee,
      ...rangeDateKeys.map(dateKey => toHourMinuteClock(item.dailyMsByDate[dateKey] || 0)),
      toHourMinuteClock(item.totalMilliseconds || 0)
    ];
    return values.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
  });
  const csv = [header.join(','), ...csvRows].join('\n');
  const csvWithBom = `\uFEFF${csv}`;
  const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'timecard_summary.csv';
  a.click();
  URL.revokeObjectURL(url);
  if (messageEl) {
    messageEl.textContent = 'Summary CSV exported (Excel library not loaded).';
  }
}

async function sendToBackend(entry) {
  const apiRoot = getApiRoot();
  if (!apiRoot) {
    messageEl.textContent = 'No backend available. Use local storage or deploy to a backend host.';
    return;
  }
  try {
    messageEl.textContent = 'Sending to backend...';
    const result = await postEntryToBackend(apiRoot, entry);
    removePendingEntry(entry);
    messageEl.textContent = 'Saved to backend.';
    return result;
  } catch (error) {
    console.error(error);
    queuePendingEntry(entry);
    messageEl.textContent = 'Saved locally. Backend sync will retry automatically.';
  }
}

async function loadBackendEntries(options = {}) {
  const silent = !!options.silent;
  const apiRoot = getApiRoot();
  if (!apiRoot) {
    if (!silent) {
      messageEl.textContent = 'No backend available. This works only on a deployed site with API support.';
    }
    return;
  }
  try {
    if (!silent) {
      messageEl.textContent = 'Loading backend history...';
    }
    const res = await fetch(`${apiRoot}/get-timecard`);
    if (!res.ok) {
      throw new Error(`Load error: ${res.status}`);
    }
    const result = await res.json();
    const backendEntries = Array.isArray(result) ? result : result.entries || [];
    const pendingEntries = loadPendingEntries();
    const mergedEntries = mergeUniqueEntries(backendEntries, pendingEntries);
    saveLocalEntries(mergedEntries);
    renderGrid(mergedEntries);
    renderHistory(mergedEntries, currentView === 'admin' && isAdminAuthenticated);
    await flushPendingEntries({ silent: true });
    if (!silent) {
      messageEl.textContent = 'Loaded backend history.';
    }
  } catch (error) {
    console.error(error);
    if (!silent) {
      messageEl.textContent = 'Failed to load backend history.';
    }
  }
}

let backendSyncTimer = null;

function startBackendAutoSync() {
  if (!isBackendAvailable()) return;
  if (backendSyncTimer) return;

  backendSyncTimer = setInterval(() => {
    loadBackendEntries({ silent: true });
  }, BACKEND_SYNC_INTERVAL_MS);
}

function syncNowSilent() {
  if (!isBackendAvailable()) return;
  loadBackendEntries({ silent: true });
}

loadBackendButton.addEventListener('click', loadBackendEntries);
downloadCsvButton.addEventListener('click', () => {
  downloadSummaryCsv(loadLocalEntries(), exportFrom ? exportFrom.value : '', exportTo ? exportTo.value : '');
});
saveBackendAllButton.addEventListener('click', () => {
  saveAllToBackend(loadLocalEntries(), { silent: false });
});
if (toggleStaffManagementButton) {
  toggleStaffManagementButton.addEventListener('click', toggleStaffManagement);
}
if (applyFilterButton) {
  applyFilterButton.addEventListener('click', () => renderHistory(loadLocalEntries(), currentView === 'admin' && isAdminAuthenticated));
}
if (resetFilterButton) {
  resetFilterButton.addEventListener('click', () => {
    if (filterFrom) filterFrom.value = '';
    if (filterTo) filterTo.value = '';
    renderHistory(loadLocalEntries(), currentView === 'admin' && isAdminAuthenticated);
  });
}

addEmployeeButton.addEventListener('click', addEmployee);
adminLoginButton.addEventListener('click', handleAdminLogin);
adminLogoutButton.addEventListener('click', handleAdminLogout);
if (adminPasswordInput) {
  adminPasswordInput.addEventListener('keydown', tryAdminLoginWithEnter);
}
if (adminSection) {
  adminSection.addEventListener('keydown', event => {
    if (document.activeElement === adminPasswordInput) {
      tryAdminLoginWithEnter(event);
    }
  });
}
showStaffView.addEventListener('click', () => setView('staff'));
showAdminView.addEventListener('click', () => setView('admin'));
if (saveEditEntryButton) {
  saveEditEntryButton.addEventListener('click', saveEditEntryFromModal);
}
if (cancelEditEntryButton) {
  cancelEditEntryButton.addEventListener('click', closeEditEntryModal);
}

function setView(view) {
  currentView = view;
  if (view === 'staff') {
    staffSection.classList.remove('hidden');
    adminSection.classList.add('hidden');
    showStaffView.classList.add('active');
    showAdminView.classList.remove('active');
  } else {
    staffSection.classList.add('hidden');
    adminSection.classList.remove('hidden');
    showStaffView.classList.remove('active');
    showAdminView.classList.add('active');
  }
  updateAdminLoginState();
  renderHistory(loadLocalEntries(), currentView === 'admin' && isAdminAuthenticated);
}

function renderEmployeeManagement() {
  const employees = loadEmployees();
  if (!employees.length) {
    employeeList.innerHTML = '<p>No employees registered.</p>';
    return;
  }
  employeeList.innerHTML = employees.map(name => `
    <div class="employee-item">
      <span>${name}</span>
      <button class="remove-employee-btn" data-employee="${name}">Remove</button>
    </div>
  `).join('');

  employeeList.querySelectorAll('.remove-employee-btn').forEach(btn => {
    btn.addEventListener('click', () => removeEmployee(btn.dataset.employee));
  });
}

function addEmployee() {
  const name = newEmployeeName.value.trim();
  if (!name) {
    alert('Please enter an employee name.');
    return;
  }
  const employees = loadEmployees();
  if (employees.includes(name)) {
    alert('This employee is already registered.');
    return;
  }
  employees.push(name);
  saveEmployees(employees);
  newEmployeeName.value = '';
  renderGrid(loadLocalEntries());
  renderEmployeeManagement();
  messageEl.textContent = `${name} added.`;
}

function removeEmployee(name) {
  if (!confirm(`Remove ${name} from employee list?`)) return;
  const employees = loadEmployees().filter(item => item !== name);
  saveEmployees(employees);
  renderGrid(loadLocalEntries());
  renderHistory(loadLocalEntries(), currentView === 'admin' && isAdminAuthenticated);
  renderEmployeeManagement();
  messageEl.textContent = `${name} removed.`;
}

if (DEFAULT_API_ROOT && !API_INPUT.value.trim()) {
  API_INPUT.value = DEFAULT_API_ROOT;
}
const entries = loadLocalEntries();
enforceAdminPassword();
renderGrid(entries);
updateAdminLoginState();
renderHistory(entries, currentView === 'admin' && isAdminAuthenticated);
renderEmployeeManagement();
messageEl.textContent = '';
setView('staff');

if (isBackendAvailable()) {
  loadBackendEntries({ silent: true });
  startBackendAutoSync();
}

window.addEventListener('online', () => {
  flushPendingEntries({ silent: true });
  syncNowSilent();
});

window.addEventListener('focus', syncNowSilent);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    syncNowSilent();
  }
});
