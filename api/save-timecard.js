const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_FILEPATH = process.env.GITHUB_FILEPATH || 'timecard/history.json';

const headers = {
  Authorization: `token ${GITHUB_TOKEN}`,
  'User-Agent': 'timecard-persistence',
  Accept: 'application/vnd.github.v3+json'
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'OPTIONS, GET, POST'
};

async function fetchFile() {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${encodeURIComponent(GITHUB_FILEPATH)}`;
  const res = await fetch(url, { headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub fetch failed: ${res.status}`);
  return res.json();
}

async function updateFile(content, sha) {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${encodeURIComponent(GITHUB_FILEPATH)}`;
  const body = {
    message: 'Update timecard history',
    content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'),
    committer: { name: 'timecard-bot', email: 'timecard@local' }
  };
  if (sha) body.sha = sha;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      ...headers,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`GitHub update failed: ${res.status}`);
  return res.json();
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    res.writeHead(500, CORS_HEADERS);
    res.end(JSON.stringify({ error: 'GITHUB_TOKEN or GITHUB_REPO is not configured' }));
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, CORS_HEADERS);
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  let payload;
  try {
    payload = JSON.parse(req.body);
  } catch (error) {
    res.writeHead(400, CORS_HEADERS);
    res.end(JSON.stringify({ error: 'Invalid JSON' }));
    return;
  }

  try {
    const file = await fetchFile();
    let entries = [];
    let sha = null;
    if (file) {
      sha = file.sha;
      const decoded = Buffer.from(file.content, 'base64').toString('utf-8');
      entries = JSON.parse(decoded);
      if (!Array.isArray(entries)) entries = [];
    }

    if (payload.mode === 'replace') {
      const incoming = Array.isArray(payload.entries) ? payload.entries : null;
      if (!incoming) {
        res.writeHead(400, CORS_HEADERS);
        res.end(JSON.stringify({ error: 'Missing entries array for replace mode' }));
        return;
      }
      const validEntries = incoming.filter(entry => entry && entry.employee && entry.action && entry.timestamp);
      await updateFile(validEntries, sha);
      res.writeHead(200, CORS_HEADERS);
      res.end(JSON.stringify({ success: true, mode: 'replace', count: validEntries.length }));
      return;
    }

    const entry = payload.entry;
    if (!entry || !entry.employee || !entry.action || !entry.timestamp) {
      res.writeHead(400, CORS_HEADERS);
      res.end(JSON.stringify({ error: 'Missing entry data' }));
      return;
    }

    entries.push(entry);
    await updateFile(entries, sha);
    res.writeHead(200, CORS_HEADERS);
    res.end(JSON.stringify({ success: true, entry }));
  } catch (error) {
    res.writeHead(500, CORS_HEADERS);
    res.end(JSON.stringify({ error: error.message }));
  }
};