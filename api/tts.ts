import { env } from "node:process";
import { handleTtsRequest } from "../server/tts";

export default {
  async fetch(request: Request) {
    const apiKey = (env.ELEVENLABS_API_KEY ?? "").trim();
    return handleTtsRequest(request, { apiKey });
  },
};
