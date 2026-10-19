/**
 * GitHub Actions Token Generator for Sumsub
 * Runs in GitHub Actions compute environment (server-to-server).
 * Generates 100 fresh WebSDK tokens and hosted links across all configured levels.
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const SANDBOX_APP_TOKEN = process.env.SUMSUB_APP_TOKEN;
const SANDBOX_SECRET = process.env.SUMSUB_SECRET;
const TTL_SECONDS = 86400; // 24 hours validity for each session

if (!SANDBOX_APP_TOKEN || !SANDBOX_SECRET) {
  console.error("Error: SUMSUB_APP_TOKEN and SUMSUB_SECRET environment variables must be provided.");
  process.exit(1);
}

// Configured Verification Levels and daily allocation (Total = 100 sessions)
const LEVEL_CONFIGS = [
  {
    name: "developer-liveness-check",
    description: "Liveness Check Only (Quick Face Scan)",
    count: 40
  },
  {
    name: "id-and-liveness",
    description: "ID Document & Liveness Check",
    count: 20
  },
  {
    name: "idv-and-phone-verification",
    description: "ID Document + Phone/SMS + Liveness Check",
    count: 20
  },
  {
    name: "id-only",
    description: "ID Document Confirmation Only",
    count: 20
  }
];

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

async function generateSingleSession(envName, appToken, secret, levelName, levelDescription) {
  const userId = (appToken.startsWith("sbx:") ? "sbx_usr_" : "prd_usr_") +
    crypto.randomBytes(4).toString("hex") + "_" + Date.now();

  // 1. Create applicant with site origin tracking
  const applicantPayload = JSON.stringify({
    externalUserId: userId,
    sourceKey: "aicodehelper.us",
    metadata: [
      { key: "Source", value: "aicodehelper.us" },
      { key: "InitiatedFrom", value: "https://aicodehelper.us/verifyss.html" },
      { key: "Domain", value: "aicodehelper.us" },
      { key: "Level", value: levelName }
    ]
  });

  const appRes = await requestSumsub(
    "POST",
    `/resources/applicants?levelName=${encodeURIComponent(levelName)}`,
    applicantPayload,
    appToken,
    secret
  );
  const applicantId = appRes.id || null;

  // 2. Generate SDK Token (24 hours TTL)
  const tokRes = await requestSumsub(
    "POST",
    `/resources/accessTokens?userId=${encodeURIComponent(userId)}&levelName=${encodeURIComponent(levelName)}&ttlInSecs=${TTL_SECONDS}`,
    "",
    appToken,
    secret
  );
  const token = tokRes.token || null;

  // 3. Generate Hosted Link (24 hours TTL)
  const linkRes = await requestSumsub(
    "POST",
    `/resources/sdkIntegrations/levels/${encodeURIComponent(levelName)}/websdkLink?ttlInSecs=${TTL_SECONDS}&externalUserId=${encodeURIComponent(userId)}&lang=en`,
    "{}",
    appToken,
    secret
  );
  const independentUrl = linkRes.url || null;

  return {
    userId,
    applicantId,
    levelName,
    levelDescription,
    token,
    independentUrl,
    generatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + TTL_SECONDS * 1000).toISOString(),
    env: envName
  };
}

async function main() {
  console.log("Generating 100 Sumsub sessions partitioned by verification levels...");

  const pool = [];

  for (const cfg of LEVEL_CONFIGS) {
    console.log(`\nGenerating ${cfg.count} sessions for level: "${cfg.name}"...`);
    for (let i = 0; i < cfg.count; i++) {
      try {
        const session = await generateSingleSession("sandbox", SANDBOX_APP_TOKEN, SANDBOX_SECRET, cfg.name, cfg.description);
        if (session.token && session.independentUrl) {
          pool.push(session);
          process.stdout.write(".");
        }
      } catch (err) {
        console.error(`\n[${cfg.name} #${i + 1}] Error:`, err.message);
      }
    }
  }

  console.log(`\n\nTotal generated: ${pool.length} sessions.`);

  const outputData = {
    updatedAt: new Date().toISOString(),
    activeCount: pool.length,
    ttlSeconds: TTL_SECONDS,
    levelsAvailable: LEVEL_CONFIGS.map(l => l.name),
    sessions: pool
  };

  const targetPath = path.join(__dirname, "..", "tokens.json");
  fs.writeFileSync(targetPath, JSON.stringify(outputData, null, 2), "utf8");
  console.log(`Saved ${pool.length} active sessions to ${targetPath}`);
}

main().catch(console.error);
