import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Play,
  RotateCcw,
  Copy,
  Save,
  Sparkles,
  AlertCircle,
  Volume2,
  Clock,
  Check,
  ChevronDown,
  Layers,
  Languages,
} from 'lucide-react';
import AudioVisualizer from '../components/AudioVisualizer';
import SaveTranscriptModal from '../components/SaveTranscriptModal';
import Toast from '../components/Toast';
import { SpeechWebSocketStreamer } from '../services/speechWebSocket';
import { BrowserSpeechRecognitionEngine } from '../services/browserSpeech';
import { transcriptionApi } from '../services/api';

export default function TranscribeView() {
  // Speech states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [volume, setVolume] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Ready to transcribe');
  const [errorMessage, setErrorMessage] = useState('');

  // Transcription text states
  const [finalizedText, setFinalizedText] = useState('');
  const [partialText, setPartialText] = useState('');
  const [isEditable, setIsEditable] = useState(false);

  // Configuration options
  const [provider, setProvider] = useState(() => localStorage.getItem('procucev_provider') || 'gemini');
  const [language, setLanguage] = useState(() => localStorage.getItem('procucev_lang') || 'hi-IN');

  // Modals & feedback
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'info' });

  // Refs for instances
  const timerRef = useRef(null);
  const streamerRef = useRef(null);
  const browserEngineRef = useRef(null);
  const transcriptEndRef = useRef(null);

  // Auto-scroll transcript container
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [finalizedText, partialText]);

  // Duration timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Save preferences
  useEffect(() => {
    localStorage.setItem('procucev_provider', provider);
  }, [provider]);

  useEffect(() => {
    localStorage.setItem('procucev_lang', language);
  }, [language]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const handleStartRecording = async () => {
    setErrorMessage('');
    setRecordingSeconds(0);
    setPartialText('');

    try {
      if (provider === 'browser') {
        // Use browser Web Speech API
        browserEngineRef.current = new BrowserSpeechRecognitionEngine({
          onPartial: (text) => {
            setPartialText(text);
          },
          onFinal: (text) => {
            setFinalizedText((prev) => (prev ? `${prev.trim()} ${text.trim()}` : text.trim()));
            setPartialText('');
          },
          onError: (err) => {
            setErrorMessage(err);
            handleStopRecording();
          },
          onStatus: (status) => setStatusMessage(status),
          onVolume: (vol) => setVolume(vol),
        });

        await browserEngineRef.current.start({ language });
        setIsRecording(true);
      } else {
        // Use Backend WebSocket Streaming Proxy (Deepgram Nova-2)
        streamerRef.current = new SpeechWebSocketStreamer({
          onPartial: (text) => {
            setPartialText(text);
          },
          onFinal: (text) => {
            setFinalizedText((prev) => (prev ? `${prev.trim()} ${text.trim()}` : text.trim()));
            setPartialText('');
          },
          onError: (err) => {
            setErrorMessage(err);
            showToast(err, 'error');
            handleStopRecording();
          },
          onStatus: (status) => setStatusMessage(status),
          onVolume: (vol) => setVolume(vol),
        });

        await streamerRef.current.start({
          provider: provider, // 'gemini', 'deepgram', or 'mock'
          language: language,
          model: provider === 'deepgram' ? 'nova-2' : 'gemini-2.0-flash-live-001',
        });
        setIsRecording(true);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Unable to access microphone or connect to transcription gateway');
      setIsRecording(false);
      setStatusMessage('Idle');
    }
  };

  const handleStopRecording = () => {
    if (streamerRef.current) {
      streamerRef.current.stop();
      streamerRef.current = null;
    }
    if (browserEngineRef.current) {
      browserEngineRef.current.stop();
      browserEngineRef.current = null;
    }
    setIsRecording(false);
    setVolume(0);
    setStatusMessage('Recording stopped');

    // If partial text remains upon stop, append it to finalized
    if (partialText.trim()) {
      setFinalizedText((prev) => (prev ? `${prev.trim()} ${partialText.trim()}` : partialText.trim()));
      setPartialText('');
    }
  };

  const handleClearTranscript = () => {
    if (isRecording) {
      handleStopRecording();
    }
    setFinalizedText('');
    setPartialText('');
    setRecordingSeconds(0);
    showToast('Transcript cleared', 'info');
  };

  const handleCopyToClipboard = async () => {
    const fullText = [finalizedText, partialText].filter(Boolean).join(' ').trim();
    if (!fullText) {
      showToast('No text to copy', 'info');
      return;
    }
    try {
      await navigator.clipboard.writeText(fullText);
      showToast('Transcript copied to clipboard!', 'success');
    } catch {
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const handleSaveToDatabase = async (data) => {
    await transcriptionApi.createTranscription(data);
    showToast('Transcript saved successfully to database!', 'success');
  };

  // Sample prompt to test multilingual Hinglish code-switching
  const handleLoadSampleHinglish = () => {
    const sample = 'Hello everyone, आज हम अपने project का progress discuss करेंगे.';
    setFinalizedText(sample);
    setPartialText('');
    showToast('Loaded sample Hinglish phrase', 'info');
  };

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const totalWords = finalizedText.trim()
    ? finalizedText.trim().split(/\s+/).length + (partialText.trim() ? partialText.trim().split(/\s+/).length : 0)
    : partialText.trim()
    ? partialText.trim().split(/\s+/).length
    : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Top Banner / Hero Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-300 border border-brand-500/20 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>Multilingual Hinglish Code-Switching Real-Time AI</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Live Speech to Text
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-xl">
            Speak naturally in mixed Hindi and English. Watch streaming provisional text crystallize into finalized segments without duplication.
          </p>
        </div>

        {/* Engine and Language Selectors */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Provider / Engine */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs">
            <Layers className="w-3.5 h-3.5 text-brand-400" />
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              disabled={isRecording}
              className="bg-transparent text-slate-200 outline-none font-medium cursor-pointer"
            >
              <option value="gemini" className="bg-slate-900 text-slate-200">
                ✨ Gemini Live (Real-Time AI)
              </option>
              <option value="deepgram" className="bg-slate-900 text-slate-200">
                Deepgram Nova-2 (WebSocket)
              </option>
              <option value="mock" className="bg-slate-900 text-slate-200">
                Mock Engine (Hinglish Simulator)
              </option>
              <option value="browser" className="bg-slate-900 text-slate-200">
                Browser Web Speech (Free / Native)
              </option>
            </select>
          </div>

          {/* Language Selection */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-xs">
            <Languages className="w-3.5 h-3.5 text-emerald-400" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={isRecording}
              className="bg-transparent text-slate-200 outline-none font-medium cursor-pointer"
            >
              <option value="hi-IN" className="bg-slate-900 text-slate-200">
                Hindi / Hinglish (hi-IN)
              </option>
              <option value="en-IN" className="bg-slate-900 text-slate-200">
                English (India) (en-IN)
              </option>
              <option value="en-US" className="bg-slate-900 text-slate-200">
                English (US) (en-US)
              </option>
              <option value="hi" className="bg-slate-900 text-slate-200">
                Hindi (Devanagari) (hi)
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Recording Control Center */}
      <div className="glass-panel p-6 sm:p-8 rounded-2xl flex flex-col items-center justify-center space-y-6 relative overflow-hidden">
        {/* Subtle background glow when recording */}
        {isRecording && (
          <div className="absolute inset-0 bg-brand-500/5 pointer-events-none animate-pulse-subtle" />
        )}

        {/* Status Indicator & Timer */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-medium">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isRecording ? 'bg-rose-500 animate-ping' : 'bg-slate-600'
              }`}
            />
            <span className={isRecording ? 'text-rose-400 font-semibold' : 'text-slate-400'}>
              {isRecording ? 'LIVE RECORDING' : 'IDLE'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono">
            <Clock className="w-3.5 h-3.5 text-brand-400" />
            <span>{formatTimer(recordingSeconds)}</span>
          </div>
        </div>

        {/* Prominent Recording Button */}
        <div className="relative flex items-center justify-center">
          {/* Pulsing ring waves when active */}
          {isRecording && (
            <>
              <div className="absolute w-28 h-28 rounded-full bg-rose-500/20 animate-ping pointer-events-none" />
              <div className="absolute w-36 h-36 rounded-full bg-brand-500/10 animate-pulse pointer-events-none" />
            </>
          )}

          <button
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            className={`relative z-10 w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-2xl focus:outline-none focus:ring-4 ${
              isRecording
                ? 'bg-rose-600 hover:bg-rose-500 text-white ring-rose-500/50 shadow-rose-600/50 scale-105'
                : 'bg-gradient-to-tr from-brand-600 to-indigo-500 hover:from-brand-500 hover:to-indigo-400 text-white ring-brand-500/40 shadow-brand-600/40 hover:scale-105'
            }`}
            aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}
          >
            {isRecording ? (
              <>
                <Square className="w-8 h-8 fill-current mb-0.5" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Stop</span>
              </>
            ) : (
              <>
                <Mic className="w-8 h-8 mb-0.5 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Speak</span>
              </>
            )}
          </button>
        </div>

        {/* Real-Time Audio Visualizer */}
        <div className="w-full max-w-xs">
          <AudioVisualizer isRecording={isRecording} volume={volume} />
        </div>

        {/* Current status message / tip */}
        <p className="text-xs text-slate-400 text-center italic">
          {statusMessage}
        </p>

        {/* Error notification banner if any */}
        {errorMessage && (
          <div className="w-full max-w-xl p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="flex-1">{errorMessage}</span>
            <button
              onClick={() => setErrorMessage('')}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Real-Time Transcript Display Area */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        {/* Transcript Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Transcript Stream</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
                {totalWords} words
              </span>
            </h2>
            <button
              type="button"
              onClick={() => setIsEditable(!isEditable)}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                isEditable
                  ? 'bg-brand-500/20 text-brand-300 border-brand-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              {isEditable ? '✓ Editing Mode' : '✎ Edit Text'}
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadSampleHinglish}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white transition-colors"
              title="Test with the assignment example sentence"
            >
              Test Sample Phrase
            </button>

            <button
              onClick={handleClearTranscript}
              disabled={!finalizedText && !partialText}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white disabled:opacity-40 transition-colors"
              title="Clear transcript"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>

            <button
              onClick={handleCopyToClipboard}
              disabled={!finalizedText && !partialText}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white disabled:opacity-40 transition-colors"
              title="Copy to clipboard"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </button>

            <button
              onClick={() => setIsSaveModalOpen(true)}
              disabled={!finalizedText && !partialText}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white shadow-sm shadow-brand-500/20 disabled:opacity-40 transition-all"
              title="Save transcript to PostgreSQL database"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Transcript</span>
            </button>
          </div>
        </div>

        {/* Transcript Content Container */}
        <div className="min-h-[220px] max-h-[460px] overflow-y-auto rounded-xl bg-slate-900/60 p-5 border border-slate-800/80">
          {!finalizedText && !partialText ? (
            <div className="h-44 flex flex-col items-center justify-center text-center text-slate-500">
              <Mic className="w-10 h-10 text-slate-700 mb-2 stroke-1" />
              <p className="text-sm font-medium">Click the microphone button above to start speaking.</p>
              <p className="text-xs text-slate-600 mt-1">
                Your words will appear here in near real-time in English, Hindi, or mixed Hinglish.
              </p>
            </div>
          ) : isEditable ? (
            <textarea
              value={finalizedText}
              onChange={(e) => setFinalizedText(e.target.value)}
              className="w-full h-44 bg-transparent text-slate-100 text-base leading-relaxed outline-none resize-none"
              placeholder="Transcript text..."
            />
          ) : (
            <div className="text-base sm:text-lg leading-relaxed space-x-1 select-text">
              {/* Finalized text segments (solid, permanent) */}
              {finalizedText && (
                <span className="text-slate-100 font-normal">
                  {finalizedText}
                </span>
              )}

              {/* Provisional partial text segment (soft pulsing emerald/indigo highlight) */}
              {partialText && (
                <span className="inline-block text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-medium italic animate-pulse">
                  {partialText}
                </span>
              )}
              <div ref={transcriptEndRef} />
            </div>
          )}
        </div>

        {/* Legend / Distinction Guide */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pt-1">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
              Finalized Segments
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
              Provisional Partial Text
            </span>
          </div>
          <span>Language: {language}</span>
        </div>
      </div>

      {/* Save Modal */}
      <SaveTranscriptModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={handleSaveToDatabase}
        defaultContent={[finalizedText, partialText].filter(Boolean).join(' ').trim()}
        defaultLanguage={language}
        durationSeconds={recordingSeconds}
      />

      {/* Feedback Toast */}
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '', type: 'info' })}
        />
      )}
    </div>
  );
}
