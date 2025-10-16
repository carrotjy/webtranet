from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
import os

# 환경 변수 로드
load_dotenv()

def create_app():
    app = Flask(__name__)
    
    # Flask 설정 - strict slashes 비활성화
    app.url_map.strict_slashes = False
    
    # 설정
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 3600))
    
    # CORS 설정 - 개발환경에서 더 관대하게 설정
    CORS(app, 
         origins=['http://localhost:3000', 'http://127.0.0.1:3000'],
         allow_headers=['Content-Type', 'Authorization'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
         supports_credentials=True)
    
    # JWT 설정
    jwt = JWTManager(app)
    
    # JWT 설정 - 정수 ID를 문자열로 변환
    @jwt.user_identity_loader
    def user_identity_lookup(user):
        return str(user)
    
    @jwt.user_lookup_loader
    def user_lookup_callback(_jwt_header, jwt_data):
        identity = jwt_data["sub"]
        from app.models.user import User
        return User.get_by_id(int(identity))
    
    # 블루프린트 등록
    from app.blueprints.auth import auth_bp
    from app.blueprints.user_management import user_mgmt_bp
    from app.blueprints.service_report import service_report_bp
    from app.blueprints.customer import customer_bp
    from app.blueprints.spare_parts_simple import spare_parts_bp
    from app.blueprints.user_permissions import user_permissions_bp
    from app.blueprints.resource import resource_bp
    from app.blueprints.invoice_code import invoice_code_bp
    from app.blueprints.invoice import invoice_bp
    from app.blueprints.invoice_rate import invoice_rate_bp
    from app.blueprints.spare_part_settings import spare_part_settings_bp
    from app.blueprints.tatoeba import tatoeba_bp
    from app.blueprints.invoice_generator import invoice_generator_bp
    from app.blueprints.supplier_info import supplier_info_bp

    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(user_mgmt_bp, url_prefix='/users')
    app.register_blueprint(service_report_bp, url_prefix='/service-reports')
    app.register_blueprint(customer_bp, url_prefix='/customers')
    app.register_blueprint(spare_parts_bp, url_prefix='/api')
    app.register_blueprint(user_permissions_bp, url_prefix='/api')
    app.register_blueprint(resource_bp, url_prefix='/resources')
    app.register_blueprint(invoice_code_bp, url_prefix='/api')
    app.register_blueprint(invoice_bp, url_prefix='/api')
    app.register_blueprint(invoice_rate_bp, url_prefix='/api')
    app.register_blueprint(spare_part_settings_bp, url_prefix='/api')
    app.register_blueprint(tatoeba_bp)
    app.register_blueprint(invoice_generator_bp)
    app.register_blueprint(supplier_info_bp)
    
    # JWT 에러 핸들러 추가
    from flask_jwt_extended.exceptions import JWTExtendedException
    
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return {'error': 'Token has expired'}, 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return {'error': 'Invalid token'}, 401
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return {'error': 'Authorization token is required'}, 401
    
    # 422 오류 핸들러 추가
    @app.errorhandler(422)
    def handle_unprocessable_entity(e):
        import traceback
        traceback.print_exc()
        return {'error': 'Unprocessable Entity', 'message': str(e)}, 422
    
    # 루트 라우트 추가 (테스트용)
    @app.route('/')
    def health_check():
        return {'status': 'ok', 'message': 'Backend server is running'}
    
    return app