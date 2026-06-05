"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createRecognition,
  isSpeechSupported,
  speak,
  stopSpeaking,
  type SpeechRecognitionLike
} from "@/lib/speech";

type Message = { role: "user" | "assistant"; content: string };
type Status = "idle" | "listening" | "thinking" | "speaking";

const STATUS_TEXT: Record<Status, string> = {
  idle: "Tap to call",
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking…"
};

export default function Home() {
  const [callActive, setCallActive] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  // Refs let our async recognition/synthesis callbacks read the latest state.
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const callActiveRef = useRef(false);
  const messagesRef = useRef<Message[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSupported(isSpeechSupported());
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const beginListening = useCallback(() => {
    if (!callActiveRef.current) return;
    const recognition = recognitionRef.current;
    if (!recognition) return;
    setStatus("listening");
    try {
      recognition.start();
    } catch {
      // start() throws if already started; ignore and keep going.
    }
  }, []);

  const handleUserSpeech = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !callActiveRef.current) return;

      const nextMessages: Message[] = [
        ...messagesRef.current,
        { role: "user", content: trimmed }
      ];
      setMessages(nextMessages);
      setStatus("thinking");

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: nextMessages })
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Something went wrong.");
        }

        const reply: string = data.reply;
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);

        if (!callActiveRef.current) return;
        setStatus("speaking");
        speak(reply, () => {
          if (callActiveRef.current) beginListening();
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
        if (callActiveRef.current) beginListening();
      }
    },
    [beginListening]
  );

  const startCall = useCallback(() => {
    setError(null);
    const recognition = createRecognition();
    if (!recognition) {
      setSupported(false);
      return;
    }

    recognition.onresult = (event) => {
      let finalText = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
      }
      if (finalText) {
        recognition.stop();
        handleUserSpeech(finalText);
      }
    };

    recognition.onerror = (event) => {
      // "no-speech" / "aborted" are normal during a call; just keep listening.
      if (event.error === "no-speech" || event.error === "aborted") return;
      if (event.error === "not-allowed") {
        setError("Microphone access was blocked. Allow the mic and try again.");
        endCall();
        return;
      }
      setError(`Speech error: ${event.error}`);
    };

    recognition.onend = () => {
      // If recognition ended on its own while we're still listening, restart it.
      if (callActiveRef.current && status === "listening") {
        beginListening();
      }
    };

    recognitionRef.current = recognition;
    callActiveRef.current = true;
    setCallActive(true);
    beginListening();
  }, [beginListening, handleUserSpeech, status]);

  function endCall() {
    callActiveRef.current = false;
    setCallActive(false);
    setStatus("idle");
    stopSpeaking();
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onend = null;
      recognition.onresult = null;
      recognition.onerror = null;
      try {
        recognition.abort();
      } catch {
        // ignore
      }
    }
    recognitionRef.current = null;
  }

  useEffect(() => {
    return () => {
      callActiveRef.current = false;
      stopSpeaking();
      recognitionRef.current?.abort();
    };
  }, []);

  return (
    <div className="app">
      <div className="header">
        <h1>Call Claude</h1>
        <div className={`status ${status}`}>{STATUS_TEXT[status]}</div>
      </div>

      {!supported && (
        <div className="error">
          Voice isn&apos;t supported in this browser. Try Chrome, Edge, or Safari.
        </div>
      )}
      {error && <div className="error">{error}</div>}

      <div className="transcript">
        {messages.length === 0 ? (
          <div className="empty">
            Tap the green button and start talking.
            <br />
            Claude will answer out loud.
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`bubble ${m.role === "user" ? "you" : "claude"}`}>
              {m.content}
            </div>
          ))
        )}
        <div ref={transcriptEndRef} />
      </div>

      <div className="controls">
        {callActive ? (
          <button className="call-btn end" onClick={endCall} aria-label="Hang up">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.99.99 0 0 1-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28a11.27 11.27 0 0 0-2.66-1.85.998.998 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
            </svg>
          </button>
        ) : (
          <button
            className="call-btn start pulsing"
            onClick={startCall}
            disabled={!supported}
            aria-label="Start call"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
