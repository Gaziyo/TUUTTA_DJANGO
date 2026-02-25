"""API tests for the ai_services endpoints (chat, transcribe, TTS).

The actual OpenAI calls are mocked so these tests run without a real API key.
"""
import base64
import io
import pytest
from unittest.mock import patch, MagicMock
from django.urls import reverse
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(
        username="ai@example.com",
        email="ai@example.com",
        password="AIPass1!",
    )


@pytest.fixture
def auth_client(api_client, user):
    resp = api_client.post(
        reverse("login"),
        {"email": "ai@example.com", "password": "AIPass1!"},
        format="json",
    )
    token = resp.data.get("access")
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return api_client


# ---------------------------------------------------------------------------
# Chat completion
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestChatCompletionView:
    def test_unauthenticated_rejected(self, api_client):
        resp = api_client.post(reverse("ai-chat"), {"messages": []}, format="json")
        assert resp.status_code == 401

    def test_chat_completion_success(self, auth_client):
        with patch("apps.ai_services.views.AIService") as MockService:
            instance = MockService.return_value
            instance.chat_completion.return_value = "Hello, I am an AI tutor."

            resp = auth_client.post(
                reverse("ai-chat"),
                {
                    "messages": [{"role": "user", "content": "Hello"}],
                    "model": "gpt-4o-mini",
                },
                format="json",
            )

        assert resp.status_code == 200
        assert resp.data["content"] == "Hello, I am an AI tutor."

    def test_chat_completion_empty_messages(self, auth_client):
        with patch("apps.ai_services.views.AIService") as MockService:
            instance = MockService.return_value
            instance.chat_completion.return_value = ""

            resp = auth_client.post(
                reverse("ai-chat"),
                {"messages": []},
                format="json",
            )

        assert resp.status_code == 200
        assert "content" in resp.data

    def test_chat_uses_default_model(self, auth_client):
        with patch("apps.ai_services.views.AIService") as MockService:
            instance = MockService.return_value
            instance.chat_completion.return_value = "response"

            auth_client.post(
                reverse("ai-chat"),
                {"messages": [{"role": "user", "content": "Hi"}]},
                format="json",
            )
            # Default model should be passed
            call_args = instance.chat_completion.call_args
            assert call_args[0][1] == "gpt-4o-mini"


# ---------------------------------------------------------------------------
# Text-to-Speech
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestTextToSpeechView:
    def test_unauthenticated_rejected(self, api_client):
        resp = api_client.post(reverse("ai-tts"), {"text": "hello"}, format="json")
        assert resp.status_code == 401

    def test_tts_success(self, auth_client):
        fake_mp3 = b"\xff\xfb\x90\x00" * 100  # fake MP3 bytes
        with patch("apps.ai_services.views.AIService") as MockService:
            instance = MockService.return_value
            instance.text_to_speech.return_value = fake_mp3

            resp = auth_client.post(
                reverse("ai-tts"),
                {"text": "Welcome to Tuutta.", "voice": "nova", "speed": 1.0},
                format="json",
            )

        assert resp.status_code == 200
        assert resp.data["format"] == "mp3"
        # Verify base64 encoding is correct
        decoded = base64.b64decode(resp.data["base64Audio"])
        assert decoded == fake_mp3

    def test_tts_missing_text_returns_400(self, auth_client):
        with patch("apps.ai_services.views.AIService"):
            resp = auth_client.post(reverse("ai-tts"), {"text": ""}, format="json")
        assert resp.status_code == 400
        assert "error" in resp.data

    def test_tts_no_body_returns_400(self, auth_client):
        with patch("apps.ai_services.views.AIService"):
            resp = auth_client.post(reverse("ai-tts"), {}, format="json")
        assert resp.status_code == 400

    def test_tts_custom_voice_and_speed(self, auth_client):
        fake_mp3 = b"\x00\x01\x02"
        with patch("apps.ai_services.views.AIService") as MockService:
            instance = MockService.return_value
            instance.text_to_speech.return_value = fake_mp3

            auth_client.post(
                reverse("ai-tts"),
                {"text": "Test", "voice": "alloy", "speed": 1.5},
                format="json",
            )
            instance.text_to_speech.assert_called_once_with("Test", voice="alloy", speed=1.5)


# ---------------------------------------------------------------------------
# Transcription
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestTranscribeView:
    def test_unauthenticated_rejected(self, api_client):
        audio = io.BytesIO(b"fake audio data")
        audio.name = "test.mp3"
        resp = api_client.post(reverse("ai-transcribe"), {"audio": audio}, format="multipart")
        assert resp.status_code == 401

    def test_transcribe_success(self, auth_client):
        with patch("apps.ai_services.views.AIService") as MockService:
            instance = MockService.return_value
            instance.transcribe_audio.return_value = "This is a transcription."

            audio = io.BytesIO(b"fake audio content")
            audio.name = "recording.mp3"

            resp = auth_client.post(
                reverse("ai-transcribe"),
                {"audio": audio},
                format="multipart",
            )

        assert resp.status_code == 200
        assert resp.data["transcript"] == "This is a transcription."

    def test_transcribe_no_audio_returns_400(self, auth_client):
        with patch("apps.ai_services.views.AIService"):
            resp = auth_client.post(reverse("ai-transcribe"), {}, format="multipart")
        assert resp.status_code == 400
        assert "error" in resp.data
