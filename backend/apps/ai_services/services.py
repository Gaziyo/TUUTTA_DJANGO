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
