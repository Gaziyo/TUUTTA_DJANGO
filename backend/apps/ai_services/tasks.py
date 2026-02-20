from celery import shared_task
from .services import AIService


@shared_task
def async_chat_completion(messages: list, session_id: str):
    """Process chat completion asynchronously."""
    service = AIService()
    response = service.chat_completion(messages)
    return response
