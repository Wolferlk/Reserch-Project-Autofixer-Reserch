import { useEffect, useRef, useState } from 'react';

type SpeechToTextHook = {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
};

export function useSpeechToText(): SpeechToTextHook {
  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const text = event?.results?.[0]?.[0]?.transcript || '';
      setTranscript(text);
      setError(null);
    };

    recognition.onerror = (event: any) => {
      if (event?.error && event.error !== 'aborted') {
        setError(`Speech error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;

    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        // Ignore cleanup errors from browser speech API.
      }
    };
  }, []);

  const startListening = () => {
    setTranscript('');
    setError(null);
    try {
      recognitionRef.current?.start();
      setIsListening(true);
    } catch {
      setError('Unable to start speech recognition.');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // Ignore stop errors.
    }
    setIsListening(false);
  };

  return { isListening, isSupported, transcript, error, startListening, stopListening };
}
