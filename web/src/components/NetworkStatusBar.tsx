"use client";

import React, { useState, useEffect, useRef } from "react";
import { WifiOff, CheckCircle2 } from "lucide-react";

interface NetworkStatusBarProps {
  onReconnect?: () => void;
}

export function NetworkStatusBar({ onReconnect }: NetworkStatusBarProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onReconnectRef = useRef(onReconnect);

  useEffect(() => {
    onReconnectRef.current = onReconnect;
  }, [onReconnect]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      onReconnectRef.current?.();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(() => setShowReconnected(false), 3500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };

    setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, []);

  if (isOnline && !showReconnected) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom duration-300 pointer-events-none">
      {!isOnline ? (
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-rose-950/90 border border-rose-600/70 text-rose-200 text-xs shadow-2xl backdrop-blur-md">
          <WifiOff className="w-4 h-4 text-rose-400 animate-pulse" />
          <span className="font-medium">
            Astral Conduit Severed — viewing cached campaign notes.
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-950/90 border border-emerald-600/70 text-emerald-200 text-xs shadow-2xl backdrop-blur-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="font-medium">
            Conduit Restored — campaign codex synchronized.
          </span>
        </div>
      )}
    </div>
  );
}
