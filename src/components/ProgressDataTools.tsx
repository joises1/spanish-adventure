import {
  ArchiveRestore,
  Database,
  Download,
  FileCheck2,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { useGame } from "../state/GameContext";
import type { ProgressImportValidation } from "../state/progressData";
import type { Course } from "../types";

type ProgressDataToolsProps = {
  course: Course;
  onProgressChanged: () => void;
};

const formatBackupTime = (timestamp: string | null) => {
  if (!timestamp) return "No backup yet";
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime())
    ? "Backup time unavailable"
    : `Last backup ${date.toLocaleString()}`;
};

export function ProgressDataTools({
  course,
  onProgressChanged,
}: ProgressDataToolsProps) {
  const {
    exportProgress,
    importProgress,
    lastBackupAt,
    previewProgressImport,
    resetAllProgress,
    resetCourseProgress,
    restoreBackup,
    storageStatus,
  } = useGame();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] =
    useState<ProgressImportValidation | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const downloadExport = () => {
    const blob = new Blob([exportProgress()], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `spanish-adventure-progress-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setMessage("Progress export downloaded.");
  };

  const readImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const validation = previewProgressImport(await file.text());
      setPreview(validation);
      setMessage(validation.ok ? null : validation.error);
    } catch {
      setPreview(null);
      setMessage("The selected file could not be read.");
    }
  };

  const applyImport = () => {
    if (!preview?.ok) return;
    const confirmed = window.confirm(
      "Replace both courses with this imported progress? Your current progress will be backed up first.",
    );
    if (!confirmed) return;

    const result = importProgress(preview);
    setMessage(result.message);
    if (result.ok) {
      setPreview(null);
      onProgressChanged();
    }
  };

  const restore = () => {
    const confirmed = window.confirm(
      "Restore the previous progress backup? This replaces both current courses.",
    );
    if (!confirmed) return;
    const result = restoreBackup();
    setMessage(result.message);
    if (result.ok) onProgressChanged();
  };

  const resetCourse = () => {
    const confirmed = window.confirm(
      `Reset ${course.shortName} progress? Your current progress will be backed up first.`,
    );
    if (!confirmed) return;
    const result = resetCourseProgress(course.id);
    setMessage(result.message);
    if (result.ok) onProgressChanged();
  };

  const resetAll = () => {
    const confirmed = window.confirm(
      "Reset all A1-A2 and B1 progress? Your current progress will be backed up first.",
    );
    if (!confirmed) return;
    const result = resetAllProgress();
    setMessage(result.message);
    if (result.ok) onProgressChanged();
  };

  return (
    <details className="progress-data-tools">
      <summary>
        <Database size={18} aria-hidden="true" />
        <span>
          <strong>Progress & Data</strong>
          <small>{formatBackupTime(lastBackupAt)}</small>
        </span>
      </summary>

      <div className="progress-data-tools__body">
        <p
          className={`progress-data-tools__storage ${
            storageStatus.available && !storageStatus.message
              ? ""
              : "is-warning"
          }`}
          role="status"
        >
          {storageStatus.message ??
            "Progress is saving in this browser."}
        </p>

        <div className="progress-data-tools__actions">
          <button type="button" onClick={downloadExport}>
            <Download size={16} aria-hidden="true" />
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!storageStatus.available}
          >
            <Upload size={16} aria-hidden="true" />
            Import JSON
          </button>
          <input
            ref={fileInputRef}
            className="sr-only"
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              void readImport(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </div>

        {preview?.ok && (
          <section
            className="progress-import-preview"
            aria-label="Import summary"
          >
            <div>
              <FileCheck2 size={17} aria-hidden="true" />
              <strong>Import summary</strong>
            </div>
            <p>
              A1-A2: {preview.summary["a1-a2"].xp} XP,{" "}
              {preview.summary["a1-a2"].learnedWords} learned words
            </p>
            <p>
              B1: {preview.summary.b1.xp} XP,{" "}
              {preview.summary.b1.learnedWords} learned words
            </p>
            {preview.warnings.length > 0 && (
              <small>{preview.warnings.join(" ")}</small>
            )}
            <div className="progress-import-preview__buttons">
              <button type="button" onClick={applyImport}>
                Replace progress
              </button>
              <button type="button" onClick={() => setPreview(null)}>
                Cancel
              </button>
            </div>
          </section>
        )}

        <button
          className="progress-data-tools__restore"
          type="button"
          onClick={restore}
          disabled={!lastBackupAt || !storageStatus.available}
        >
          <ArchiveRestore size={16} aria-hidden="true" />
          <span>
            <strong>Restore previous backup</strong>
            <small>{formatBackupTime(lastBackupAt)}</small>
          </span>
        </button>

        <div className="progress-data-tools__danger">
          <button
            type="button"
            onClick={resetCourse}
            disabled={!storageStatus.available}
          >
            <RotateCcw size={15} aria-hidden="true" />
            Reset {course.shortName}
          </button>
          <button
            type="button"
            onClick={resetAll}
            disabled={!storageStatus.available}
          >
            <Trash2 size={15} aria-hidden="true" />
            Full reset
          </button>
        </div>

        {message && (
          <p className="progress-data-tools__message" role="status">
            {message}
          </p>
        )}
      </div>
    </details>
  );
}
