"use client";
import { useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function SubmitRepoModal({ isOpen, onClose }: Props) {
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/submit-repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), note: note.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Something went wrong");
      } else {
        setStatus("success");
        setMessage(data.message);
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

  const handleClose = () => {
    setUrl("");
    setNote("");
    setStatus("idle");
    setMessage("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-surface rounded-2xl p-6 w-full max-w-md border border-border"
        style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-muted hover:text-foreground transition-colors text-lg leading-none"
          aria-label="Close"
        >
          ✕
        </button>

        {status === "success" ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="text-foreground font-bold text-xl mb-2">Repo submitted!</h2>
            <p className="text-muted text-sm mb-6 leading-relaxed">{message}</p>
            <button
              onClick={handleClose}
              className="bg-accent hover:bg-[#8B5CF6] text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-foreground font-bold text-xl mb-1">Submit a Repo</h2>
            <p className="text-muted text-sm mb-6">Know a gem? Add it to the Stella discovery pool.</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-muted text-xs font-medium uppercase tracking-wide mb-1.5 block">
                  GitHub URL *
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo"
                  required
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              <div>
                <label className="text-muted text-xs font-medium uppercase tracking-wide mb-1.5 block">
                  Why do you love it?{" "}
                  <span className="normal-case font-normal">(optional)</span>
                </label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="One sentence about why this repo is worth discovering..."
                  rows={2}
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted/50 focus:outline-none focus:border-accent transition-colors resize-none"
                />
              </div>

              {status === "error" && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={status === "loading" || !url.trim()}
                className="bg-accent hover:bg-[#8B5CF6] text-white px-6 py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {status === "loading" ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifying repo...
                  </>
                ) : (
                  "Submit to Discovery Pool"
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
