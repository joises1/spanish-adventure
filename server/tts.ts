export const ELEVENLABS_VOICE_ID = "MWXF5l2gMPzYdfnzWbHM";
export const ELEVENLABS_MODEL_ID = "eleven_multilingual_v2";
export const MAX_TTS_BODY_LENGTH = 2_000;
export const MAX_TTS_TEXT_LENGTH = 500;
export const DEFAULT_TTS_TIMEOUT_MS = 12_000;
export const DEFAULT_TTS_RATE_LIMIT = 20;
export const DEFAULT_TTS_RATE_WINDOW_MS = 60_000;

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

export type TtsRateLimiter = {
  check: (key: string, now?: number) => RateLimitResult;
};

export const createTtsRateLimiter = (
  limit = DEFAULT_TTS_RATE_LIMIT,
  windowMs = DEFAULT_TTS_RATE_WINDOW_MS,
): TtsRateLimiter => {
  const clients = new Map<string, { count: number; resetAt: number }>();

  return {
    check(key, now = Date.now()) {
      const current = clients.get(key);
      if (!current || current.resetAt <= now) {
        clients.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, retryAfterSeconds: 0 };
      }
      if (current.count >= limit) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((current.resetAt - now) / 1_000),
          ),
        };
      }
      current.count += 1;
      return { allowed: true, retryAfterSeconds: 0 };
    },
  };
};

const defaultRateLimiter = createTtsRateLimiter();

const jsonResponse = (
  status: number,
  payload: Record<string, string>,
  headers?: Record<string, string>,
) =>
  Response.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...headers,
    },
  });

const getClientKey = (request: Request) =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  request.headers.get("x-real-ip")?.trim() ||
  "unknown";

const hasAllowedOrigin = (request: Request) => {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host");
  if (!host) return true;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
};

export type TtsValidationResult =
  | { ok: true; text: string }
  | { ok: false; response: Response };

export const validateTtsPayload = (
  method: string,
  contentType: string | null,
  rawBody: string,
): TtsValidationResult => {
  if (method !== "POST") {
    return {
      ok: false,
      response: jsonResponse(405, { error: "Method not allowed" }, {
        Allow: "POST",
      }),
    };
  }
  if (!contentType?.toLowerCase().startsWith("application/json")) {
    return {
      ok: false,
      response: jsonResponse(415, { error: "Content-Type must be application/json" }),
    };
  }
  if (rawBody.length > MAX_TTS_BODY_LENGTH) {
    return {
      ok: false,
      response: jsonResponse(413, { error: "Request body is too large" }),
    };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return {
      ok: false,
      response: jsonResponse(400, { error: "Request body must be valid JSON" }),
    };
  }

  const text =
    typeof payload === "object" &&
    payload !== null &&
    !Array.isArray(payload) &&
    "text" in payload &&
    typeof payload.text === "string"
      ? payload.text.trim()
      : "";
  if (!text) {
    return {
      ok: false,
      response: jsonResponse(400, { error: "Text is required" }),
    };
  }
  if (text.length > MAX_TTS_TEXT_LENGTH) {
    return {
      ok: false,
      response: jsonResponse(400, {
        error: `Text must contain at most ${MAX_TTS_TEXT_LENGTH} characters`,
      }),
    };
  }
  return { ok: true, text };
};

type TtsHandlerOptions = {
  apiKey: string;
  fetchImpl?: typeof fetch;
  rateLimiter?: TtsRateLimiter;
  timeoutMs?: number;
  now?: () => number;
  logger?: Pick<Console, "error">;
};

export const handleTtsRequest = async (
  request: Request,
  {
    apiKey,
    fetchImpl = fetch,
    rateLimiter = defaultRateLimiter,
    timeoutMs = DEFAULT_TTS_TIMEOUT_MS,
    now = Date.now,
    logger = console,
  }: TtsHandlerOptions,
) => {
  if (request.method !== "POST") {
    return jsonResponse(
      405,
      { error: "Method not allowed" },
      { Allow: "POST" },
    );
  }
  if (!hasAllowedOrigin(request)) {
    return jsonResponse(403, { error: "Request origin is not allowed" });
  }

  const rateLimit = rateLimiter.check(getClientKey(request), now());
  if (!rateLimit.allowed) {
    return jsonResponse(
      429,
      { error: "Too many speech requests. Please try again shortly." },
      { "Retry-After": String(rateLimit.retryAfterSeconds) },
    );
  }
  if (!apiKey.trim()) {
    return jsonResponse(503, { error: "Speech service is unavailable" });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return jsonResponse(400, { error: "Could not read request body" });
  }
  const validation = validateTtsPayload(
    request.method,
    request.headers.get("content-type"),
    rawBody,
  );
  if (!validation.ok) return validation.response;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const elevenLabsResponse = await fetchImpl(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": apiKey.trim(),
        },
        body: JSON.stringify({
          text: validation.text,
          model_id: ELEVENLABS_MODEL_ID,
          language_code: "es",
        }),
        signal: controller.signal,
      },
    );

    if (!elevenLabsResponse.ok) {
      const errorBody = await elevenLabsResponse.text();
      logger.error("[ElevenLabs TTS] Request failed", {
        status: elevenLabsResponse.status,
        statusText: elevenLabsResponse.statusText,
        voiceId: ELEVENLABS_VOICE_ID,
        modelId: ELEVENLABS_MODEL_ID,
        body: errorBody.slice(0, 4_000),
      });
      return jsonResponse(elevenLabsResponse.status, {
        error: "Speech generation failed",
      });
    }

    return new Response(await elevenLabsResponse.arrayBuffer(), {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=3600",
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return jsonResponse(504, { error: "Speech generation timed out" });
    }
    logger.error("[ElevenLabs TTS] Unexpected server error", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return jsonResponse(502, { error: "Speech service is unavailable" });
  } finally {
    clearTimeout(timeout);
  }
};
