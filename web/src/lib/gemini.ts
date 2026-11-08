import { getEnv } from "./config";

const MODELS = ["gemini-2.5-flash", "gemini-3.8-flash"];

export interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

/** Minimal Gemini REST helper with retry and model fallback. Key is read server-side only. */
export async function gemini(parts: GeminiPart[], opts?: { system?: string; timeoutMs?: number }): Promise<string> {
  const key = getEnv("GEMINI_API_KEY") || getEnv("GOOGLE_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY is not set on the server");
  let lastErr = "";
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({
            contents: [{ parts }],
            ...(opts?.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
            generationConfig: { temperature: 0.2 },
          }),
          signal: AbortSignal.timeout(opts?.timeoutMs ?? 120_000),
        });
        if (res.ok) {
          const json = await res.json();
          const text = json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "";
          if (text) return text;
          lastErr = "Empty response";
        } else if (res.status === 503 || res.status === 429) {
          lastErr = `${model} busy (${res.status})`;
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        } else if (res.status === 404) {
          lastErr = `${model} not available`;
          break; // try next model
        } else {
          throw new Error(`Gemini error ${res.status}: ${(await res.text()).slice(0, 300)}`);
        }
      } catch (e: any) {
        lastErr = e?.message || String(e);
        if (!/busy|timeout|aborted|fetch failed/i.test(lastErr)) throw e;
      }
    }
  }
  throw new Error(`Gemini unavailable: ${lastErr}`);
}

export const GLOSSARY =
  "Vilgeismar, Demire (the Traveller, a cat demi-god), The Eternal Wake, Glutenboss (monkey captain), Nub Nub (the Collector), " +
  "High Lady Seraphine Vaelor, Lord Henrik Vaust, Roderic Hale, Old Marta Kell, Rooprecht, Garron, The Many-Faced Lady, " +
  "Cradlebreaker, Dawn, Dorn, DrewDrops, Valefare, Eirndoor. Player characters: Cedric, Colm, Vola, Everan/Erevan, Aewren, Ruik, Vex/Vesper.";
