const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3200;
const WEB_ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8'
};

function sendCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
}

function sumsubApiRequest(method, endpointPath, bodyStr, appToken, secret) {
  return new Promise((resolve, reject) => {
    const ts = Math.floor(Date.now() / 1000);
    const msg = ts + method.toUpperCase() + endpointPath + (bodyStr || '');
    const sig = crypto.createHmac('sha256', secret).update(msg).digest('hex');

    const options = {
      hostname: 'api.sumsub.com',
      port: 443,
      path: endpointPath,
      method: method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-App-Token': appToken,
        'X-App-Access-Sig': sig,
        'X-App-Access-Ts': ts.toString()
      }
    };

    if (bodyStr) {
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const req = https.request(options, (resp) => {
      let data = '';
      resp.on('data', chunk => { data += chunk; });
      resp.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch (e) { parsed = { raw: data }; }
        resolve({ status: resp.statusCode, body: parsed });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (bodyStr) {
      req.write(bodyStr);
    }
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  sendCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname.replace(/\/$/, '') || '/';

  // API Token Generation Endpoint
  if (pathname === '/api/token' || pathname === '/api/token.php' || pathname === '/api/unlock.php') {
    let payload = {};

    if (req.method === 'POST') {
      try {
        const bodyBuf = [];
        for await (const chunk of req) bodyBuf.push(chunk);
        const raw = Buffer.concat(bodyBuf).toString();
        payload = raw ? JSON.parse(raw) : {};
      } catch (e) {
        payload = {};
      }
    } else {
      payload = parsedUrl.query;
    }

    const appToken = (payload.appToken || '').trim();
    const secret = (payload.secret || '').trim();
    const levelName = (payload.levelName || 'id-and-liveness').trim();
    const action = (payload.action || 'create').trim();
    let userId = (payload.userId || '').trim();

    if (!appToken || !secret) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'App Token and Secret Key are required' }));
      return;
    }

    if (!userId) {
      const prefix = appToken.startsWith('sbx:') ? 'sbx_usr_' : 'prd_usr_';
      userId = prefix + crypto.randomBytes(4).toString('hex') + '_' + Date.now();
    }

    try {
      // 1. Create applicant if needed
      let applicantId = null;
      if (action === 'create') {
        const appRes = await sumsubApiRequest(
          'POST',
          `/resources/applicants?levelName=${encodeURIComponent(levelName)}`,
          JSON.stringify({ externalUserId: userId }),
          appToken,
          secret
        );
        if (appRes.status === 200 || appRes.status === 201) {
          applicantId = appRes.body.id || null;
        }
      }

      // 2. Access Token for in-page WebSDK
      const tokPath = `/resources/accessTokens?userId=${encodeURIComponent(userId)}&levelName=${encodeURIComponent(levelName)}`;
      const tokRes = await sumsubApiRequest('POST', tokPath, '', appToken, secret);
      const token = tokRes.body && tokRes.body.token ? tokRes.body.token : null;

      // 3. Hosted link for opening in fresh tab
      const linkPath = `/resources/sdkIntegrations/levels/${encodeURIComponent(levelName)}/websdkLink?ttlInSecs=3600&externalUserId=${encodeURIComponent(userId)}&lang=en`;
      const linkRes = await sumsubApiRequest('POST', linkPath, '{}', appToken, secret);
      const independentUrl = linkRes.body && linkRes.body.url ? linkRes.body.url : null;

      if (!token && !independentUrl) {
        const errMsg = (tokRes.body && tokRes.body.description) || 
                       (linkRes.body && linkRes.body.description) || 
                       'Sumsub token generation failed';
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: errMsg,
          details: tokRes.body || linkRes.body
        }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        token: token,
        userId: userId,
        applicantId: applicantId,
        independentUrl: independentUrl,
        levelName: levelName
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
    }
    return;
  }

  // Static File Serving
  let filePath = path.join(WEB_ROOT, parsedUrl.pathname);
  if (filePath.endsWith(path.sep) || fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Server Error');
      }
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`  AI CODEHELPER LOCAL DEV SERVER RUNNING`);
  console.log(`  - Local URL:   http://localhost:${PORT}/verifyss.html`);
  console.log(`  - Token API:   http://localhost:${PORT}/api/token`);
  console.log(`======================================================\n`);
});
