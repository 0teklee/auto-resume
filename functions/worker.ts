export interface Env {
  RESUME_STORAGE: R2Bucket;
  DEPLOY_HOOK_URL: string;
  WORKER_API_KEY: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // Authorization 헤더 설정 - .env.local, figma client storage, cloudflare secret에 저장됨

  const authHeader = request.headers.get("Authorization");
  const isAuthorized = authHeader === `Bearer ${env.WORKER_API_KEY}`;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "null",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };

  // Preflight 처리 (CORS)
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
      },
    });
  }

  if (request.method !== "POST" || !isAuthorized) {
    return new Response("❌[WORKER]:Method Not Allowed", { status: 405 });
  }

  try {
    const jsonData = await request.json();
    const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    // 1. R2에서 최신 파일 목록 가져오기
    const existingFiles = await env.RESUME_STORAGE.list({
      prefix: `v`,
      limit: 100,
    });

    // 2. 최신 버전 찾기
    let maxVersion = 0;
    if (existingFiles.objects.length > 0) {
      // 3️⃣ Extract version numbers from filenames
      existingFiles.objects.forEach((obj: any) => {
        const match = obj.key.match(/^v(\d+)-(\d{4}-\d{2}-\d{2})\.json$/);
        if (match && match[2] === dateStr) {
          maxVersion = Math.max(maxVersion, parseInt(match[1], 10));
        }
      });
    }

    // 3. 파일 없을 시, 1로 설정
    const newVersion = maxVersion + 1;
    const versionedKey = `v${newVersion}-${dateStr}.json`;
    const fileName = `v${newVersion}-${dateStr}.json`;

    //4. R2에 새 버전 저장
    await env.RESUME_STORAGE.put(fileName, JSON.stringify(jsonData), {
      httpMetadata: { contentType: "application/json" },
    });

    // Build 스크립트에서 사용할 "latest.json" 포인터
    await env.RESUME_STORAGE.put("latest.json", JSON.stringify(jsonData), {
      httpMetadata: { contentType: "application/json" },
    });

    let deploy_url = await env.DEPLOY_HOOK_URL;
    console.log(`⚠️[DEPLOY]:DEPLOY_HOOK_URL ${deploy_url}`);
    const deployResponse = await fetch(`${deploy_url}`, {
      method: "POST",
    });

    if (deployResponse.ok) {
      console.info("✅[WORKER]:Deploy hook 호출: Cloudflare Pages Rebuild");
    }
    return new Response(
      JSON.stringify({
        success: true,
        message: `✅[WORKER]:JSON saved as ${versionedKey}`,
      }),
      {
        headers: {
          ...corsHeaders,
        },
      },
    );
  } catch (error) {
    console.error("❌[Worker]: Error", error);
    return new Response("❌[Worker]: Error", { status: 500 });
  }
};
