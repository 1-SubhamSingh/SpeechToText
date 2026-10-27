/**
 * Browser-Native Speech Recognition Engine (Web Speech API)
 * Provides real-time speech-to-text with interim/partial results and finalization.
 * Supports Hindi, English (India), and mixed Hinglish in Chromium browsers.
 */

export class BrowserSpeechRecognitionEngine {
  constructor(options = {}) {
    this.options = options;
    this.recognition = null;
    this.isRecording = false;
    this.onPartial = options.onPartial || (() => {});
    this.onFinal = options.onFinal || (() => {});
    this.onError = options.onError || (() => {});
    this.onStatus = options.onStatus || (() => {});
    this.onVolume = options.onVolume || (() => {});
    this.audioContext = null;
    this.mediaStream = null;
    this.analyser = null;
    this.animationId = null;
  }

  isSupported() {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }

  async start(config = {}) {
    if (!this.isSupported()) {
      throw new Error(
        'Web Speech API is not supported in this browser. Please use Google Chrome, Microsoft Edge, or switch to Backend Streaming mode.'
      );
    }

    if (this.isRecording) {
      this.stop();
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1;

    // Language configuration
    const lang = config.language || 'hi-IN';
    this.recognition.lang = lang;

    this.recognition.onstart = () => {
      this.isRecording = true;
      this.onStatus('Browser engine listening (Hinglish / ' + lang + ')...');
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        const text = item[0]?.transcript || '';
        if (item.isFinal) {
          if (text.trim()) {
            this.onFinal(text.trim(), lang, item[0]?.confidence || 0.95);
          }
        } else {
          interimTranscript += text;
        }
      }

      if (interimTranscript.trim()) {
        this.onPartial(interimTranscript.trim());
      }
    };

    this.recognition.onerror = (event) => {
      console.warn('Browser speech recognition event error:', event.error);
      if (event.error === 'no-speech') {
        // Normal pause, don't throw critical error
        return;
      }
      if (event.error === 'not-allowed') {
        this.onError('Microphone access was denied. Please grant microphone permission in your browser.');
      } else {
        this.onError(`Browser speech error: ${event.error}`);
      }
    };

    this.recognition.onend = () => {
      if (this.isRecording) {
        // Automatically restart if user hasn't explicitly stopped
        try {
          this.recognition.start();
        } catch (e) {
          this.stop();
        }
      }
    };

    // Start audio volume monitoring for live waveform
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        if (!this.isRecording) return;
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avg = sum / bufferLength;
        const normalized = Math.min(1, avg / 80);
        this.onVolume(normalized);
        this.animationId = requestAnimationFrame(updateVolume);
      };
      updateVolume();
    } catch (e) {
      console.warn('Audio visualization stream not available:', e);
    }

    this.recognition.start();
    this.isRecording = true;
  }

  stop() {
    this.isRecording = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (ignored) {}
      this.recognition = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.onVolume(0);
    this.onStatus('Idle');
  }
}
