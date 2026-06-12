import { LoaderCircle, Play, RefreshCw, Volume2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  getBrowserVoiceOptions,
  getEffectiveBrowserVoiceId,
  saveBrowserVoiceId,
  testBrowserVoice,
  type BrowserVoiceOption,
} from "../utils/speak";

export function VoiceSettings() {
  const [voices, setVoices] = useState<BrowserVoiceOption[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);

  const refreshVoices = useCallback(async () => {
    setIsLoading(true);
    const availableVoices = await getBrowserVoiceOptions();
    const effectiveVoiceId = getEffectiveBrowserVoiceId(availableVoices);
    setVoices(availableVoices);
    setSelectedVoiceId(effectiveVoiceId);
    if (effectiveVoiceId) saveBrowserVoiceId(effectiveVoiceId);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refreshVoices();

    const handleVoicesChanged = () => {
      void refreshVoices();
    };
    window.speechSynthesis?.addEventListener(
      "voiceschanged",
      handleVoicesChanged,
    );

    return () => {
      window.speechSynthesis?.removeEventListener(
        "voiceschanged",
        handleVoicesChanged,
      );
    };
  }, [refreshVoices]);

  const chooseVoice = (voiceId: string) => {
    setSelectedVoiceId(voiceId);
    saveBrowserVoiceId(voiceId);
  };

  const testVoice = async () => {
    if (!selectedVoiceId || isTesting) return;
    setIsTesting(true);
    try {
      await testBrowserVoice();
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <details className="voice-settings">
      <summary title="Browser voice settings">
        <Volume2 size={18} aria-hidden="true" />
        <span className="toolbar-action__label">Voice</span>
      </summary>
      <div className="voice-settings__menu">
        <div className="voice-settings__heading">
          <div>
            <strong>Browser voice</strong>
            <small>Used when ElevenLabs is unavailable</small>
          </div>
          <button
            type="button"
            onClick={() => void refreshVoices()}
            disabled={isLoading}
            aria-label="Reload browser voices"
            title="Reload browser voices"
          >
            <RefreshCw size={15} aria-hidden="true" />
          </button>
        </div>

        <label>
          <span>Spanish voice</span>
          <select
            value={selectedVoiceId}
            onChange={(event) => chooseVoice(event.target.value)}
            disabled={isLoading || voices.length === 0}
          >
            {isLoading && <option>Loading voices...</option>}
            {!isLoading && voices.length === 0 && (
              <option>No browser voices found</option>
            )}
            {voices.map((voice) => (
              <option
                value={voice.id}
                key={voice.id}
                disabled={!voice.isSelectable}
              >
                {voice.name} ({voice.lang}){voice.isDefault ? " - default" : ""}
                {!voice.isSelectable ? " - Spanish voice preferred" : ""}
              </option>
            ))}
          </select>
        </label>

        <button
          className="voice-settings__test"
          type="button"
          onClick={() => void testVoice()}
          disabled={!selectedVoiceId || isTesting}
        >
          {isTesting ? (
            <LoaderCircle
              className="speaker-button__spinner"
              size={16}
              aria-hidden="true"
            />
          ) : (
            <Play size={16} aria-hidden="true" />
          )}
          Test voice
        </button>
      </div>
    </details>
  );
}
