"use client";

import { useState } from "react";

interface ZoomImportModalProps {
  onClose: () => void;
  onImport: (names: string[]) => void;
  existingNames: string[];
}

export function ZoomImportModal({
  onClose,
  onImport,
  existingNames,
}: ZoomImportModalProps) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"manual" | "zoom">("manual");

  const parsedNames = text
    .split(/[\n,]+/)
    .map((n) => n.trim())
    // Remove common Zoom suffixes like "(Host)", "(Co-host)", "(Guest)"
    .map((n) => n.replace(/\s*\((?:Host|Co-host|Guest|Me)\)\s*$/i, "").trim())
    .filter((n) => n.length > 0)
    // Remove duplicates and names already in the room
    .filter(
      (n, i, arr) =>
        arr.indexOf(n) === i &&
        !existingNames.some((e) => e.toLowerCase() === n.toLowerCase())
    );

  function handleImport() {
    if (parsedNames.length === 0) return;
    onImport(parsedNames);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-zoo-surface border border-zoo-border rounded-xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-zoo-border flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add Players</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode("manual")}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === "manual"
                  ? "bg-neon-blue/20 border border-neon-blue/40 text-neon-blue"
                  : "bg-zoo-bg border border-zoo-border text-text-muted hover:text-text-secondary"
              }`}
            >
              Type Names
            </button>
            <button
              onClick={() => setMode("zoom")}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === "zoom"
                  ? "bg-neon-purple/20 border border-neon-purple/40 text-neon-purple"
                  : "bg-zoo-bg border border-zoo-border text-text-muted hover:text-text-secondary"
              }`}
            >
              Paste from Zoom
            </button>
          </div>

          {/* Instructions */}
          {mode === "zoom" && (
            <div className="p-3 rounded-lg bg-zoo-bg border border-zoo-border">
              <h4 className="text-xs font-semibold text-neon-purple mb-2">
                How to copy names from Zoom:
              </h4>
              <ol className="text-xs text-text-secondary space-y-1 list-decimal list-inside">
                <li>In Zoom, click the Participants icon</li>
                <li>Select all names in the panel (Cmd+A / Ctrl+A)</li>
                <li>Copy (Cmd+C / Ctrl+C) and paste below</li>
              </ol>
            </div>
          )}

          {mode === "manual" && (
            <div className="p-3 rounded-lg bg-zoo-bg border border-zoo-border">
              <p className="text-xs text-text-secondary">
                Add people who are in your meeting (or anyone you want to bet
                about). They don&apos;t need to be online — they&apos;re just names on the
                board.
              </p>
            </div>
          )}

          {/* Paste/type area */}
          <div>
            <label className="text-xs text-text-muted uppercase tracking-wider block mb-1.5">
              {mode === "zoom" ? "Paste participant list" : "Player names"}
            </label>
            <textarea
              placeholder={
                mode === "zoom"
                  ? "Casey Hudetz (Host)\nDave Smith\nSarah Jones (Guest)\n\n(paste from Zoom)"
                  : "Casey\nDave\nSarah\n\n(one per line, or comma-separated)"
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              autoFocus
              className="w-full p-3 rounded-lg bg-zoo-bg border border-zoo-border focus:border-neon-blue/50 focus:outline-none text-text-primary placeholder:text-text-muted text-sm font-mono resize-none transition-colors"
            />
          </div>

          {/* Preview */}
          {parsedNames.length > 0 && (
            <div>
              <p className="text-xs text-text-muted mb-2">
                {parsedNames.length} new player
                {parsedNames.length !== 1 ? "s" : ""} to add:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {parsedNames.map((name) => (
                  <span
                    key={name}
                    className="text-xs px-2 py-1 rounded-full bg-neon-green/10 border border-neon-green/30 text-neon-green"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={parsedNames.length === 0}
            className="w-full p-3 rounded-lg bg-neon-green/20 border border-neon-green/40 text-neon-green font-semibold hover:bg-neon-green/30 transition-colors disabled:opacity-40"
          >
            Add {parsedNames.length} Player{parsedNames.length !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
