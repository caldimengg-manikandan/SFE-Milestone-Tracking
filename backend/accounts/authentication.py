from rest_framework_simplejwt.authentication import JWTAuthentication

class CookieJWTAuthentication(JWTAuthentication):
    """
    Custom JWT Authentication backend.
    Checks the request's cookies for 'access_token' first,
    then falls back to checking the HTTP 'Authorization' header.
    """
    def authenticate(self, request):
        # 1. Retrieve raw token from cookies
        raw_token = request.COOKIES.get('access_token')
        
        # 2. Fall back to standard Authorization header
        if raw_token is None:
            header = self.get_header(request)
            if header is not None:
                raw_token = self.get_raw_token(header)
                
        if raw_token is None:
            return None
            
        # 3. Validate and authenticate
        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token
