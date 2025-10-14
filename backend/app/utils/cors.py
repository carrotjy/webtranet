from functools import wraps
from flask import jsonify, request

def cors_headers(f):
    """CORS 헤더를 추가하는 데코레이터"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # OPTIONS 요청 처리
        if request.method == 'OPTIONS':
            response = jsonify({'message': 'OK'})
        else:
            response = f(*args, **kwargs)
            
        # 응답이 tuple인 경우 (response, status_code)
        if isinstance(response, tuple):
            resp_data, status_code = response
            response = jsonify(resp_data) if not hasattr(resp_data, 'headers') else resp_data
            response.status_code = status_code
        elif not hasattr(response, 'headers'):
            response = jsonify(response)
            
        # CORS 헤더 추가
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,HEAD,PATCH')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        
        return response
    return decorated_function