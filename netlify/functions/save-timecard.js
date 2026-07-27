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

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'GITHUB_TOKEN or GITHUB_REPO is not configured' })
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Invalid JSON' })
    };
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
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: 'Missing entries array for replace mode' })
        };
      }
      const validEntries = incoming.filter(entry => entry && entry.employee && entry.action && entry.timestamp);
      await updateFile(validEntries, sha);
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: true, mode: 'replace', count: validEntries.length })
      };
    }

    const entry = payload.entry;
    if (!entry || !entry.employee || !entry.action || !entry.timestamp) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Missing entry data' })
      };
    }

    entries.push(entry);
    await updateFile(entries, sha);
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true, entry })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error.message })
    };
  }
};
