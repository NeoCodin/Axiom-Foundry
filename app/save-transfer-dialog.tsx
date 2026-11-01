"use client";

import { useEffect, useRef, useState } from "react";
import { formatNumber, type GameState } from "./game-engine";
import {
  SAVE_TRANSFER_FAILURE_COPY,
  decodeSaveTransfer,
  describeSaveTransfer,
  encodeSaveTransfer,
  type SaveTransferSource,
} from "./save-transfer";

type SaveTransferDialogProps = {
  profile: SaveTransferSource;
  getCurrentSave: () => GameState;
  onRestore: (state: GameState) => string | null;
  onClose: () => void;
};

function formatSavedAt(date: Date) {
  return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export function SaveTransferDialog({ profile, getCurrentSave, onRestore, onClose }: SaveTransferDialogProps) {
  const [exportCode] = useState(() => encodeSaveTransfer(getCurrentSave(), profile));
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [pending, setPending] = useState<GameState | null>(null);
  const exportRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const copyCode = async () => {
    const copiedMessage = "Backup code copied. Paste it somewhere you keep notes or files.";
    try {
      await navigator.clipboard.writeText(exportCode);
      setExportStatus(copiedMessage);
      return;
    } catch {
      // The async Clipboard API needs a secure context (LAN http testing has
      // none), so fall back to copying the selected textarea.
    }
    exportRef.current?.select();
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }
    setExportStatus(copied ? copiedMessage : "This browser blocked copying. The code is selected, so copy it manually.");
  };

  const downloadCode = () => {
    const url = URL.createObjectURL(new Blob([exportCode], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `axiom-foundry-${profile === "qa" ? "qa-" : ""}backup-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
    setExportStatus("Backup file downloaded.");
  };

  const checkCode = (code: string) => {
    const result = decodeSaveTransfer(code, profile);
    if (!result.ok) {
      setPending(null);
      setImportError(SAVE_TRANSFER_FAILURE_COPY[result.reason]);
      return;
    }
    setImportError(null);
    setPending(result.state);
  };

  const loadFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    setImportText(text);
    checkCode(text);
  };

  const confirmRestore = () => {
    if (!pending) return;
    const failure = onRestore(pending);
    if (failure) setImportError(failure);
  };

  const pendingSummary = pending ? describeSaveTransfer(pending) : null;
  const sizeLabel = `${formatNumber(Math.ceil(exportCode.length / 1_024))} KB code`;

  return (
    <div className="manual-layer save-transfer-layer">
      <button className="modal-backdrop" type="button" aria-label="Close save backup" onClick={onClose} />
      <section className="save-transfer" role="dialog" aria-modal="true" aria-labelledby="save-transfer-title" aria-describedby="save-transfer-summary">
        <header className="game-manual-header">
          <div>
            <p>{profile === "qa" ? "QA sandbox · save backup" : "Save backup"}</p>
            <h2 id="save-transfer-title">Back up or restore this save</h2>
            <span id="save-transfer-summary">Your progress is stored only in this browser. Clearing site data or changing devices loses it unless you keep a backup code.</span>
          </div>
          <button className="manual-close" type="button" autoFocus onClick={onClose}>Close</button>
        </header>

        <div className="save-transfer-body">
          <section className="save-transfer-panel" aria-labelledby="save-transfer-export-title">
            <h3 id="save-transfer-export-title">Back up</h3>
            <p>Copy this code or download it as a file. Restoring it later returns the game to this moment.</p>
            <textarea
              ref={exportRef}
              readOnly
              rows={4}
              value={exportCode}
              aria-label="Backup code for the current save"
              onFocus={(event) => event.currentTarget.select()}
            />
            <div className="save-transfer-actions">
              <button type="button" onClick={copyCode}>Copy code</button>
              <button className="quiet-button" type="button" onClick={downloadCode}>Download file</button>
            </div>
            <small role="status">{exportStatus ?? sizeLabel}</small>
          </section>

          <section className="save-transfer-panel" aria-labelledby="save-transfer-import-title">
            <h3 id="save-transfer-import-title">Restore</h3>
            <p>Paste a backup code or load a backup file. Restoring replaces the progress on this device.</p>
            <textarea
              rows={4}
              value={importText}
              placeholder="AXF-SAVE-1:…"
              aria-label="Paste a backup code"
              onChange={(event) => {
                setImportText(event.target.value);
                setPending(null);
                setImportError(null);
              }}
            />
            <div className="save-transfer-actions">
              <button type="button" onClick={() => checkCode(importText)}>Check code</button>
              <button className="quiet-button" type="button" onClick={() => fileRef.current?.click()}>Load file</button>
              <input
                ref={fileRef}
                className="save-transfer-file"
                type="file"
                accept=".txt,text/plain"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(event) => {
                  void loadFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </div>
            {importError && <p className="save-transfer-error" role="alert">{importError}</p>}
            {pendingSummary && (
              <div className="save-transfer-confirm">
                <strong>{pendingSummary.world} · Cycle {pendingSummary.cycle}</strong>
                <span>{pendingSummary.playTime} played · backed up {formatSavedAt(pendingSummary.savedAt)}</span>
                <p>This replaces the current save on this device. Back up the current save first if you want to keep it.</p>
                <div className="save-transfer-actions">
                  <button type="button" onClick={confirmRestore}>Replace current save</button>
                  <button className="quiet-button" type="button" onClick={() => setPending(null)}>Cancel</button>
                </div>
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
