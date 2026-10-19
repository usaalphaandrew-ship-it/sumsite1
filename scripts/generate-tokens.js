/**
 * GitHub Actions Token Generator for Sumsub
 * Runs in GitHub Actions compute environment (server-to-server).
 * Generates fresh WebSDK tokens and independent hosted links.
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const SANDBOX_APP_TOKEN = process.env.SUMSUB_APP_TOKEN || "sbx:BKA7AQ2qVXmUDA5jotdRDI64.EfyFMXXuVGAK7UdDHnE4ru5ceWLAoOD1";
const SANDBOX_SECRET = process.env.SUMSUB_SECRET || "zKUClqxeeWBPpiyyUzutSr8tXBrEA9In";
const LEVEL_NAME = process.env.SUMSUB_LEVEL || "id-and-liveness";

async function signSumsub(method, pathStr, bodyStr, secret) {
  const ts = Math.floor(Date.now() / 1000);
  const dataToSign = ts + method.toUpperCase() + pathStr + (bodyStr || "");
  const sig = crypto.createHmac("sha256", secret).update(dataToSign).digest("hex");
  return { ts, sig };
}

async function requestSumsub(method, pathStr, bodyStr, appToken, secret) {
  const { ts, sig } = await signSumsub(method, pathStr, bodyStr, secret);
  const headers = {
    "Accept": "application/json",
    "X-App-Token": appToken,
    "X-App-Access-Sig": sig,
    "X-App-Access-Ts": ts.toString(),
  };
  if (bodyStr) headers["Content-Type"] = "application/json";

  const res = await fetch("https://api.sumsub.com" + pathStr, {
    method: method,
    headers: headers,
    body: bodyStr || undefined,
  });
  return await res.json();
}

async function generateSingleSession(envName, appToken, secret, level) {
  const userId = (appToken.startsWith("sbx:") ? "sbx_usr_" : "prd_usr_") +
    crypto.randomBytes(4).toString("hex") + "_" + Date.now();

  // 1. Create applicant
  const appRes = await requestSumsub(
    "POST",
    `/resources/applicants?levelName=${encodeURIComponent(level)}`,
    JSON.stringify({ externalUserId: userId }),
    appToken,
    secret
  );
  const applicantId = appRes.id || null;

  // 2. Generate SDK Token (for in-page 16:9 canvas WebSDK)
  const tokRes = await requestSumsub(
    "POST",
    `/resources/accessTokens?userId=${encodeURIComponent(userId)}&levelName=${encodeURIComponent(level)}&ttlInSecs=7200`,
    "",
    appToken,
    secret
  );
  const token = tokRes.token || null;

  // 3. Generate Hosted Link (for independent new tab)
  const linkRes = await requestSumsub(
    "POST",
    `/resources/sdkIntegrations/levels/${encodeURIComponent(level)}/websdkLink?ttlInSecs=7200&externalUserId=${encodeURIComponent(userId)}&lang=en`,
    "{}",
    appToken,
    secret
  );
  const independentUrl = linkRes.url || null;

  return {
    userId,
    applicantId,
    token,
    independentUrl,
    generatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7200 * 1000).toISOString(),
    env: envName
  };
}

async function main() {
  console.log("Generating fresh Sumsub session pool via GitHub Actions...");

  const pool = [];

  // Generate 3 fresh Sandbox sessions
  for (let i = 0; i < 3; i++) {
    try {
      const session = await generateSingleSession("sandbox", SANDBOX_APP_TOKEN, SANDBOX_SECRET, LEVEL_NAME);
      if (session.token && session.independentUrl) {
        pool.push(session);
        console.log(`[Sandbox #${i + 1}] Generated token and hosted link successfully.`);
      }
    } catch (err) {
      console.error(`[Sandbox #${i + 1}] Error:`, err.message);
    }
  }

  const outputData = {
    updatedAt: new Date().toISOString(),
    activeCount: pool.length,
    sessions: pool
  };

  const targetPath = path.join(__dirname, "..", "tokens.json");
  fs.writeFileSync(targetPath, JSON.stringify(outputData, null, 2), "utf8");
  console.log(`Saved ${pool.length} active sessions to ${targetPath}`);
}

main().catch(console.error);
