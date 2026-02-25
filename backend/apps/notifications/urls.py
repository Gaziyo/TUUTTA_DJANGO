from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet, NotificationOutboxViewSet

router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notifications')
router.register(r'notification-outbox', NotificationOutboxViewSet, basename='notification-outbox')

urlpatterns = router.urls
