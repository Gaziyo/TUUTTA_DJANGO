import { TTSOptions } from '../types';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import { logger } from './logger';

export class SpeechSynthesizer {
  private audioContext: AudioContext | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private ttsCall = httpsCallable(functions, 'genieTextToSpeech');
  private browserOpenAIKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;

  constructor() {
  }

  private async initAudioContext() {
    try {
      if (!this.audioContext || this.audioContext.state === 'closed') {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContextClass();
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      return this.audioContext;
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      throw new Error('Could not initialize audio. Please check your audio settings.');
    }
  }

  async speak(text: string, options: Partial<TTSOptions> = {}) {
    try {
      // Stop any currently playing audio
      this.stop();

      const defaultOptions: TTSOptions = {
        model: 'tts-1',
        voice: 'nova',
        speed: 1.0,
      };

      const finalOptions = { ...defaultOptions, ...options };

      const boundedText = text.slice(0, 4096);

      try {
        const result = await this.ttsCall({
          text: boundedText,
          voice: finalOptions.voice,
          speed: finalOptions.speed
        });
        const payload = result.data as { base64Audio?: string };
        if (!payload.base64Audio) {
          throw new Error('Speech synthesis failed: no audio returned.');
        }

        await this.playBase64Mp3(payload.base64Audio);
        return;
      } catch (error) {
        logger.warn('Server TTS failed, trying browser OpenAI TTS fallback:', error);
        try {
          await this.useBrowserOpenAITTS(boundedText, finalOptions);
        } catch (openAiFallbackError) {
          logger.error('Browser OpenAI TTS fallback failed:', openAiFallbackError);
          throw new Error('OpenAI TTS is unavailable right now.');
        }
      }
    } catch (error) {
      console.error('Speech synthesis error:', error);
      throw error instanceof Error ? error : new Error('Failed to play speech.');
    }
  }

  private async useBrowserOpenAITTS(text: string, options: Partial<TTSOptions>): Promise<void> {
    if (!this.browserOpenAIKey) {
      throw new Error('Browser OpenAI key is not configured.');
    }

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.browserOpenAIKey}`
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice: options.voice || 'nova',
        input: text.slice(0, 4096),
        response_format: 'mp3',
        speed: options.speed || 1.0
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Browser OpenAI TTS failed (${response.status}): ${errorText || response.statusText}`);
    }

    const audioData = await response.arrayBuffer();
    await this.playArrayBufferMp3(audioData);
  }

  private async playBase64Mp3(base64Audio: string): Promise<void> {
    const binary = atob(base64Audio);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    await this.playArrayBufferMp3(bytes.buffer);
  }

  private async playArrayBufferMp3(audioData: ArrayBuffer): Promise<void> {
    const blob = new Blob([audioData], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.preload = 'auto';
    this.currentAudio = audio;

    try {
      const playResult = audio.play();
      if (playResult && typeof playResult.then === 'function') {
        await playResult;
      }
    } catch (error) {
      URL.revokeObjectURL(url);
      this.currentAudio = null;
      throw error;
    }

    return new Promise<void>((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
        reject(new Error('Audio playback failed.'));
      };
      audio.onpause = () => {
        if (audio.ended) return;
        URL.revokeObjectURL(url);
        if (this.currentAudio === audio) {
          this.currentAudio = null;
        }
        resolve();
      };
    });
  }

  stop() {
    try {
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio.src = '';
        this.currentAudio = null;
      }
      if (this.currentSource) {
        this.currentSource.stop();
        this.currentSource.disconnect();
        this.currentSource = null;
      }
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
  }
}
