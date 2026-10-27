/**
 * Real-Time Audio Recorder and WebSocket Streaming Service
 * Captures microphone audio via Web Audio API, encodes to 16kHz 16-bit PCM,
 * and streams chunks to the Spring Boot backend WebSocket endpoint.
 */

export class SpeechWebSocketStreamer {
  constructor(options = {}) {
    this.options = options;
    this.socket = null;
    this.audioContext = null;
    this.mediaStream = null;
    this.processor = null;
    this.source = null;
    this.isRecording = false;
    this.onPartial = options.onPartial || (() => {});
    this.onFinal = options.onFinal || (() => {});
    this.onError = options.onError || (() => {});
    this.onStatus = options.onStatus || (() => {});
    this.onVolume = options.onVolume || (() => {});
  }

  getWebSocketUrl() {
    const savedUrl = localStorage.getItem('procucev_ws_url');
    if (savedUrl && savedUrl.trim()) {
      return savedUrl.trim();
    }
    const backendUrl = localStorage.getItem('procucev_backend_url') || 'http://localhost:8080';
    try {
      const parsed = new URL(backendUrl);
      const wsProtocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProtocol}//${parsed.host}/ws/transcribe`;
    } catch {
      return 'ws://localhost:8080/ws/transcribe';
    }
  }

  async start(config = {}) {
    if (this.isRecording) {
      console.warn('Speech streamer already recording. Stopping previous session.');
      this.stop();
    }

    try {
      this.onStatus('Requesting microphone permission...');

      // 1. Request microphone permission
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.onStatus('Connecting to speech recognition gateway...');

      // 2. Connect WebSocket
      const wsUrl = this.getWebSocketUrl();
      this.socket = new WebSocket(wsUrl);
      this.socket.binaryType = 'arraybuffer';

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timed out after 10s'));
        }, 10000);

        this.socket.onopen = () => {
          clearTimeout(timeout);
          this.onStatus('Gateway connected. Initializing speech session...');
          // Send start action
          this.socket.send(
            JSON.stringify({
              action: 'start',
              provider: config.provider || 'deepgram',
              language: config.language || 'hi',
              model: config.model || 'nova-2',
            })
          );
          resolve();
        };

        this.socket.onerror = (err) => {
          clearTimeout(timeout);
          reject(new Error('Failed to connect to speech gateway at ' + wsUrl));
        };
      });

      // 3. Setup WebSocket message handlers
      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'partial') {
            this.onPartial(data.text);
          } else if (data.type === 'final') {
            this.onFinal(data.text, data.language, data.confidence);
          } else if (data.type === 'status') {
            this.onStatus(data.message);
          } else if (data.type === 'error') {
            this.onError(data.message);
          } else if (data.type === 'closed') {
            this.onStatus(data.message || 'Stream closed');
          }
        } catch (e) {
          console.warn('Error parsing incoming speech event:', event.data, e);
        }
      };

      this.socket.onclose = (event) => {
        if (this.isRecording) {
          this.onStatus('Connection closed');
        }
      };

      // 4. Setup AudioContext and PCM audio streaming pipeline
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioContextClass();
      const inputSampleRate = this.audioContext.sampleRate;
      const targetSampleRate = 16000;

      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      // Buffer size: 4096 samples
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (!this.isRecording || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
          return;
        }

        const inputChannelData = e.inputBuffer.getChannelData(0);

        // Calculate audio RMS level for visualizer
        let sumSquares = 0;
        for (let i = 0; i < inputChannelData.length; i++) {
          sumSquares += inputChannelData[i] * inputChannelData[i];
        }
        const rms = Math.sqrt(sumSquares / inputChannelData.length);
        const volumeLevel = Math.min(1, rms * 5); // Normalized 0-1
        this.onVolume(volumeLevel);

        // Downsample to 16kHz linear PCM
        const downsampled = this.downsampleBuffer(inputChannelData, inputSampleRate, targetSampleRate);
        const pcmBuffer = this.floatTo16BitPCM(downsampled);

        // Stream PCM binary buffer over WebSocket
        this.socket.send(pcmBuffer);
      };

      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      this.isRecording = true;
      this.onStatus('Listening & transcribing in real-time...');
      return true;

    } catch (err) {
      this.stop();
      this.onError(err.message || 'Failed to start recording');
      throw err;
    }
  }

  downsampleBuffer(buffer, sampleRate, outSampleRate) {
    if (outSampleRate === sampleRate) {
      return buffer;
    }
    if (outSampleRate > sampleRate) {
      throw new Error('Downsampling rate must be lower than input rate');
    }
    const sampleRateRatio = sampleRate / outSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0;
      let count = 0;
      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }
      result[offsetResult] = count > 0 ? accum / count : 0;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }
    return result;
  }

  floatTo16BitPCM(float32Array) {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
      let s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); // Little endian
    }
    return buffer;
  }

  stop() {
    this.isRecording = false;

    // Send stop control action
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify({ action: 'stop' }));
      } catch (ignored) {}
    }

    // Stop microphone tracks
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    // Disconnect audio nodes
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    // Close WebSocket
    if (this.socket) {
      try {
        this.socket.close();
      } catch (ignored) {}
      this.socket = null;
    }

    this.onVolume(0);
    this.onStatus('Idle');
  }
}
