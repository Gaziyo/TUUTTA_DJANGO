import { TTSOptions } from '../types';
import { textToSpeech } from './ai';

export class SpeechSynthesizer {
  private currentSource: AudioBufferSourceNode | null = null;
  private currentAudio: HTMLAudioElement | null = null;

  constructor() {
  }

  async speak(text: string, options: Partial<TTSOptions> = {}) {
    try {
      this.stop();

      const voice = options.voice || 'nova';
      const speed = options.speed || 1.0;
      const boundedText = text.slice(0, 4096);

      const base64Audio = await textToSpeech(boundedText, voice, speed);
      await this.playBase64Mp3(base64Audio);
    } catch (error) {
      console.error('Speech synthesis error:', error);
      throw error instanceof Error ? error : new Error('Failed to play speech.');
    }
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
