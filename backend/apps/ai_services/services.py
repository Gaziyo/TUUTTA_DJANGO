import base64
import openai
from django.conf import settings


class AIService:
    def __init__(self):
        self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)

    def chat_completion(self, messages: list, model: str = 'gpt-4o-mini') -> str:
        response = self.client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=4096,
        )
        return response.choices[0].message.content

    def transcribe_audio(self, audio_file) -> str:
        transcript = self.client.audio.transcriptions.create(
            model='whisper-1',
            file=audio_file,
        )
        return transcript.text

    def text_to_speech(self, text: str, voice: str = 'nova', speed: float = 1.0) -> bytes:
        """Convert text to speech via OpenAI TTS. Returns raw MP3 bytes."""
        response = self.client.audio.speech.create(
            model='tts-1',
            voice=voice,
            input=text[:4096],
            speed=max(0.25, min(4.0, speed)),
            response_format='mp3',
        )
        return response.content

    def analyze_image(self, image_url: str, prompt: str) -> str:
        response = self.client.chat.completions.create(
            model='gpt-4o',
            messages=[
                {
                    'role': 'user',
                    'content': [
                        {'type': 'text', 'text': prompt},
                        {'type': 'image_url', 'image_url': {'url': image_url}},
                    ],
                }
            ],
        )
        return response.choices[0].message.content

    def text_embedding(self, text: str, model: str = 'text-embedding-3-small') -> list[float]:
        response = self.client.embeddings.create(
            model=model,
            input=text[:8000],
        )
        return response.data[0].embedding
