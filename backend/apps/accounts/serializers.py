from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom JWT login serializer that accepts email instead of username."""

    username_field = User.USERNAME_FIELD  # 'username' by default

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Replace the 'username' field with 'email'
        del self.fields[self.username_field]
        self.fields['email'] = serializers.EmailField()

    def validate(self, attrs):
        email = attrs.get('email', '').strip().lower()
        password = attrs.get('password', '')

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise AuthenticationFailed('Invalid credentials.')

        if not user.check_password(password):
            raise AuthenticationFailed('Invalid credentials.')

        if not user.is_active:
            raise AuthenticationFailed('Account is disabled.')

        # Inject the username so parent validate() can create the token
        attrs[self.username_field] = user.username
        return super().validate(attrs)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'display_name', 'photo_url',
            'bio', 'subscription_tier', 'settings', 'last_active_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'password', 'password2', 'display_name']

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value.lower()

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        email = validated_data.get('email', '')
        # username = email by default (required by AbstractUser)
        validated_data.setdefault('username', email)
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user
