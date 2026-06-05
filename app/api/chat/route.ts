import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT =
  "You are Claude, on a live voice phone call with the user. Your replies are " +
  "read aloud by a text-to-speech voice, so keep them brief, natural, and " +
  "conversational — usually one or two sentences. Avoid lists, code blocks, " +
  "markdown, emoji, and anything that doesn't sound good when spoken. Sound " +
  "warm and human, like a friend on the phone.";

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Missing ANTHROPIC_API_KEY. Add it in your environment settings." },
      { status: 500 }
    );
  }

  let messages: ChatMessage[];
  try {
    const body = await req.json();
    messages = body.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error("no messages");
    }
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const anthropic = new Anthropic({ apiKey });

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: messages.map((m) => ({ role: m.role, content: m.content }))
    });

    const reply = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join(" ")
      .trim();

    return Response.json({ reply: reply || "Sorry, I didn't catch that." });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: `Claude API error: ${message}` }, { status: 502 });
  }
}
