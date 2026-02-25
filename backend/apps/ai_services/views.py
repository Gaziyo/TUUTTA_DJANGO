import base64
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from .services import AIService
from .search import fetch_duckduckgo_results, search_and_scrape


class ChatCompletionView(APIView):
    def post(self, request):
        messages = request.data.get('messages', [])
        model = request.data.get('model', 'gpt-4o-mini')

        service = AIService()
        response = service.chat_completion(messages, model)

        return Response({'content': response})


class TranscribeView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        audio_file = request.FILES.get('audio')
        if not audio_file:
            return Response({'error': 'No audio file provided'}, status=400)

        service = AIService()
        transcript = service.transcribe_audio(audio_file)

        return Response({'transcript': transcript})


class TextToSpeechView(APIView):
    def post(self, request):
        text = request.data.get('text', '').strip()
        if not text:
            return Response({'error': 'No text provided'}, status=400)

        voice = request.data.get('voice', 'nova')
        speed = float(request.data.get('speed', 1.0))

        service = AIService()
        mp3_bytes = service.text_to_speech(text, voice=voice, speed=speed)
        base64_audio = base64.b64encode(mp3_bytes).decode('utf-8')

        return Response({'base64Audio': base64_audio, 'format': 'mp3'})


class WebSearchView(APIView):
    """
    DuckDuckGo-backed web search.
    mode=fast  -> returns {sources}
    mode=full  -> returns {sources, content} (scraped chunks)
    """

    def get(self, request):
        query = (request.query_params.get('query') or '').strip()
        mode = (request.query_params.get('mode') or 'fast').strip().lower()
        if not query:
            return Response({'error': 'query is required'}, status=400)

        if mode == 'full':
            payload = search_and_scrape(query)
        else:
            sources = fetch_duckduckgo_results(query)
            payload = {'query': query, 'sources': sources}

        return Response(payload)
