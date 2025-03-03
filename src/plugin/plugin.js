figma.showUI(__html__, { width: 300, height: 150 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === "send-update") {
    /*
    NOTE: 플러그인 최초 실행으로 env 등록 이후, 불러오기만 실행.
    커스텀 플러그인이 실행되는 데스크탑 앱은 Webview, 샌드박스 환경이라 require, process 사용이 안됨
    * await figma.clientStorage.setAsync("ENV", "your-env");
    * */
    try {
      // 피그마 클라이언트 스토리지에서 환경변수 불러오기
      // Promise.all 사용 시 RuntimeError: memory access out of bounds
      const PLUGIN_API_KEY =
        await figma.clientStorage.getAsync("PLUGIN_API_KEY");
      const WORKER_URL = await figma.clientStorage.getAsync("WORKER_URL");
      const FIGMA_FILE_KEY =
        await figma.clientStorage.getAsync("FIGMA_FILE_KEY");
      const FIGMA_API_KEY = await figma.clientStorage.getAsync("FIGMA_API_KEY");

      figma.notify("✅ [ENV]: WORKER_URL SET");

      if (!FIGMA_FILE_KEY || !FIGMA_API_KEY) {
        throw new Error("❌[ENV]: ENV not loaded");
      }
      figma.notify("✅ [ENV]: loaded");

      // Figma JSON 데이터 불러오기
      const jsonData = await fetchFigmaJSON(FIGMA_FILE_KEY, FIGMA_API_KEY);
      if (!jsonData) {
        figma.notify("❌[FIGMA-API]:Failed to fetch Figma data");
        return; // 오류 발생 시 종료
      }

      console.log("[FIGMA-API]: Preparing", JSON.stringify(jsonData));

      // Worker로 Figma JSON 전달
      const response = await fetch(WORKER_URL, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PLUGIN_API_KEY}`,
        },
        body: JSON.stringify(jsonData),
      });

      console.log("[WORKER]: response status -", response.status);

      if (!response.ok) {
        throw new Error(`[WORKER] Error - ${response.statusText}`);
      }

      const res = await response.json();
      console.log("Worker Response:", res);

      figma.ui.postMessage({ status: "SUCCESS" });

      figma.notify("✅ Resume update sent successfully!");
      // 성공 이후 플러그인 5초 후 닫힘
      setTimeout(() => {
        figma.closePlugin();
      }, 3000);
    } catch (error) {
      console.error("❌ Fetch Error:", error.message);
      figma.notify("❌ Network error: " + error.message);
      figma.ui.postMessage({ status: `[FAILED]:${error.message}` });
    }
  }
};

async function fetchFigmaJSON(fileKey, apiKey) {
  try {
    console.log("Fetching Figma JSON...");
    const response = await fetch(`https://api.figma.com/v1/files/${fileKey}`, {
      headers: { "X-Figma-Token": apiKey },
    });

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    const json = await response.json();
    console.log("Fetched JSON successfully:", json);
    return json;
  } catch (error) {
    console.error("Figma API Error:", error.message);
    figma.notify("❌ Figma API Error: " + error.message);
    return null;
  }
}
