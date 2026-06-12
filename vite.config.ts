import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import {
  ELEVENLABS_MODEL_ID,
  ELEVENLABS_VOICE_ID,
  MAX_TTS_BODY_LENGTH,
  handleTtsRequest,
} from "./server/tts";

const readRequestBody = (request: IncomingMessage) =>
  new Promise<string>((resolve, reject) => {
    let body = "";
    let tooLarge = false;
    request.setEncoding("utf8");
    request.on("data", (chunk: string) => {
      if (tooLarge) return;
      body += chunk;
      if (body.length > MAX_TTS_BODY_LENGTH) {
        tooLarge = true;
        reject(new Error("Request body is too large"));
      }
    });
    request.on("end", () => {
      if (!tooLarge) resolve(body);
    });
    request.on("error", reject);
  });

const toHeaders = (request: IncomingMessage) => {
  const headers = new Headers();
  Object.entries(request.headers).forEach(([name, value]) => {
    if (Array.isArray(value)) {
      headers.set(name, value.join(","));
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  });
  return headers;
};

const sendResponse = async (
  response: ServerResponse,
  fetchResponse: Response,
) => {
  response.statusCode = fetchResponse.status;
  fetchResponse.headers.forEach((value, name) => {
    response.setHeader(name, value);
  });
  const body = new Uint8Array(await fetchResponse.arrayBuffer());
  response.setHeader("Content-Length", body.byteLength);
  response.end(body);
};

const createTtsMiddleware =
  (apiKey: string) =>
  async (request: IncomingMessage, response: ServerResponse) => {
    try {
      const host = request.headers.host ?? "127.0.0.1";
      const body =
        request.method === "POST" ? await readRequestBody(request) : undefined;
      const fetchRequest = new Request(
        `http://${host}${request.url ?? "/api/tts"}`,
        {
          method: request.method,
          headers: toHeaders(request),
          body,
        },
      );
      await sendResponse(
        response,
        await handleTtsRequest(fetchRequest, { apiKey }),
      );
    } catch {
      await sendResponse(
        response,
        Response.json(
          { error: "Request body is too large" },
          { status: 413 },
        ),
      );
    }
  };

const elevenLabsTtsPlugin = (apiKey: string): Plugin => {
  const middleware = createTtsMiddleware(apiKey);
  const logConfiguration = () => {
    console.info("[ElevenLabs TTS] Server configuration", {
      configured: Boolean(apiKey),
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
