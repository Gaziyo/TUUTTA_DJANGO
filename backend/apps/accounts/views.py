from django.utils import timezone
from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User
from .serializers import UserSerializer, RegisterSerializer, EmailTokenObtainPairSerializer
from apps.organizations.models import Organization, OrganizationMember


class RegisterView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)

        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = EmailTokenObtainPairSerializer


class LogoutView(generics.GenericAPIView):
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_200_OK)
        except Exception:
            return Response(status=status.HTTP_400_BAD_REQUEST)


class CurrentUserView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class WorkspaceResolverView(APIView):
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _error(status_code: int, code: str, detail: str) -> Response:
        return Response(
            {
                'error': {
                    'status': status_code,
                    'code': code,
                    'detail': detail,
                }
            },
            status=status_code,
        )

    def get(self, request):
        memberships = (
            OrganizationMember.objects.filter(
                user=request.user,
                status='active',
                organization__is_active=True,
            )
            .select_related('organization')
            .order_by('joined_at')
        )

        membership_by_slug = {member.organization.slug: member for member in memberships}

        settings = request.user.settings if isinstance(request.user.settings, dict) else {}
        workspace_settings = settings.get('workspace', {}) if isinstance(settings.get('workspace', {}), dict) else {}
        preferred_context = workspace_settings.get('activeContext')
        preferred_org_slug = workspace_settings.get('activeOrgSlug')
        requested_org_slug = request.query_params.get('orgSlug')
        is_master = bool(request.user.is_superuser)

        selected_org_slug = None

        if requested_org_slug:
            if requested_org_slug in membership_by_slug:
                selected_org_slug = requested_org_slug
            else:
                requested_org = Organization.objects.filter(slug=requested_org_slug, is_active=True).first()
                if not requested_org:
                    return self._error(404, 'not_found', 'Organization not found.')
                if not is_master:
                    return self._error(403, 'forbidden', 'You do not have access to this organization.')
                selected_org_slug = requested_org.slug
        elif preferred_org_slug and preferred_org_slug in membership_by_slug:
            selected_org_slug = preferred_org_slug
        elif memberships:
            selected_org_slug = memberships[0].organization.slug

        if preferred_context == 'master' and is_master:
            active_context = 'master'
            default_route = '/master/dashboard'
        elif selected_org_slug:
            active_context = 'org'
            default_route = f'/org/{selected_org_slug}/home'
        else:
            active_context = 'personal'
            default_route = '/me/home'

        organizations = [
            {
                'id': str(member.organization.id),
                'slug': member.organization.slug,
                'name': member.organization.name,
                'role': member.role,
            }
            for member in memberships
        ]

        return Response(
            {
                'activeContext': active_context,
                'activeOrgSlug': selected_org_slug if active_context == 'org' else None,
                'defaultRoute': default_route,
                'isMaster': is_master,
                'authorizedWorkspaces': {
                    'personal': True,
                    'master': is_master,
                    'organizations': organizations,
                },
            }
        )


class OnboardingStateView(APIView):
    permission_classes = [IsAuthenticated]

    @staticmethod
    def _default_state():
        return {
            'profile_setup': False,
            'organization_selection': False,
            'diagnostic_assessment': False,
            'first_recommendation': False,
            'completed': False,
            'completed_at': None,
        }

    def get(self, request):
        settings_data = request.user.settings if isinstance(request.user.settings, dict) else {}
        onboarding = settings_data.get('onboarding')
        if not isinstance(onboarding, dict):
            onboarding = self._default_state()
        return Response(onboarding)

    def patch(self, request):
        settings_data = request.user.settings if isinstance(request.user.settings, dict) else {}
        onboarding = settings_data.get('onboarding')
        if not isinstance(onboarding, dict):
            onboarding = self._default_state()

        allowed_keys = {'profile_setup', 'organization_selection', 'diagnostic_assessment', 'first_recommendation', 'completed'}
        for key, value in request.data.items():
            if key in allowed_keys:
                onboarding[key] = bool(value)

        onboarding['completed'] = all([
            onboarding.get('profile_setup'),
            onboarding.get('organization_selection'),
            onboarding.get('diagnostic_assessment'),
            onboarding.get('first_recommendation'),
        ]) or onboarding.get('completed', False)

        if onboarding['completed'] and not onboarding.get('completed_at'):
            onboarding['completed_at'] = timezone.now().isoformat()
        if not onboarding['completed']:
            onboarding['completed_at'] = None

        settings_data['onboarding'] = onboarding
        request.user.settings = settings_data
        request.user.save(update_fields=['settings', 'updated_at'])
        return Response(onboarding)


class MasterUsersView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if not self.request.user.is_superuser:
            raise PermissionDenied('Master permissions are required.')
        return User.objects.all().order_by('-created_at')
