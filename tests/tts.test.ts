import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_TTS_BODY_LENGTH,
  MAX_TTS_TEXT_LENGTH,
  createTtsRateLimiter,
  handleTtsRequest,
  validateTtsPayload,
} from "../server/tts.ts";

const request = (
  body: string,
  headers: Record<string, string> = {},
) =>
  new Request("https://spanish-adventure.test/api/tts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "203.0.113.10",
      ...headers,
    },
    body,
  });

test("TTS validates method, JSON body, empty text, and text limits", async () => {
  const wrongMethod = await handleTtsRequest(
    new Request("https://spanish-adventure.test/api/tts"),
    { apiKey: "test-key" },
  );
  assert.equal(wrongMethod.status, 405);

  assert.equal(
    validateTtsPayload("POST", "application/json", "{").response.status,
    400,
  );
  assert.equal(
    validateTtsPayload("POST", "application/json", JSON.stringify({ text: " " }))
      .response.status,
    400,
  );
  assert.equal(
    validateTtsPayload(
      "POST",
      "application/json",
      JSON.stringify({ text: "a".repeat(MAX_TTS_TEXT_LENGTH + 1) }),
    ).response.status,
    400,
  );
  assert.equal(
    validateTtsPayload(
      "POST",
      "application/json",
      "x".repeat(MAX_TTS_BODY_LENGTH + 1),
    ).response.status,
    413,
  );
  assert.equal(
    validateTtsPayload("POST", "text/plain", JSON.stringify({ text: "hola" }))
      .response.status,
    415,
  );
});

test("TTS forwards the key only in the server-side xi-api-key header", async () => {
  let forwardedKey = "";
  const fetchImpl = (async (_input: unknown, init?: RequestInit) => {
    forwardedKey = new Headers(init?.headers).get("xi-api-key") ?? "";
    return new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { "Content-Type": "audio/mpeg" },
    });
  }) as typeof fetch;

  const response = await handleTtsRequest(
    request(JSON.stringify({ text: "hola" })),
    {
      apiKey: "server-only-key",
      fetchImpl,
      rateLimiter: createTtsRateLimiter(5, 60_000),
    },
  );

  assert.equal(response.status, 200);
  assert.equal(forwardedKey, "server-only-key");
  assert.equal(await response.text(), "\u0001\u0002\u0003");
});

test("TTS applies a per-client rate limit before calling ElevenLabs", async () => {
  let upstreamCalls = 0;
  const fetchImpl = (async () => {
    upstreamCalls += 1;
    return new Response(new Uint8Array([1]), { status: 200 });
  }) as typeof fetch;
  const rateLimiter = createTtsRateLimiter(2, 60_000);
  const options = {
    apiKey: "server-only-key",
    fetchImpl,
    rateLimiter,
    now: () => 1_000,
  };

  const first = await handleTtsRequest(
    request(JSON.stringify({ text: "uno" })),
    options,
  );
  const second = await handleTtsRequest(
    request(JSON.stringify({ text: "dos" })),
    options,
  );
  const third = await handleTtsRequest(
    request(JSON.stringify({ text: "tres" })),
    options,
  );

  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(third.status, 429);
  assert.equal(third.headers.get("Retry-After"), "60");
  assert.equal(upstreamCalls, 2);
});

test("TTS aborts slow upstream requests and returns a safe timeout", async () => {
  const fetchImpl = (async (_input: unknown, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        reject(new DOMException("Timed out", "AbortError"));
      });
    })) as typeof fetch;

  const response = await handleTtsRequest(
    request(JSON.stringify({ text: "hola" })),
    {
      apiKey: "server-only-key",
      fetchImpl,
      rateLimiter: createTtsRateLimiter(5, 60_000),
      timeoutMs: 1,
    },
  );

  assert.equal(response.status, 504);
  assert.deepEqual(await response.json(), {
    error: "Speech generation timed out",
  });
});
