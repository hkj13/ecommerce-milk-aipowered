"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type Rec = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

/**
 * Voice search with the browser's built-in speech recognition (Chrome, Edge,
 * Safari). Optional feature from the project brief: where the browser has no
 * speech recognition, the mic button simply isn't shown.
 */
const getCtor = () => {
  const W = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  return W.SpeechRecognition ?? W.webkitSpeechRecognition;
};
const noop = () => () => {};

export function useSpeech(onText: (text: string) => void) {
  const supported = useSyncExternalStore(noop, () => !!getCtor(), () => false);
  const [listening, setListening] = useState(false);
  const rec = useRef<Rec | null>(null);
  const cb = useRef(onText);
  useEffect(() => {
    cb.current = onText;
  });

  useEffect(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = "en-IN";
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript ?? "";
      if (text) cb.current(text);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
  }, []);

  return {
    supported,
    listening,
    start: () => {
      try {
        rec.current?.start();
        setListening(true);
      } catch {
        setListening(false);
      }
    },
    stop: () => {
      rec.current?.stop();
      setListening(false);
    },
  };
}
