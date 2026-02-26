import logging
import secrets

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    Department,
    Organization,
    OrganizationInviteCode,
    OrganizationJoinRequest,
    OrganizationMember,
    OrganizationRequest,
    Team,
)
from .serializers import (
    DepartmentSerializer,
    OrganizationInviteCodeSerializer,
    OrganizationJoinRequestSerializer,
    OrganizationMemberDetailSerializer,
    OrganizationRequestSerializer,
    OrganizationSerializer,
    TeamSerializer,
)
from apps.analytics.services import create_audit_log

logger = logging.getLogger(__name__)


def safe_create_audit_log(**kwargs):
    try:
        create_audit_log(**kwargs)
    except Exception:
        logger.exception('Audit log write failed; request flow continued.')


def ensure_org_access(request, org_id):
    org = Organization.objects.filter(id=org_id, is_active=True).first()
    if not org:
        raise NotFound('Organization not found.')

    if request.user.is_superuser:
        return org

    is_member = OrganizationMember.objects.filter(
        organization=org,
        user=request.user,
        status='active',
    ).exists()
    if not is_member:
        raise PermissionDenied('You do not have access to this organization.')
    return org


def ensure_org_admin_access(request, org_id):
    org = Organization.objects.filter(id=org_id, is_active=True).first()
    if not org:
        raise NotFound('Organization not found.')
    if request.user.is_superuser:
        return org
    membership = OrganizationMember.objects.filter(
        organization=org,
        user=request.user,
        status='active',
    ).first()
    if not membership:
        raise PermissionDenied('You do not have access to this organization.')
    if membership.role not in ['org_admin', 'ld_manager', 'super_admin']:
        raise PermissionDenied('Org admin permissions are required.')
    return org


def get_org_or_404(org_id):
    org = Organization.objects.filter(id=org_id, is_active=True).first()
    if not org:
        raise NotFound('Organization not found.')
    return org


class OrganizationViewSet(viewsets.ModelViewSet):
    serializer_class = OrganizationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_superuser:
            return Organization.objects.filter(is_active=True).distinct()
        return Organization.objects.filter(
            members__user=self.request.user,
            is_active=True,
        ).distinct()

    def perform_create(self, serializer):
        if not self.request.user.is_superuser:
            raise PermissionDenied('Only master users can create organizations directly.')
        org = serializer.save(created_by=self.request.user)
        OrganizationMember.objects.get_or_create(
            organization=org,
            user=self.request.user,
            defaults={'role': 'org_admin'},
        )
        safe_create_audit_log(
            org_id=str(org.id),
            actor_id=str(self.request.user.id),
            actor_name=self.request.user.email,
            actor_type='admin',
            action='organization.created',
            entity_type='organization',
            entity_id=str(org.id),
            target_type='organization',
            target_id=str(org.id),
            target_name=org.name,
        )


class DepartmentViewSet(viewsets.ModelViewSet):
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk')
        ensure_org_access(self.request, org_id)
        return Department.objects.filter(organization_id=org_id)


class TeamViewSet(viewsets.ModelViewSet):
    serializer_class = TeamSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk')
        ensure_org_access(self.request, org_id)
        return Team.objects.filter(organization_id=org_id)


class MyMembershipsView(generics.ListAPIView):
    serializer_class = OrganizationMemberDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return OrganizationMember.objects.filter(user=self.request.user).select_related('organization', 'user')


class OrganizationMemberViewSet(viewsets.ModelViewSet):
    serializer_class = OrganizationMemberDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk')
        ensure_org_access(self.request, org_id)
        return OrganizationMember.objects.filter(
            organization_id=org_id
        ).select_related('organization', 'user')

    def create(self, request, *args, **kwargs):
        org_id = self.kwargs.get('organization_pk')
        ensure_org_admin_access(request, org_id)
        user_id = request.data.get('user')
        existing = OrganizationMember.objects.filter(
            organization_id=org_id, user_id=user_id
        ).select_related('organization', 'user').first()
        if existing:
            serializer = self.get_serializer(existing)
            return Response(serializer.data, status=status.HTTP_200_OK)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(organization_id=org_id)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class MemberDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = OrganizationMemberDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return OrganizationMember.objects.select_related('organization', 'user')


class OrganizationRequestViewSet(viewsets.ModelViewSet):
    serializer_class = OrganizationRequestSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch']

    def get_queryset(self):
        if self.request.user.is_superuser:
            return OrganizationRequest.objects.select_related('requested_by', 'reviewed_by', 'created_org').order_by('-created_at')
        return OrganizationRequest.objects.filter(requested_by=self.request.user).select_related(
            'requested_by', 'reviewed_by', 'created_org'
        ).order_by('-created_at')

    def perform_create(self, serializer):
        if self.request.user.is_superuser:
            raise PermissionDenied('Master users can create organizations directly.')
        serializer.save(requested_by=self.request.user, status='pending')

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        if not request.user.is_superuser:
            raise PermissionDenied('Master permissions are required.')
        org_request = self.get_object()
        if org_request.status != 'pending':
            return Response({'error': 'Only pending requests can be approved.'}, status=status.HTTP_400_BAD_REQUEST)
        existing_org = Organization.objects.filter(slug=org_request.slug, is_active=True).first()
        if existing_org:
            return Response(
                {
                    'error': 'Organization slug already exists.',
                    'code': 'organization_slug_conflict',
                    'existing_org_slug': existing_org.slug,
                },
                status=status.HTTP_409_CONFLICT,
            )

        try:
            with transaction.atomic():
                org = Organization.objects.create(
                    name=org_request.name,
                    slug=org_request.slug,
                    description=org_request.description,
                    plan=org_request.plan,
                    created_by=request.user,
                )
                OrganizationMember.objects.get_or_create(
                    organization=org,
                    user=org_request.requested_by,
                    defaults={'role': 'org_admin', 'status': 'active'},
                )
                safe_create_audit_log(
                    org_id=str(org.id),
                    actor_id=str(request.user.id),
                    actor_name=request.user.email,
                    actor_type='admin',
                    action='organization.request.approved',
                    entity_type='organization_request',
                    entity_id=str(org_request.id),
                    target_type='organization',
                    target_id=str(org.id),
                    target_name=org.name,
                )
                org_request.status = 'approved'
                org_request.reviewed_by = request.user
                org_request.reviewed_at = timezone.now()
                org_request.created_org = org
                org_request.review_note = request.data.get('review_note', org_request.review_note)
                org_request.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'created_org', 'review_note', 'updated_at'])
        except IntegrityError:
            return Response(
                {
                    'error': 'Organization slug already exists.',
                    'code': 'organization_slug_conflict',
                    'existing_org_slug': org_request.slug,
                },
                status=status.HTTP_409_CONFLICT,
            )

        return Response(self.get_serializer(org_request).data)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        if not request.user.is_superuser:
            raise PermissionDenied('Master permissions are required.')
        org_request = self.get_object()
        if org_request.status != 'pending':
            return Response({'error': 'Only pending requests can be rejected.'}, status=status.HTTP_400_BAD_REQUEST)
        org_request.status = 'rejected'
        org_request.reviewed_by = request.user
        org_request.reviewed_at = timezone.now()
        org_request.review_note = request.data.get('review_note', org_request.review_note)
        org_request.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'review_note', 'updated_at'])
        return Response(self.get_serializer(org_request).data)


class OrganizationJoinRequestViewSet(viewsets.ModelViewSet):
    serializer_class = OrganizationJoinRequestSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch']

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk')
        org = get_org_or_404(org_id)
        is_admin = self.request.user.is_superuser or OrganizationMember.objects.filter(
            organization=org,
            user=self.request.user,
            role__in=['org_admin', 'ld_manager', 'super_admin'],
            status='active',
        ).exists()
        queryset = OrganizationJoinRequest.objects.filter(organization=org).select_related('requester', 'reviewed_by')
        if not is_admin:
            queryset = queryset.filter(requester=self.request.user)
        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        org_id = self.kwargs.get('organization_pk')
        org = get_org_or_404(org_id)
        membership_exists = OrganizationMember.objects.filter(
            organization=org,
            user=self.request.user,
            status='active',
        ).exists()
        if membership_exists:
            raise PermissionDenied('You are already a member of this organization.')
        existing_pending = OrganizationJoinRequest.objects.filter(
            organization=org,
            requester=self.request.user,
            status='pending',
        ).first()
        if existing_pending:
            raise PermissionDenied('A pending join request already exists.')
        serializer.save(organization=org, requester=self.request.user, status='pending')

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, organization_pk=None, pk=None):
        org = ensure_org_admin_access(request, organization_pk)
        join_request = self.get_object()
        if join_request.status != 'pending':
            return Response({'error': 'Only pending requests can be approved.'}, status=status.HTTP_400_BAD_REQUEST)
        OrganizationMember.objects.get_or_create(
            organization=org,
            user=join_request.requester,
            defaults={'role': 'learner', 'status': 'active'},
        )
        safe_create_audit_log(
            org_id=str(org.id),
            actor_id=str(request.user.id),
            actor_name=request.user.email,
            actor_type='admin',
            action='join_request.approved',
            entity_type='organization_join_request',
            entity_id=str(join_request.id),
            target_type='user',
            target_id=str(join_request.requester_id),
            target_name=join_request.requester.email,
        )
        join_request.status = 'approved'
        join_request.reviewed_by = request.user
        join_request.reviewed_at = timezone.now()
        join_request.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'updated_at'])
        return Response(self.get_serializer(join_request).data)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, organization_pk=None, pk=None):
        org = ensure_org_admin_access(request, organization_pk)
        join_request = self.get_object()
        if join_request.status != 'pending':
            return Response({'error': 'Only pending requests can be rejected.'}, status=status.HTTP_400_BAD_REQUEST)
        join_request.status = 'rejected'
        join_request.reviewed_by = request.user
        join_request.reviewed_at = timezone.now()
        join_request.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'updated_at'])
        safe_create_audit_log(
            org_id=str(org.id),
            actor_id=str(request.user.id),
            actor_name=request.user.email,
            actor_type='admin',
            action='join_request.rejected',
            entity_type='organization_join_request',
            entity_id=str(join_request.id),
            target_type='user',
            target_id=str(join_request.requester_id),
            target_name=join_request.requester.email,
        )
        return Response(self.get_serializer(join_request).data)


class OrganizationInviteCodeViewSet(viewsets.ModelViewSet):
    serializer_class = OrganizationInviteCodeSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'patch']

    def get_queryset(self):
        org_id = self.kwargs.get('organization_pk')
        ensure_org_admin_access(self.request, org_id)
        return OrganizationInviteCode.objects.filter(organization_id=org_id).order_by('-created_at')

    def perform_create(self, serializer):
        org_id = self.kwargs.get('organization_pk')
        org = ensure_org_admin_access(self.request, org_id)
        provided_code = self.request.data.get('code')
        code = (provided_code or secrets.token_urlsafe(8)).replace('-', '').replace('_', '')[:20].upper()
        invite = serializer.save(organization=org, created_by=self.request.user, code=code, is_active=True)
        safe_create_audit_log(
            org_id=str(org.id),
            actor_id=str(self.request.user.id),
            actor_name=self.request.user.email,
            actor_type='admin',
            action='invite_code.created',
            entity_type='organization_invite_code',
            entity_id=str(invite.id),
            target_type='invite_code',
            target_id=invite.code,
            target_name=invite.code,
        )


class InviteCodeRedeemView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        code = (request.data.get('code') or '').strip().upper()
        if not code:
            return Response({'error': 'Invite code is required.'}, status=status.HTTP_400_BAD_REQUEST)

        invite = OrganizationInviteCode.objects.filter(code=code, is_active=True).select_related('organization').first()
        if not invite:
            return Response({'error': 'Invite code is invalid or inactive.'}, status=status.HTTP_404_NOT_FOUND)

        now = timezone.now()
        if invite.expires_at and invite.expires_at < now:
            return Response({'error': 'Invite code has expired.'}, status=status.HTTP_400_BAD_REQUEST)
        if invite.max_uses is not None and invite.used_count >= invite.max_uses:
            return Response({'error': 'Invite code usage limit has been reached.'}, status=status.HTTP_400_BAD_REQUEST)

        member, created = OrganizationMember.objects.get_or_create(
            organization=invite.organization,
            user=request.user,
            defaults={'role': invite.role, 'status': 'active'},
        )
        if created:
            invite.used_count += 1
            if invite.max_uses is not None and invite.used_count >= invite.max_uses:
                invite.is_active = False
            invite.save(update_fields=['used_count', 'is_active', 'updated_at'])
            safe_create_audit_log(
                org_id=str(invite.organization_id),
                actor_id=str(request.user.id),
                actor_name=request.user.email,
                actor_type='user',
                action='invite_code.redeemed',
                entity_type='organization_invite_code',
                entity_id=str(invite.id),
                target_type='user',
                target_id=str(request.user.id),
                target_name=request.user.email,
            )

        return Response(
            {
                'organization': {
                    'id': str(invite.organization.id),
                    'slug': invite.organization.slug,
                    'name': invite.organization.name,
                },
                'member': OrganizationMemberDetailSerializer(member).data,
            },
            status=status.HTTP_200_OK,
        )
