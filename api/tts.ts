import { env } from "node:process";

const ELEVENLABS_VOICE_ID = "MWXF5l2gMPzYdfnzWbHM";
const ELEVENLABS_MODEL_ID = "eleven_multilingual_v2";
const MAX_BODY_LENGTH = 2_000;
const MAX_TEXT_LENGTH = 500;

const jsonResponse = (status: number, payload: Record<string, string>) =>
  Response.json(payload, { status });

export default {
  async fetch(request: Request) {
    if (request.method !== "POST") {
      return jsonResponse(405, { error: "Method not allowed" });
    }

    const apiKey = (env.ELEVENLABS_API_KEY ?? "").trim();
    if (!apiKey) {
      return jsonResponse(503, { error: "ElevenLabs is not configured" });
    }

    try {
      const body = await request.text();
      if (body.length > MAX_BODY_LENGTH) {
        return jsonResponse(413, { error: "Request body is too large" });
      }

      const payload: unknown = JSON.parse(body);
      const text =
        typeof payload === "object" &&
        payload !== null &&
        "text" in payload &&
        typeof payload.text === "string"
          ? payload.text.trim()
          : "";

      if (!text || text.length > MAX_TEXT_LENGTH) {
        return jsonResponse(400, {
          error: `Text must contain 1-${MAX_TEXT_LENGTH} characters`,
        });
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
        return jsonResponse(elevenLabsResponse.status, {
          error: "ElevenLabs could not generate audio",
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
      console.error("[ElevenLabs TTS] Unexpected server error", error);
      return jsonResponse(500, { error: "Could not generate speech" });
    }
  },
};

