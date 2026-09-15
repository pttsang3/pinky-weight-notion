// Cloudflare Worker - 屋企體重 Notion Proxy
// 1. 去 https://dash.cloudflare.com → Workers & Pages → Create Worker
// 2. 將呢段code貼上去，覆蓋原本嘅code
// 3. 去 Settings → Variables → Add Secret → Name: NOTION_TOKEN, Value: secret_xxx...你條Token
// 4. Deploy → Copy條Worker URL，例如 https://pink-weight.yourname.workers.dev
// 5. 貼返去我個App度嘅 Worker URL 嗰格

export default {
  async fetch(request, env) {
    // 支援 CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, Notion-Version",
        }
      });
    }

    const notionToken = env.NOTION_TOKEN || "secret_請喺Cloudflare設定Secret";
    
    // 將 / 轉去 Notion API
    const url = new URL(request.url);
    // 如果你用 https://xxx.workers.dev/v1/databases/xxx/query，就會去 https://api.notion.com/v1/databases/xxx/query
    // 如果直接用 https://xxx.workers.dev?path=/v1/..., 都work
    let notionPath = url.pathname;
    // 容許直接打 /v1/... 或者 /notion/v1/...
    if (notionPath.startsWith("/notion")) {
      notionPath = notionPath.replace("/notion", "");
    }
    if (!notionPath.startsWith("/v1/")) {
      // 如果係根路徑，試下睇 query param
      const pathParam = url.searchParams.get("path");
      if (pathParam) notionPath = pathParam;
    }

    const notionUrl = `https://api.notion.com${notionPath}${notionPath.includes("?") ? "" : url.search}`;

    // Clone request
    const modifiedHeaders = new Headers();
    modifiedHeaders.set("Authorization", `Bearer ${notionToken}`);
    modifiedHeaders.set("Notion-Version", "2022-06-28");
    modifiedHeaders.set("Content-Type", "application/json");

    const modifiedRequest = new Request(notionUrl, {
      method: request.method,
      headers: modifiedHeaders,
      body: request.method !== "GET" ? await request.text() : null,
    });

    try {
      const response = await fetch(modifiedRequest);
      const data = await response.text();
      
      return new Response(data, {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, Notion-Version",
        }
      });
    } catch (e) {
      return new Response(JSON.stringify({error: e.message}), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        }
      });
    }
  }
}
