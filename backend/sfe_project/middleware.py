import os

class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        # Write log file to backend/request_log.txt
        self.log_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'request_log.txt')

    def __call__(self, request):
        if 'announcements' in request.path:
            try:
                with open(self.log_file, 'a', encoding='utf-8') as f:
                    f.write(f"=== REQUEST ===\n")
                    f.write(f"Path: {request.path}\n")
                    f.write(f"Method: {request.method}\n")
                    f.write(f"Auth header: {request.headers.get('Authorization', 'None')}\n")
            except Exception as e:
                pass
        
        response = self.get_response(request)
        
        if 'announcements' in request.path:
            try:
                content_preview = ""
                if hasattr(response, 'content'):
                    content_preview = response.content[:1000].decode('utf-8')
                else:
                    content_preview = "No direct content attribute"
                with open(self.log_file, 'a', encoding='utf-8') as f:
                    f.write(f"=== RESPONSE ===\n")
                    f.write(f"Status: {response.status_code}\n")
                    f.write(f"Content: {content_preview}\n\n")
            except Exception as e:
                try:
                    with open(self.log_file, 'a', encoding='utf-8') as f:
                        f.write(f"Error logging response: {str(e)}\n\n")
                except Exception:
                    pass
        
        return response
