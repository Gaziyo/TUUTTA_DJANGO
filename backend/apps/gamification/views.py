from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Achievement, UserXP
from .serializers import AchievementSerializer, UserXPSerializer


class AchievementViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AchievementSerializer
    queryset = Achievement.objects.filter(is_active=True)


class LeaderboardView(APIView):
    def get(self, request):
        org_id = request.query_params.get('organization')
        queryset = UserXP.objects.select_related('user').order_by('-total_xp')[:50]
        if org_id:
            queryset = queryset.filter(organization_id=org_id)
        return Response(UserXPSerializer(queryset, many=True).data)
