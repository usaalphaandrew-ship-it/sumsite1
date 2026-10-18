/**
 * Cloudflare Worker for Sumsub Dynamic Token & Hosted Link Signing
 * Deploy this on Cloudflare Workers (100% free tier: 100,000 req/day).
 * Once deployed, paste your worker URL (e.g., https://sumsub.yourname.workers.dev)
 * into "API Host URL" in verifyss.html on GitHub Pages!
 */

export default {
  async fetch(request, env) {
    // 1. Handle CORS Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
        },
      });
    }

    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/$/, "");

    if (pathname !== "/api/token" && pathname !== "/api/token.php") {
      return new Response(JSON.stringify({ error: "Endpoint not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    let payload = {};
    if (request.method === "POST") {
      try {
        payload = await request.json();
      } catch (e) {
        payload = {};
      }
    } else {
      payload = Object.fromEntries(url.searchParams);
    }

    const appToken = (payload.appToken || "").trim();
    const secret = (payload.secret || "").trim();
    const levelName = (payload.levelName || "id-and-liveness").trim();
    const action = (payload.action || "create").trim();
    let userId = (payload.userId || "").trim();

    if (!appToken || !secret) {
      return new Response(JSON.stringify({ error: "App Token and Secret are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    if (!userId) {
      const prefix = appToken.startsWith("sbx:") ? "sbx_usr_" : "prd_usr_";
      userId = prefix + Math.random().toString(36).substring(2, 10) + "_" + Date.now();
    }

    // Helper: HMAC SHA-256 Signature Generator
    async function signSumsub(method, path, bodyStr) {
      const ts = Math.floor(Date.now() / 1000);
      const dataToSign = ts + method.toUpperCase() + path + (bodyStr || "");
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(dataToSign));
      const sigHex = Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      return { ts, sig: sigHex };
    }

    try {
      // 1. Create applicant if needed
      let applicantId = null;
      if (action === "create") {
        const appPath = `/resources/applicants?levelName=${encodeURIComponent(levelName)}`;
        const appBody = JSON.stringify({ externalUserId: userId });
        const { ts, sig } = await signSumsub("POST", appPath, appBody);
        const appRes = await fetch("https://api.sumsub.com" + appPath, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-App-Token": appToken,
            "X-App-Access-Sig": sig,
            "X-App-Access-Ts": ts.toString(),
          },
          body: appBody,
        });
        const appData = await appRes.json();
        applicantId = appData.id || null;
      }

      // 2. Generate SDK Access Token (for 16:9 canvas WebSDK)
      const tokPath = `/resources/accessTokens?userId=${encodeURIComponent(userId)}&levelName=${encodeURIComponent(levelName)}`;
      const { ts: tsTok, sig: sigTok } = await signSumsub("POST", tokPath, "");
      const tokRes = await fetch("https://api.sumsub.com" + tokPath, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "X-App-Token": appToken,
          "X-App-Access-Sig": sigTok,
          "X-App-Access-Ts": tsTok.toString(),
        },
      });
      const tokData = await tokRes.json();

      // 3. Generate Hosted WebSDK Link (for independent new tab)
      const linkPath = `/resources/sdkIntegrations/levels/${encodeURIComponent(levelName)}/websdkLink?ttlInSecs=3600&externalUserId=${encodeURIComponent(userId)}&lang=en`;
      const { ts: tsLink, sig: sigLink } = await signSumsub("POST", linkPath, "{}");
      const linkRes = await fetch("https://api.sumsub.com" + linkPath, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-App-Token": appToken,
          "X-App-Access-Sig": sigLink,
          "X-App-Access-Ts": tsLink.toString(),
        },
        body: "{}",
      });
      const linkData = await linkRes.json();

      const result = {
        success: true,
        token: tokData.token || null,
        independentUrl: linkData.url || null,
        userId: userId,
        applicantId: applicantId,
        levelName: levelName,
      };

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  },
};
