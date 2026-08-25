import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv(override=True)

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-change-me')
DEBUG = os.getenv('DEBUG', 'True') == 'True'
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'caldimproducts.com,localhost,127.0.0.1').split(',')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'corsheaders',
    'django_filters',
    # Local apps
    'accounts',
    'employees',
    'projects',
    'milestones',
    'production',
    'dashboard',
    'bids',
    
    # Integrated Application B modules
    'apps.rfq',
    'apps.dashboards',
    'apps.core',
    'apps.bid_summary',
    'apps.breakdown',
    'apps.erection_takeoff',
    'apps.estimate_data',
    'apps.field_moment_conn',
    'apps.misc_metals',
    'chatbot',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'sfe_project.middleware.RequestLoggingMiddleware',
]

ROOT_URLCONF = 'sfe_project.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'sfe_project.wsgi.application'

# Database — SQLite for dev, PostgreSQL for production
USE_SQLITE = os.getenv('USE_SQLITE', 'True') == 'True'

if USE_SQLITE:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('DB_NAME', 'sfe_milestone'),
            'USER': os.getenv('DB_USER', 'postgres'),
            'PASSWORD': os.getenv('DB_PASSWORD', 'postgres'),
            'HOST': os.getenv('DB_HOST', 'localhost'),
            'PORT': os.getenv('DB_PORT', '5432'),
        }
    }

AUTH_USER_MODEL = 'accounts.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'SFE-static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'static')
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:5173",
    "https://sfe-milestone-tracking.vercel.app",
    "https://caldimproducts.com",
    "http://caldimproducts.com",
]
CSRF_TRUSTED_ORIGINS = [
    "https://caldimproducts.com",
    "http://caldimproducts.com",
]
CORS_ALLOW_CREDENTIALS = True

# DRF
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'accounts.authentication.CookieJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 200,
}

# JWT
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# Email — use SMTP for real emails, fallback to console if not configured
EMAIL_HOST = os.getenv('EMAIL_HOST', '').strip('\'"')
if EMAIL_HOST:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
else:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True').strip('\'"') == 'True'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '').strip('\'"')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '').strip('\'"')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'support@caldimengg.in').strip('\'"')

# Media Files
MEDIA_URL = '/SFE-media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Chatbot LLM Configuration
# Defaults to local Ollama. To use the free Groq cloud API instead, set
# OLLAMA_API_URL/OLLAMA_MODEL/LLM_API_KEY in .env — see backend/.env.example
# for the exact values (Groq is already recognized by the cloud-detection
# logic in chatbot/services.py because "groq" appears in its URL).
OLLAMA_API_URL = os.getenv('OLLAMA_API_URL', 'http://localhost:11434')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'openai/gpt-oss-120b')
LLM_API_KEY = os.getenv('LLM_API_KEY', '')

# Optional fallback provider (e.g. Gemini). If set, the chatbot automatically retries a
# request against this provider when the primary one fails for any reason (rate limit,
# daily quota, connection issue). Leave FALLBACK_LLM_API_URL empty to disable fallback.
FALLBACK_LLM_API_URL = os.getenv('FALLBACK_LLM_API_URL', '')
FALLBACK_LLM_MODEL = os.getenv('FALLBACK_LLM_MODEL', '')
FALLBACK_LLM_API_KEY = os.getenv('FALLBACK_LLM_API_KEY', '')

# Local embedding model (fastembed/ONNX, no torch) used for knowledge-chunk retrieval and
# tool selection. Downloads once from HF Hub and caches on disk - no network needed after that.
EMBEDDING_MODEL_NAME = os.getenv('EMBEDDING_MODEL_NAME', 'BAAI/bge-small-en-v1.5')
EMBEDDING_MODEL_CACHE_DIR = os.getenv('EMBEDDING_MODEL_CACHE_DIR', os.path.join(BASE_DIR, '.embedding_cache'))
