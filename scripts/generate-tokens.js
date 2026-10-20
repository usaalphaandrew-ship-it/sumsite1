/**
 * GitHub Actions Multi-Environment Token Generator for Sumsub
 * Generates fresh WebSDK access tokens & hosted verification links
 * across Sandbox and Production environments for 4 verification levels.
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const SANDBOX_APP_TOKEN = process.env.SUMSUB_APP_TOKEN;
const SANDBOX_SECRET = process.env.SUMSUB_SECRET;
const PROD_APP_TOKEN = process.env.SUMSUB_PROD_APP_TOKEN;
const PROD_SECRET = process.env.SUMSUB_PROD_SECRET;

const TTL_SECONDS = 86400; // 24 hours validity for each session

const LEVEL_CONFIGS = [
  {
    name: "developer-liveness-check",
    description: "Standard 3D biometric face liveness check (active selfie scan)",
    sbxCount: 40,
    prdCount: 40
  },
  {
    name: "id-and-liveness",
    description: "Verify applicant identity with an ID document and liveness check",
    sbxCount: 20,
    prdCount: 20
  },
  {
    name: "idv-and-phone-verification",
    description: "Verify applicant identity with ID document, SMS phone OTP, and liveness check",
    sbxCount: 20,
    prdCount: 20
  },
  {
    name: "id-only",
    description: "Verify applicant identity with only an ID document",
    sbxCount: 20,
    prdCount: 20
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
  const prefix = envName === "sandbox" ? "sbx_usr_" : "prd_usr_";
  const userId = prefix + crypto.randomBytes(6).toString("hex") + "_" + Date.now();

  // 1. Create applicant with site origin tracking
  const applicantPayload = JSON.stringify({
    externalUserId: userId,
    sourceKey: "aicodehelper.us",
    metadata: [
      { key: "Source", value: "aicodehelper.us" },
      { key: "InitiatedFrom", value: "https://aicodehelper.us/verifyss.html" },
      { key: "Domain", value: "aicodehelper.us" },
      { key: "Level", value: levelName },
      { key: "Environment", value: envName }
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
  console.log("Starting Sumsub multi-environment session generation...");
  const pool = [];

  // Sandbox Generation
  if (SANDBOX_APP_TOKEN && SANDBOX_SECRET) {
    console.log("\n=== Generating Sandbox Sessions (100 total) ===");
    for (const cfg of LEVEL_CONFIGS) {
      console.log(`Generating ${cfg.sbxCount} sessions for sandbox [${cfg.name}]...`);
      for (let i = 0; i < cfg.sbxCount; i++) {
        try {
          const session = await generateSingleSession("sandbox", SANDBOX_APP_TOKEN, SANDBOX_SECRET, cfg.name, cfg.description);
          if (session.token && session.independentUrl) {
            pool.push(session);
            process.stdout.write(".");
          }
        } catch (err) {
          console.error(`\n[Sandbox: ${cfg.name} #${i + 1}] Error:`, err.message);
        }
      }
      console.log("");
    }
  } else {
    console.warn("Notice: SUMSUB_APP_TOKEN or SUMSUB_SECRET not provided for Sandbox.");
  }

  // Production Generation
  if (PROD_APP_TOKEN && PROD_SECRET) {
    console.log("\n=== Generating Production Sessions (100 total) ===");
    for (const cfg of LEVEL_CONFIGS) {
      console.log(`Generating ${cfg.prdCount} sessions for production [${cfg.name}]...`);
      for (let i = 0; i < cfg.prdCount; i++) {
        try {
          const session = await generateSingleSession("production", PROD_APP_TOKEN, PROD_SECRET, cfg.name, cfg.description);
          if (session.token && session.independentUrl) {
            pool.push(session);
            process.stdout.write(".");
          }
        } catch (err) {
          console.error(`\n[Production: ${cfg.name} #${i + 1}] Error:`, err.message);
        }
      }
      console.log("");
    }
  } else {
    console.warn("Notice: SUMSUB_PROD_APP_TOKEN or SUMSUB_PROD_SECRET not provided for Production.");
  }

  console.log(`\nGeneration complete. Total sessions in pool: ${pool.length}`);

  const outputData = {
    updatedAt: new Date().toISOString(),
    activeCount: pool.length,
    ttlSeconds: TTL_SECONDS,
    levelsAvailable: LEVEL_CONFIGS.map(l => l.name),
    environments: ["sandbox", "production"],
    sessions: pool
  };

  const targetPath = path.join(__dirname, "..", "tokens.json");
  fs.writeFileSync(targetPath, JSON.stringify(outputData, null, 2), "utf8");
  console.log(`Saved ${pool.length} active sessions to ${targetPath}`);
}

main().catch(console.error);
