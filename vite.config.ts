import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const ELEVENLABS_VOICE_ID = "MWXF5l2gMPzYdfnzWbHM";
const ELEVENLABS_MODEL_ID = "eleven_multilingual_v2";
const MAX_TEXT_LENGTH = 500;

const describeApiKey = (apiKey: string) => {
  if (!apiKey) return "missing";

  const fingerprint = createHash("sha256")
    .update(apiKey)
    .digest("hex")
    .slice(0, 12);
  return `${apiKey.slice(0, 6)}...${apiKey.slice(-4)} (${apiKey.length} chars, sha256:${fingerprint})`;
};

const readJsonBody = (request: IncomingMessage) =>
  new Promise<unknown>((resolve, reject) => {
    let body = "";

    request.setEncoding("utf8");
    request.on("data", (chunk: string) => {
      body += chunk;
    });
    request.on("end", () => {
      if (body.length > 2_000) {
        reject(new Error("Request body is too large"));
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Request body must be valid JSON"));
      }
    });
    request.on("error", reject);
  });

const sendJson = (
  response: ServerResponse,
  statusCode: number,
  payload: Record<string, string>,
) => {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(payload));
};

const createTtsMiddleware =
  (apiKey: string) =>
  async (request: IncomingMessage, response: ServerResponse) => {
    if (request.method !== "POST") {
      sendJson(response, 405, { error: "Method not allowed" });
      return;
    }

    if (!apiKey) {
      sendJson(response, 503, { error: "ElevenLabs is not configured" });
      return;
    }

    try {
      const payload = await readJsonBody(request);
      const text =
        typeof payload === "object" &&
        payload !== null &&
        "text" in payload &&
        typeof payload.text === "string"
          ? payload.text.trim()
          : "";

      if (!text || text.length > MAX_TEXT_LENGTH) {
        sendJson(response, 400, {
          error: `Text must contain 1-${MAX_TEXT_LENGTH} characters`,
        });
        return;
      }

      const elevenLabsResponse = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            Accept: "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": apiKey,
          },
          body: JSON.stringify({
            text,
            model_id: ELEVENLABS_MODEL_ID,
            language_code: "es",
          }),
        },
      );

      if (!elevenLabsResponse.ok) {
        const errorBody = await elevenLabsResponse.text();
        console.error("[ElevenLabs TTS] Request failed", {
          status: elevenLabsResponse.status,
          statusText: elevenLabsResponse.statusText,
          voiceId: ELEVENLABS_VOICE_ID,
          modelId: ELEVENLABS_MODEL_ID,
          body: errorBody.slice(0, 4_000),
        });
        sendJson(response, elevenLabsResponse.status, {
          error: "ElevenLabs could not generate audio",
        });
        return;
      }

      const audio = new Uint8Array(await elevenLabsResponse.arrayBuffer());
      response.statusCode = 200;
      response.setHeader("Content-Type", "audio/mpeg");
      response.setHeader("Cache-Control", "private, max-age=3600");
      response.setHeader("Content-Length", audio.byteLength);
      response.end(audio);
    } catch {
      sendJson(response, 500, { error: "Could not generate speech" });
    }
  };

const elevenLabsTtsPlugin = (apiKey: string): Plugin => {
  const middleware = createTtsMiddleware(apiKey);
  const logConfiguration = () => {
    console.info("[ElevenLabs TTS] Server configuration", {
      apiKey: describeApiKey(apiKey),
      voiceId: ELEVENLABS_VOICE_ID,
      modelId: ELEVENLABS_MODEL_ID,
    });
  };

  return {
    name: "spanish-adventure-elevenlabs-tts",
    configureServer(server) {
      logConfiguration();
      server.middlewares.use("/api/tts", middleware);
    },
    configurePreviewServer(server) {
      logConfiguration();
      server.middlewares.use("/api/tts", middleware);
    },
  };
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const apiKey = (env.ELEVENLABS_API_KEY ?? "").trim();

  return {
    plugins: [react(), elevenLabsTtsPlugin(apiKey)],
  };
});
