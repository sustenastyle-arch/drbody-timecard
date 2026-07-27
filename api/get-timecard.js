const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;
const GITHUB_FILEPATH = process.env.GITHUB_FILEPATH || 'timecard/history.json';

const headers = {
  Authorization: `token ${GITHUB_TOKEN}`,
  'User-Agent': 'timecard-persistence',
  Accept: 'application/vnd.github.v3+json'
};

function buildCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS, GET, POST'
  };
}

async function fetchFile() {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${encodeURIComponent(GITHUB_FILEPATH)}`;
  const res = await fetch(url, { headers });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub fetch failed: ${res.status}`);
  return res.json();
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, buildCorsHeaders());
    res.end();
    return;
  }

  if (!GITHUB_TOKEN || !GITHUB_REPO) {
    res.writeHead(500, buildCorsHeaders());
    res.end(JSON.stringify({ error: 'GITHUB_TOKEN or GITHUB_REPO is not configured' }));
    return;
  }

  if (req.method !== 'GET') {
    res.writeHead(405, buildCorsHeaders());
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const file = await fetchFile();
    if (!file) {
      res.writeHead(200, buildCorsHeaders());
      res.end(JSON.stringify([]));
      return;
    }
    const decoded = Buffer.from(file.content, 'base64').toString('utf-8');
    const entries = JSON.parse(decoded);
    res.writeHead(200, buildCorsHeaders());
    res.end(JSON.stringify(entries));
  } catch (error) {
    res.writeHead(500, buildCorsHeaders());
    res.end(JSON.stringify({ error: error.message }));
  }
};