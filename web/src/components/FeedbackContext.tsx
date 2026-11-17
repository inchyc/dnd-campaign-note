"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  message: string;
  description?: string;
  type: ToastType;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export interface PromptOptions {
  title: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  inputType?: "text" | "number";
}

interface FeedbackContextValue {
  toast: (message: string, opts?: { type?: ToastType; description?: string; durationMs?: number }) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  prompt: (opts: PromptOptions) => Promise<string | null>;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function useFeedback(): FeedbackContextValue {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    throw new Error("useFeedback must be used within FeedbackProvider");
  }
  return ctx;
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const [confirmState, setConfirmState] = useState<{
    opts: ConfirmOptions;
    resolve: (val: boolean) => void;
  } | null>(null);

  const [promptState, setPromptState] = useState<{
    opts: PromptOptions;
    value: string;
    resolve: (val: string | null) => void;
  } | null>(null);

  const promptInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (promptState) {
      setTimeout(() => {
        promptInputRef.current?.focus();
        promptInputRef.current?.select();
      }, 30);
    }
  }, [promptState]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (
      message: string,
      opts?: { type?: ToastType; description?: string; durationMs?: number }
    ) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const type: ToastType = opts?.type ?? "info";
      const durationMs = opts?.durationMs ?? 4000;

      setToasts((prev) => [...prev.slice(-4), { id, message, description: opts?.description, type }]);

      if (durationMs > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, durationMs);
      }
    },
    []
  );

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({ opts, resolve });
    });
  }, []);

  const prompt = useCallback((opts: PromptOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      setPromptState({
        opts,
        value: opts.defaultValue ?? "",
        resolve,
      });
    });
  }, []);

  const handleConfirmClose = (result: boolean) => {
    if (!confirmState) return;
    confirmState.resolve(result);
    setConfirmState(null);
  };

  const handlePromptClose = (result: string | null) => {
    if (!promptState) return;
    promptState.resolve(result);
    setPromptState(null);
  };

  return (
    <FeedbackContext.Provider value={{ toast, confirm, prompt }}>
      {children}

      {/* Toast Stack */}
      <div
        aria-live="polite"
        className="fixed z-[100] bottom-20 md:bottom-5 right-4 left-4 sm:left-auto sm:w-96 flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => {
          const styles: Record<ToastType, { border: string; bg: string; icon: React.ReactNode }> = {
            success: {
              border: "border-emerald-500/50",
              bg: "bg-fantasy-850/95",
              icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />,
            },
            error: {
              border: "border-rose-500/60",
              bg: "bg-fantasy-850/95",
              icon: <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />,
            },
            warning: {
              border: "border-amber-500/60",
              bg: "bg-fantasy-850/95",
              icon: <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />,
            },
            info: {
              border: "border-sky-500/50",
              bg: "bg-fantasy-850/95",
              icon: <Info className="w-4 h-4 text-sky-400 flex-shrink-0" />,
            },
          };
          const s = styles[t.type];

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-2.5 p-3 rounded-xl border ${s.border} ${s.bg} backdrop-blur-md shadow-2xl text-slate-100 animate-in slide-in-from-bottom-2 fade-in duration-150`}
            >
              <div className="mt-0.5">{s.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold leading-snug">{t.message}</p>
                {t.description && (
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{t.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                className="p-0.5 rounded text-slate-400 hover:text-slate-200 transition"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirm Dialog */}
      {confirmState && (
        <div
          onClick={() => handleConfirmClose(false)}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-fantasy-850 border border-fantasy-700 shadow-2xl p-5 space-y-4 text-slate-200"
          >
            <div className="space-y-1.5">
              <h3 className="font-serif font-bold text-base text-amber-200">
                {confirmState.opts.title || "Confirm Action"}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {confirmState.opts.message}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleConfirmClose(false)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-fantasy-800 hover:bg-fantasy-700 text-slate-300 border border-fantasy-700 transition"
              >
                {confirmState.opts.cancelLabel || "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmClose(true)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition shadow ${
                  confirmState.opts.destructive
                    ? "bg-rose-600 hover:bg-rose-500 text-white"
                    : "bg-amber-600 hover:bg-amber-500 text-slate-950"
                }`}
              >
                {confirmState.opts.confirmLabel || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prompt Dialog */}
      {promptState && (
        <div
          onClick={() => handlePromptClose(null)}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              handlePromptClose(promptState.value);
            }}
            className="w-full max-w-md rounded-2xl bg-fantasy-850 border border-fantasy-700 shadow-2xl p-5 space-y-4 text-slate-200"
          >
            <div className="space-y-1.5">
              <h3 className="font-serif font-bold text-base text-amber-200">
                {promptState.opts.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {promptState.opts.message}
              </p>
            </div>
            <input
              ref={promptInputRef}
              type={promptState.opts.inputType || "text"}
              value={promptState.value}
              placeholder={promptState.opts.placeholder}
              onChange={(e) =>
                setPromptState((prev) => (prev ? { ...prev, value: e.target.value } : null))
              }
              className="w-full px-3 py-2 rounded-lg bg-fantasy-900 border border-fantasy-700 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => handlePromptClose(null)}
                className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-fantasy-800 hover:bg-fantasy-700 text-slate-300 border border-fantasy-700 transition"
              >
                {promptState.opts.cancelLabel || "Cancel"}
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-slate-950 transition shadow"
              >
                {promptState.opts.confirmLabel || "Submit"}
              </button>
            </div>
          </form>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}
