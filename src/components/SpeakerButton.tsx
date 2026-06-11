import { LoaderCircle, Volume2 } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { speakSpanish } from "../utils/speak";

type SpeakerButtonProps = {
  text: string;
  label?: string;
  tabIndex?: number;
};

export function SpeakerButton({
  text,
  label = "Play Spanish audio",
  tabIndex,
}: SpeakerButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (status === "loading") return;

    setStatus("loading");
    try {
      await speakSpanish(text);
      setStatus("idle");
    } catch {
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 2500);
    }
  };

  const isLoading = status === "loading";
  const accessibleLabel = isLoading
    ? `Generating audio for ${text}`
    : status === "error"
      ? `Audio unavailable for ${text}`
      : label;

  return (
    <button
      className={`speaker-button ${
        status === "error" ? "speaker-button--error" : ""
      }`}
      type="button"
      onClick={handleClick}
      onKeyDown={(event) => event.stopPropagation()}
      disabled={isLoading}
      aria-label={accessibleLabel}
      title={accessibleLabel}
      tabIndex={tabIndex}
    >
      {isLoading ? (
        <LoaderCircle
          className="speaker-button__spinner"
          size={18}
          aria-hidden="true"
        />
      ) : (
        <Volume2 size={18} aria-hidden="true" />
      )}
    </button>
  );
}

