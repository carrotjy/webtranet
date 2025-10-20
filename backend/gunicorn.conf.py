# Gunicorn 설정 파일
import multiprocessing

# 서버 소켓
bind = "0.0.0.0:5000"

# 워커 프로세스
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
timeout = 120
keepalive = 5

# 로깅
accesslog = "/home/webtranet/webtranet/backend/logs/gunicorn_access.log"
errorlog = "/home/webtranet/webtranet/backend/logs/gunicorn_error.log"
loglevel = "info"

# 프로세스 네이밍
proc_name = "webtranet"

# 데몬 설정
daemon = False
pidfile = "/home/webtranet/webtranet/backend/gunicorn.pid"

# 성능 튜닝
preload_app = True
max_requests = 1000
max_requests_jitter = 50
