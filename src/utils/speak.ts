import { browserStorage } from "../state/storage";

const audioCache = new Map<string, string>();
const pendingAudio = new Map<string, Promise<string>>();
const failedAudio = new Set<string>();
const BROWSER_VOICE_STORAGE_KEY = "spanish-adventure-browser-voice-v1";
let activeAudio: HTMLAudioElement | null = null;
let elevenLabsUnavailable = false;
let speechRequestId = 0;

export type BrowserVoiceOption = {
  id: string;
  name: string;
  lang: string;
  isDefault: boolean;
  isSelectable: boolean;
};

const normalizeText = (text: string) => text.trim().replace(/\s+/g, " ");
const normalizeLanguage = (language: string) =>
  language.trim().replace("_", "-").toLowerCase();
const getVoiceId = (voice: SpeechSynthesisVoice) =>
  voice.voiceURI || `${voice.name}::${voice.lang}`;

const getSpanishPriority = (voice: SpeechSynthesisVoice) => {
  const language = normalizeLanguage(voice.lang);
  if (language === "es-es") return 0;
  if (language === "es-mx") return 1;
  if (language === "es-us") return 2;
  if (language.startsWith("es")) return 3;
  return Number.POSITIVE_INFINITY;
};

const sortVoices = (voices: SpeechSynthesisVoice[]) =>
  [...voices].sort((first, second) => {
    const priorityDifference =
      getSpanishPriority(first) - getSpanishPriority(second);
    if (Number.isFinite(priorityDifference) && priorityDifference !== 0) {
      return priorityDifference;
    }
    if (first.default !== second.default) return first.default ? -1 : 1;
    return first.name.localeCompare(second.name);
  });

const getEligibleVoices = (voices: SpeechSynthesisVoice[]) => {
  const spanishVoices = voices.filter((voice) =>
    normalizeLanguage(voice.lang).startsWith("es"),
  );
  return sortVoices(spanishVoices.length > 0 ? spanishVoices : voices);
};

const waitForBrowserVoices = () =>
  new Promise<SpeechSynthesisVoice[]>((resolve) => {
    const speech = window.speechSynthesis;
    const initialVoices = speech.getVoices();
    if (initialVoices.length > 0) {
      resolve(initialVoices);
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      speech.removeEventListener("voiceschanged", handleVoicesChanged);
      resolve(speech.getVoices());
    };
    const handleVoicesChanged = () => finish();
    const timeout = window.setTimeout(finish, 1_500);

    speech.addEventListener("voiceschanged", handleVoicesChanged);
  });

const loadAllBrowserVoices = async () => {
  if (!("speechSynthesis" in window)) return [];

  // Browsers may return an empty list until the voiceschanged event fires.
  return sortVoices(await waitForBrowserVoices());
};

const loadBrowserVoices = async () =>
  getEligibleVoices(await loadAllBrowserVoices());

export const getSavedBrowserVoiceId = () => {
  const result = browserStorage.read(BROWSER_VOICE_STORAGE_KEY);
  return result.ok ? result.value : null;
};

export const saveBrowserVoiceId = (voiceId: string) => {
  browserStorage.write(BROWSER_VOICE_STORAGE_KEY, voiceId);
};

export const getBrowserVoiceOptions = async (): Promise<
  BrowserVoiceOption[]
> => {
  const voices = await loadAllBrowserVoices();
  const hasSpanishVoice = voices.some((voice) =>
    normalizeLanguage(voice.lang).startsWith("es"),
  );

  return voices.map((voice) => ({
    id: getVoiceId(voice),
    name: voice.name,
    lang: voice.lang,
    isDefault: voice.default,
    isSelectable:
      !hasSpanishVoice || normalizeLanguage(voice.lang).startsWith("es"),
  }));
};

export const getEffectiveBrowserVoiceId = (
  voices: BrowserVoiceOption[],
) => {
  const savedVoiceId = getSavedBrowserVoiceId();
  if (
    savedVoiceId &&
    voices.some(
      (voice) => voice.id === savedVoiceId && voice.isSelectable,
    )
  ) {
    return savedVoiceId;
  }
  return voices.find((voice) => voice.isSelectable)?.id ?? "";
};

const requestAudio = async (text: string) => {
  const cachedUrl = audioCache.get(text);
  if (cachedUrl) return cachedUrl;

  const pendingRequest = pendingAudio.get(text);
  if (pendingRequest) return pendingRequest;

  if (elevenLabsUnavailable || failedAudio.has(text)) {
    throw new Error("ElevenLabs is unavailable for this session");
  }

  const request = fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  })
    .then(async (response) => {
      if (!response.ok) {
        if ([401, 402, 403, 503].includes(response.status)) {
          elevenLabsUnavailable = true;
        } else {
          failedAudio.add(text);
        }
        throw new Error(`ElevenLabs request failed (${response.status})`);
      }

      const audioBlob = await response.blob();
      if (!audioBlob.size) {
        throw new Error("ElevenLabs returned empty audio");
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      audioCache.set(text, audioUrl);
      return audioUrl;
    })
    .catch((error: unknown) => {
      failedAudio.add(text);
      throw error;
    })
    .finally(() => {
      pendingAudio.delete(text);
    });

  pendingAudio.set(text, request);
  return request;
};

const stopCurrentSpeech = () => {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }

  window.speechSynthesis?.cancel();
};

const playElevenLabsAudio = async (audioUrl: string) => {
  const audio = new Audio(audioUrl);
  activeAudio = audio;
  audio.addEventListener(
    "ended",
    () => {
      if (activeAudio === audio) activeAudio = null;
    },
    { once: true },
  );
  await audio.play();
};

export const speakWithBrowser = async (text: string) => {
  if (!("speechSynthesis" in window)) {
    throw new Error("Speech synthesis is not supported in this browser");
  }

  const voices = await loadBrowserVoices();
  const savedVoiceId = getSavedBrowserVoiceId();
  const selectedVoice =
    voices.find((voice) => getVoiceId(voice) === savedVoiceId) ?? voices[0];
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = selectedVoice?.lang ?? "es-ES";
  utterance.voice = selectedVoice ?? null;

  console.info("[Spanish Adventure] Browser speech voice", {
    name: selectedVoice?.name ?? "Browser default",
    lang: selectedVoice?.lang ?? utterance.lang,
  });

  window.speechSynthesis.speak(utterance);
};

export const testBrowserVoice = async () => {
  stopCurrentSpeech();
  await speakWithBrowser("Hola, esta es mi voz para aprender español.");
};

export const speakSpanish = async (text: string) => {
  const normalizedText = normalizeText(text);
  if (!normalizedText) return;

  const requestId = ++speechRequestId;
  stopCurrentSpeech();

  try {
    const audioUrl = await requestAudio(normalizedText);
    if (requestId !== speechRequestId) return;
    await playElevenLabsAudio(audioUrl);
  } catch {
    if (requestId !== speechRequestId) return;
    await speakWithBrowser(normalizedText);
  }
};
