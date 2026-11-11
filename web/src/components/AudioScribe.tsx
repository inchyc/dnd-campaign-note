"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  Square,
  Upload,
  Play,
  FileAudio,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sparkles,
  Info,
  Calendar,
  Volume2,
  Download,
  Copy,
  Check,
  Send,
} from "lucide-react";
import {
  saveAudioChunk,
  getSessionAudioChunks,
  getAudioChunk,
  blobToBase64,
} from "@/lib/audioDb";

interface AudioChunk {
  index: number;
  file: string;
  transcribed: boolean;
  text?: string;
}

interface AudioScribeProps {
  isScribe: boolean;
  sessionDate: string;
}

const CHUNK_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export function AudioScribe({ isScribe, sessionDate }: AudioScribeProps) {
  const [chunks, setChunks] = useState<AudioChunk[]>([]);
  const [loading, setLoading] = useState(false);
  const [localBlobs, setLocalBlobs] = useState<Record<number, { blob: Blob; url: string }>>({});
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [chunkSeconds, setChunkSeconds] = useState(0);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 100
  const [transcribingIndex, setTranscribingIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"record" | "chunks" | "manual">("record");

  // MediaRecorder & Web Audio refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordedBlobsRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const fetchChunks = useCallback(async () => {
    if (!sessionDate) return;
    setLoading(true);
    try {
      // 1. Load local chunks from IndexedDB
      const stored = await getSessionAudioChunks(sessionDate).catch(() => []);
      const localMap: Record<number, { blob: Blob; url: string }> = {};
      for (const item of stored) {
        localMap[item.index] = {
          blob: item.blob,
          url: URL.createObjectURL(item.blob),
        };
      }
      setLocalBlobs(localMap);

      // 2. Fetch server chunks
      let serverChunks: AudioChunk[] = [];
      try {
        const res = await fetch(`/api/audio?session=${sessionDate}`);
        const data = await res.json();
        if (data.success && data.chunks) {
          serverChunks = data.chunks;
        }
      } catch {
        /* ignore */
      }

      // 3. Merge server chunks with local indexedDB chunks
      const combined = [...serverChunks];
      for (const item of stored) {
        if (!combined.some((c) => c.index === item.index)) {
          combined.push({
            index: item.index,
            file: `chunk-${String(item.index).padStart(4, "0")}.webm`,
            transcribed: false,
          });
        }
      }
      combined.sort((a, b) => a.index - b.index);
      setChunks(combined);

      const nextIndex = combined.length > 0 ? Math.max(...combined.map((c: AudioChunk) => c.index)) + 1 : 0;
      setCurrentChunkIndex(nextIndex);
    } catch (e) {
      console.error("Failed to load chunks", e);
    } finally {
      setLoading(false);
    }
  }, [sessionDate]);

  useEffect(() => {
    fetchChunks();
  }, [fetchChunks]);

  // Synchronize recording state with Android native bridge and prevent accidental web navigation
  useEffect(() => {
    (window as any).__isAudioRecording = () => isRecording;
    if (!isRecording) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "A live session recording is currently in progress. Are you sure you want to leave?";
      return e.returnValue;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      (window as any).__isAudioRecording = () => false;
    };
  }, [isRecording]);

  // Audio level visualizer loop
  const updateLevel = () => {
    if (!analyserRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const avg = sum / dataArray.length;
    // Map avg (0-255) to 0-100%
    setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
    animFrameRef.current = requestAnimationFrame(updateLevel);
  };

  const uploadChunkBlob = async (blob: Blob, index: number) => {
    const ext = blob.type.includes("webm") ? "webm" : blob.type.includes("mp4") ? "mp4" : "ogg";
    try {
      await fetch(`/api/audio?session=${sessionDate}&index=${index}&ext=${ext}`, {
        method: "PUT",
        headers: { "Content-Type": blob.type || "audio/webm" },
        body: blob,
      });
      await fetchChunks();
    } catch (e) {
      console.error("Failed to upload chunk", e);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Audio meter setup
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      updateLevel();

      // MediaRecorder setup
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "audio/ogg";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      recordedBlobsRef.current = [];

      let chunkIdx = currentChunkIndex;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedBlobsRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        if (recordedBlobsRef.current.length > 0) {
          const blob = new Blob(recordedBlobsRef.current, { type: mimeType });
          try {
            await saveAudioChunk(sessionDate, chunkIdx, blob);
          } catch (e) {
            console.warn("Could not save to IndexedDB:", e);
          }
          await uploadChunkBlob(blob, chunkIdx);
          recordedBlobsRef.current = [];
        }
      };

      recorder.start(1000); // 1s slice
      setIsRecording(true);
      setElapsedSeconds(0);
      setChunkSeconds(0);

      // Timer
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
        setChunkSeconds((cs) => {
          if (cs >= 600) {
            // 10 minutes reached: roll chunk
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
              mediaRecorderRef.current.stop();
              chunkIdx += 1;
              setCurrentChunkIndex(chunkIdx);
              setTimeout(() => {
                if (streamRef.current && isRecording) {
                  mediaRecorderRef.current?.start(1000);
                }
              }, 200);
            }
            return 0;
          }
          return cs + 1;
        });
      }, 1000);
    } catch (err: any) {
      alert("Microphone access denied or error: " + err.message);
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    setIsRecording(false);
    setAudioLevel(0);
  };

  const handleTranscribeChunk = async (index: number) => {
    setTranscribingIndex(index);
    try {
      const local = localBlobs[index] || (await getAudioChunk(sessionDate, index));
      let payload: any = { session: sessionDate, index };
      if (local?.blob) {
        const b64 = await blobToBase64(local.blob);
        payload.audioBase64 = b64;
        payload.mimeType = local.blob.type || "audio/webm";
      }

      const res = await fetch("/api/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Transcription failed");
        return;
      }
      setChunks((prev) =>
        prev.map((c) => (c.index === index ? { ...c, transcribed: true, text: data.text } : c))
      );
      await fetchChunks();
    } catch (e: any) {
      alert("Transcription failed: " + e.message);
    } finally {
      setTranscribingIndex(null);
    }
  };

  const handleSendToScratchpad = async (text: string) => {
    try {
      const res = await fetch("/api/scratch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `🎙️ [Audio Transcript]:\n${text}`,
          shared: true,
        }),
      });
      if (res.ok) {
        alert("Transcript added directly to the Live Scratchpad & Table Feed!");
      }
    } catch (e) {
      alert("Failed to add to scratchpad: " + e);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-fantasy-700/60 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-serif font-bold text-amber-200 flex items-center gap-2">
              <Mic className="w-5 h-5 text-rose-400" />
              Audio Scribe & Live Session Recording
            </h2>
            {sessionDate && (
              <span className="px-2 py-0.5 text-xs font-mono rounded bg-fantasy-800 text-amber-300 border border-fantasy-700 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-amber-400" /> {sessionDate}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Record tabletop sessions with automatic 10-minute chunking and Gemini campaign-aware transcription
          </p>
        </div>

        <div className="flex items-center p-1 bg-fantasy-900 border border-fantasy-700 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab("record")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
              activeTab === "record"
                ? "bg-amber-600 text-slate-950 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Live Recording
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("chunks")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
              activeTab === "chunks"
                ? "bg-amber-600 text-slate-950 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Session Chunks ({chunks.length})
          </button>
        </div>
      </div>

      {/* Audio Recording Readiness Checklist */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-fantasy-850 to-fantasy-900 border border-emerald-500/40 text-xs text-slate-300 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-serif font-bold text-emerald-300 text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Live Session Recording Readiness
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
            Hardware & Cloud Ready
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1 text-[11px]">
          <div className="p-2.5 rounded-lg bg-fantasy-900/90 border border-fantasy-700/60 space-y-1">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              1. Microphone Prompt
            </span>
            <p className="text-slate-400 leading-relaxed">
              When you click Start Recording, tap <strong>"Allow"</strong> on the browser microphone permission popup.
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-fantasy-900/90 border border-fantasy-700/60 space-y-1">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              2. IndexedDB Safeguard
            </span>
            <p className="text-slate-400 leading-relaxed">
              Chunks save directly to your phone/laptop's local storage. Zero audio is lost if Wi-Fi drops.
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-fantasy-900/90 border border-fantasy-700/60 space-y-1">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              3. Gemini 2.5 Flash
            </span>
            <p className="text-slate-400 leading-relaxed">
              Transcribes audio with speaker identification (<code className="text-amber-300">DM</code>, <code className="text-amber-300">Player</code>) and campaign glossary.
            </p>
          </div>

          <div className="p-2.5 rounded-lg bg-fantasy-900/90 border border-fantasy-700/60 space-y-1">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              4. Shared Scribes
            </span>
            <p className="text-slate-400 leading-relaxed">
              Multiple players can be Scribes simultaneously to take turns recording and collating.
            </p>
          </div>
        </div>
      </div>

      {/* Instructions & Consent Banner */}
      <div className="p-4 rounded-xl bg-fantasy-900/80 border border-rose-600/30 text-xs text-slate-300 space-y-2.5">
        <div className="flex items-center gap-2 font-serif font-semibold text-rose-300 text-sm">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          Consent & Instructions: How Audio Scribe Works
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-2.5 rounded bg-fantasy-850 border border-fantasy-700/60 space-y-1">
            <span className="font-semibold text-amber-300">1. Table Consent</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Always ensure all players at the table consent to recording. Audio Scribe is solely for offline campaign note synthesis.
            </p>
          </div>
          <div className="p-2.5 rounded bg-fantasy-850 border border-fantasy-700/60 space-y-1">
            <span className="font-semibold text-amber-300">2. 10-Minute Safety Chunks</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Audio is automatically partitioned into standalone 10-minute files. If a browser refreshes or loses power, prior chunks remain safe.
            </p>
          </div>
          <div className="p-2.5 rounded bg-fantasy-850 border border-fantasy-700/60 space-y-1">
            <span className="font-semibold text-amber-300">3. Vilgeismar Campaign Glossary</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Gemini transcribes using your campaign glossary (Vaust, Vaelor, Vilgeismar, Demire, Marta Kell, Rooprecht) to spell lore accurately.
            </p>
          </div>
        </div>
      </div>

      {/* Recording Console */}
      {activeTab === "record" && (
        <div className="p-6 rounded-xl bg-fantasy-900/60 border border-fantasy-700 flex flex-col items-center justify-center space-y-6">
          {/* Level Meter & Status */}
          <div className="w-full max-w-md space-y-2 text-center">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-amber-400" />
                Mic Level: {audioLevel}%
              </span>
              <span className="font-mono text-amber-300">
                {isRecording ? "🔴 RECORDING" : "STANDBY"}
              </span>
            </div>

            {/* Visualizer Bar */}
            <div className="w-full h-3 bg-fantasy-800 rounded-full overflow-hidden border border-fantasy-700 p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-75 ${
                  audioLevel > 75
                    ? "bg-rose-500"
                    : audioLevel > 35
                    ? "bg-amber-400"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${Math.max(2, audioLevel)}%` }}
              />
            </div>
          </div>

          {/* Timers */}
          {isRecording && (
            <div className="flex items-center gap-6 text-center">
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  Total Session Time
                </span>
                <p className="text-3xl font-mono font-bold text-amber-200">
                  {formatTime(elapsedSeconds)}
                </p>
              </div>
              <div className="w-px h-10 bg-fantasy-700" />
              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                  Current Chunk #{currentChunkIndex + 1}
                </span>
                <p className="text-2xl font-mono font-bold text-slate-300">
                  {formatTime(chunkSeconds)} / 10:00
                </p>
              </div>
            </div>
          )}

          {/* Main Action Button */}
          <div>
            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                className="px-8 py-3.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-serif font-bold text-base shadow-lg shadow-rose-950/60 flex items-center gap-2.5 hover:scale-105 transition-transform"
              >
                <Mic className="w-5 h-5 animate-pulse" />
                Start Recording Session
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="px-8 py-3.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-serif font-bold text-base border border-slate-600 shadow-lg flex items-center gap-2.5 transition"
              >
                <Square className="w-5 h-5 text-rose-500 fill-rose-500" />
                Stop Recording & Save Chunk
              </button>
            )}
          </div>
        </div>
      )}

      {/* Recorded Chunks List */}
      <div className="space-y-3">
        <h3 className="font-serif font-semibold text-sm text-slate-200 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileAudio className="w-4 h-4 text-amber-400" />
            Session Chunks & Transcripts ({chunks.length})
          </span>
          <button
            type="button"
            onClick={fetchChunks}
            className="text-xs text-amber-400 hover:text-amber-300"
          >
            Refresh
          </button>
        </h3>

        {chunks.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs italic bg-fantasy-900/40 rounded-xl border border-fantasy-700">
            No audio chunks recorded for this session yet.
          </div>
        ) : (
          <div className="space-y-3">
            {chunks.map((chunk) => (
              <div
                key={chunk.index}
                className="p-4 rounded-xl bg-fantasy-850 border border-fantasy-700/80 shadow space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded bg-fantasy-800 text-amber-300 border border-fantasy-700 font-mono text-xs font-bold">
                      Chunk #{chunk.index + 1}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{chunk.file}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {chunk.transcribed ? (
                      <span className="px-2 py-0.5 text-xs rounded bg-emerald-950/60 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Transcribed
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleTranscribeChunk(chunk.index)}
                        disabled={transcribingIndex === chunk.index}
                        className="px-3 py-1 text-xs font-semibold rounded bg-amber-600 hover:bg-amber-500 text-slate-950 flex items-center gap-1.5 transition disabled:opacity-50"
                      >
                        {transcribingIndex === chunk.index ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                        Transcribe with Gemini
                      </button>
                    )}
                  </div>
                </div>

                {/* Local audio playback & download */}
                {localBlobs[chunk.index]?.url && (
                  <div className="flex items-center gap-2 pt-2 border-t border-fantasy-700/40">
                    <audio
                      controls
                      src={localBlobs[chunk.index].url}
                      className="w-full h-8 rounded bg-fantasy-900 border border-fantasy-700"
                    />
                    <a
                      href={localBlobs[chunk.index].url}
                      download={`session-${sessionDate}-chunk-${chunk.index + 1}.webm`}
                      className="p-2 rounded bg-fantasy-800 text-slate-300 hover:text-white border border-fantasy-700 transition flex items-center gap-1 text-xs"
                      title="Download audio chunk"
                    >
                      <Download className="w-4 h-4 text-amber-400" />
                    </a>
                  </div>
                )}

                {/* Gemini Transcript & Actions */}
                {chunk.text && (
                  <div className="space-y-2 pt-2 border-t border-fantasy-700/50">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> Lore-Aware Transcript:
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (navigator.clipboard) navigator.clipboard.writeText(chunk.text || "");
                            alert("Transcript copied to clipboard!");
                          }}
                          className="px-2 py-1 text-[11px] rounded bg-fantasy-800 text-slate-300 hover:text-white border border-fantasy-700 flex items-center gap-1 transition"
                        >
                          <Copy className="w-3 h-3 text-slate-400" /> Copy
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendToScratchpad(chunk.text || "")}
                          className="px-2 py-1 text-[11px] rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold flex items-center gap-1 transition"
                        >
                          <Send className="w-3 h-3" /> Add to Scratchpad
                        </button>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-fantasy-900 border border-fantasy-700/60 text-xs text-slate-300 max-h-48 overflow-y-auto whitespace-pre-wrap font-sans leading-relaxed">
                      {chunk.text}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
