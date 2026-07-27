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

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const file = await fetchFile();
    if (!file) {
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify([])
      };
    }
    const decoded = Buffer.from(file.content, 'base64').toString('utf-8');
    const entries = JSON.parse(decoded);
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify(entries)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: error.message })
    };
  }
};
