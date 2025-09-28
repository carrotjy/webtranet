from app import create_app
from app.database.init_db import init_database

app = create_app()

if __name__ == '__main__':
    # 데이터베이스 초기화
    init_database()
    
    # 개발 서버 실행
    app.run(debug=True, host='0.0.0.0', port=5000)