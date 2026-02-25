import WaveSurfer from 'wavesurfer.js';
import { apiClient } from './api';
import { logger } from './logger';

export class VoiceRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording = false;
  private audioContext: AudioContext | null = null;
  private recordingStartTime: number = 0;
  private wavesurfer: WaveSurfer | null = null;
  private recordingDuration: number = 0;
  private recordingInterval: NodeJS.Timeout | null = null;

  private async initAudioContext() {
    if (!this.audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('AudioContext is not supported in this browser');
      }
      this.audioContext = new AudioContextClass();
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  initWaveform(containerId: string) {
    try {
      // Safely destroy existing instance if it exists
      if (this.wavesurfer) {
        try {
          this.wavesurfer.destroy();
        } catch (error) {
          logger.warn('Error destroying WaveSurfer instance:', error);
        }
        this.wavesurfer = null;
      }

      // Create new instance
      const container = document.getElementById(containerId);
      if (!container) {
        throw new Error(`Container element with id "${containerId}" not found`);
      }

      this.wavesurfer = WaveSurfer.create({
        container: `#${containerId}`,
        waveColor: '#4F46E5',
        progressColor: '#818CF8',
        cursorColor: '#4F46E5',
        barWidth: 2,
        barGap: 1,
        height: 60,
        normalize: true,
      });

      return this.wavesurfer;
    } catch (error) {
      console.error('Error initializing waveform:', error);
      return null;
    }
  }

  async startRecording(maxDuration: number = 60): Promise<void> {
    if (this.isRecording) {
      throw new Error('Recording is already in progress');
    }

    try {
      await this.initAudioContext();

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Audio recording is not supported in this browser');
      }

      // Detect mobile devices for compatibility adjustments
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

      // Use simpler constraints for mobile devices - iOS especially has issues with advanced constraints
      const audioConstraints: MediaTrackConstraints = isMobile
        ? {
            echoCancellation: true,
            noiseSuppression: true
          }
        : {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: { ideal: 16000 }
          };

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints
      });

      const mimeType = this.getSupportedMimeType();
      
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000
      });

      this.audioChunks = [];
      this.recordingStartTime = Date.now();
      this.recordingDuration = 0;
      
      this.mediaRecorder.addEventListener('dataavailable', (event: BlobEvent) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      });

      this.mediaRecorder.addEventListener('error', (event) => {
        const error = event instanceof Error ? event : event instanceof ErrorEvent ? event.error : new Error('Recording device error');
        console.error('MediaRecorder error:', error);
        this.cleanup();
        throw error;
      });

      // Start recording and update duration
      this.mediaRecorder.start(100);
      this.isRecording = true;

      // Set up duration tracking
      this.recordingInterval = setInterval(() => {
        this.recordingDuration = (Date.now() - this.recordingStartTime) / 1000;
        if (this.recordingDuration >= maxDuration) {
          this.stopRecording();
        }
      }, 100);

    } catch (error) {
      this.cleanup();
      
      if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotAllowedError':
            throw new Error('Please allow microphone access to record audio');
          case 'NotFoundError':
            throw new Error('No microphone found. Please connect a microphone and try again');
          case 'NotReadableError':
            throw new Error('Could not access your microphone. Please check your device settings');
          case 'SecurityError':
            throw new Error('Microphone access is blocked. Please check your browser settings');
          case 'AbortError':
            throw new Error('Recording was aborted. Please try again');
          default:
            throw new Error(`Microphone error: ${error.message}`);
        }
      }
      
      throw error instanceof Error ? error : new Error('Failed to start recording');
    }
  }

  getRecordingDuration(): number {
    return this.recordingDuration;
  }

  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
      'audio/mpeg',
      'audio/wav'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm';
  }

  private cleanup(): void {
    try {
      // Stop media recorder and clear chunks
      if (this.mediaRecorder) {
        if (this.mediaRecorder.state !== 'inactive') {
          try {
            this.mediaRecorder.stop();
          } catch (error) {
            logger.warn('Error stopping MediaRecorder:', error);
          }
        }
        
        if (this.mediaRecorder.stream) {
          this.mediaRecorder.stream.getTracks().forEach(track => {
            try {
              track.stop();
            } catch (error) {
              logger.warn('Error stopping track:', error);
            }
          });
        }
      }

      // Clear recording interval
      if (this.recordingInterval) {
        clearInterval(this.recordingInterval);
        this.recordingInterval = null;
      }

      // Safely destroy WaveSurfer instance
      if (this.wavesurfer) {
        try {
          // Check if the instance is still valid
          if (this.wavesurfer.getWrapper()) {
            this.wavesurfer.destroy();
          }
        } catch (error) {
          logger.warn('Error destroying WaveSurfer:', error);
        }
        this.wavesurfer = null;
      }

    } catch (error) {
      logger.warn('Error in cleanup:', error);
    } finally {
      // Reset all state variables
      this.mediaRecorder = null;
      this.audioChunks = [];
      this.isRecording = false;
      this.recordingStartTime = 0;
      this.recordingDuration = 0;
    }
  }

  async stopRecording(): Promise<Blob> {
    if (!this.isRecording || !this.mediaRecorder) {
      throw new Error('No recording in progress');
    }

    // Store reference to avoid null checks in callbacks
    const recorder = this.mediaRecorder;

    return new Promise((resolve, reject) => {
      try {
        const handleStop = () => {
          try {
            if (this.audioChunks.length === 0) {
              throw new Error('No audio data recorded');
            }

            const mimeType = recorder.mimeType || 'audio/webm';
            const audioBlob = new Blob(this.audioChunks, { type: mimeType });

            // Load the recorded audio into the waveform
            if (this.wavesurfer) {
              try {
                const audioUrl = URL.createObjectURL(audioBlob);
                this.wavesurfer.load(audioUrl);
              } catch (error) {
                logger.warn('Error loading audio into waveform:', error);
              }
            }

            this.cleanup();
            resolve(audioBlob);
          } catch (error) {
            this.cleanup();
            reject(error instanceof Error ? error : new Error('Failed to process recording'));
          }
        };

        recorder.addEventListener('stop', handleStop, { once: true });
        recorder.stop();
      } catch (error) {
        this.cleanup();
        reject(error instanceof Error ? error : new Error('Failed to stop recording'));
      }
    });
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  if (!audioBlob || audioBlob.size === 0) {
    throw new Error('No audio recorded. Please try again');
  }

  if (audioBlob.size > 25 * 1024 * 1024) {
    throw new Error('Audio recording is too long. Please keep it under 25MB');
  }

  try {
    // Detect if we're on a mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    
    // Get the current audio format
    const currentFormat = audioBlob.type.split('/')[1]?.split(';')[0] || '';
    logger.debug(`Current audio format: ${currentFormat}, Mobile: ${isMobile}, Safari: ${isSafari}`);
    
    // List of formats supported by OpenAI's API
    const supportedFormats = ['flac', 'm4a', 'mp3', 'mp4', 'mpeg', 'mpga', 'oga', 'ogg', 'wav', 'webm'];
    
    // Check if the current format is supported
    const isFormatSupported = supportedFormats.includes(currentFormat.toLowerCase());
    
    // If we're on a mobile device and the format isn't supported, show a more helpful message
    if (isMobile && !isFormatSupported) {
      throw new Error(
        'Voice recording is not fully supported on this mobile device. Please try typing your question instead.'
      );
    }
    
    // If we're on Safari, which often has compatibility issues, show a specific message
    if (isSafari && !isFormatSupported) {
      throw new Error(
        'Safari browser has limited support for voice recording. Please try using Chrome or type your question instead.'
      );
    }

    const extension = (audioBlob.type.split('/')[1]?.split(';')[0] || 'webm').replace('mpeg', 'mp3');
    const formData = new FormData();
    formData.append('audio', audioBlob, `recording.${extension}`);

    const { data } = await apiClient.post('/ai/transcribe/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const text = (data as { transcript?: string })?.transcript;
    if (!text?.trim()) {
      throw new Error('No speech detected. Please try speaking more clearly');
    }
    return text;
  } catch (error) {
    console.error('Transcription error:', error);
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Network error. Please check your internet connection');
      }
      throw error;
    }
    throw new Error('Failed to transcribe audio');
  }
};
