from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser
from .services import AIService


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
