export async function POST(req: Request) {
  const { prompt } = await req.json().catch(() => ({ prompt: "" }));
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || !prompt) return Response.json({ text: "" });
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 1000, messages: [{ role: "user", content: prompt }] }),
    });
    const d = await r.json();
    const text = (d.content || []).map((i: any) => (i.type === "text" ? i.text : "")).join("").trim();
    return Response.json({ text });
  } catch { return Response.json({ text: "" }); }
}
