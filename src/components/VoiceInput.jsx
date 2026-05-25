import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * VoiceInput — Browser-native speech recognition with animated UI.
 *
 * Props:
 *   onResult(text)   — callback fired with the final transcription string
 *   onSending        — optional: called when the transcript is being processed
 *   placeholder      — input placeholder text
 *   className        — wrapper classes
 */

const SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

const VoiceInput = ({
  onResult,
  placeholder = 'Tap the mic and say what you ate…',
  className = '',
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState('');
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += text;
        } else {
          interim += text;
        }
      }

      if (final) {
        setTranscript(final);
        setInterimText('');
      } else {
        setInterimText(interim);
      }
    };

    recognition.onerror = (event) => {
      console.error('[VoiceInput] Error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please enable it in browser settings.');
      } else if (event.error === 'no-speech') {
        setError('No speech detected. Try again.');
      } else {
        setError(`Voice error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, []);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;
    setError('');

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      setInterimText('');
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        // Already started — ignore
        console.warn('[VoiceInput] Recognition already started');
      }
    }
  }, [isListening]);

  const handleSubmit = () => {
    if (transcript.trim() && onResult) {
      onResult(transcript.trim());
      setTranscript('');
      setInterimText('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && transcript.trim()) {
      handleSubmit();
    }
  };

  if (!supported) {
    return (
      <div className={`flex items-center gap-3 p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 ${className}`}>
        <span className="material-symbols-outlined text-on-surface-variant">mic_off</span>
        <p className="text-sm text-on-surface-variant">
          Voice input is not supported in this browser. Try Chrome or Edge.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Input row */}
      <div className="flex items-center gap-3">
        {/* Mic button */}
        <button
          onClick={toggleListening}
          className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
            isListening
              ? 'bg-error text-white shadow-lg'
              : 'bg-primary text-on-primary shadow-md hover:shadow-lg'
          }`}
          aria-label={isListening ? 'Stop listening' : 'Start voice input'}
        >
          {/* Pulsing ring while listening */}
          <AnimatePresence>
            {isListening && (
              <motion.div
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 1.8, opacity: 0 }}
                exit={{ scale: 1, opacity: 0 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
                className="absolute inset-0 rounded-full bg-error/40"
              />
            )}
          </AnimatePresence>

          <span className="material-symbols-outlined text-[22px] relative z-10">
            {isListening ? 'stop' : 'mic'}
          </span>
        </button>

        {/* Text display / editable field */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={transcript || interimText}
            onChange={(e) => setTranscript(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? 'Listening…' : placeholder}
            className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
          />

          {/* Listening indicator */}
          {isListening && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <motion.div
                animate={{ scaleY: [0.4, 1, 0.4] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                className="w-0.5 h-4 bg-error rounded-full"
              />
              <motion.div
                animate={{ scaleY: [0.6, 1, 0.6] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
                className="w-0.5 h-4 bg-error rounded-full"
              />
              <motion.div
                animate={{ scaleY: [0.3, 1, 0.3] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
                className="w-0.5 h-4 bg-error rounded-full"
              />
            </div>
          )}
        </div>

        {/* Send button */}
        <AnimatePresence>
          {transcript.trim() && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              onClick={handleSubmit}
              className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md hover:shadow-lg transition-shadow cursor-pointer flex-shrink-0"
              aria-label="Send voice log"
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="text-xs text-error font-medium px-1"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Helper text */}
      {!isListening && !transcript && !error && (
        <p className="text-[11px] text-on-surface-variant/70 px-1">
          <span className="font-semibold">Tip:</span> Say something like{' '}
          <em>"I had two eggs and a glass of milk for breakfast"</em> — the AI will log it automatically.
        </p>
      )}
    </div>
  );
};

export default VoiceInput;
