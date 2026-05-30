"""
System Settings Blueprint
시스템 설정 관련 API 엔드포인트
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.user import User
from app.utils.timezone import get_kst_now
import sys
import sqlite3

# Windows 전용 모듈 - Linux에서는 사용 불가
if sys.platform == 'win32':
    import win32print
    import win32api
WIN32_AVAILABLE = sys.platform == 'win32'
import os

system_settings_bp = Blueprint('system_settings', __name__)


def get_db_connection():
    """데이터베이스 연결"""
    db_path = os.path.join('app', 'database', 'webtranet.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


def get_user_db_connection():
    """사용자 데이터베이스 연결"""
    db_path = os.path.join('app', 'database', 'user.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn


@system_settings_bp.route('/system/printers', methods=['GET'])
@jwt_required()
def get_printers():
    """설치된 프린터 목록 조회 (관리자만 가능)"""
    try:
        # 현재 사용자 확인
        current_user_id = get_jwt_identity()
        user = User.get_by_id(current_user_id)

        if not user or not user.is_admin:
            return jsonify({
                'success': False,
                'message': '관리자만 접근할 수 있습니다.'
            }), 403

        # Windows 프린터 목록 가져오기
        if not WIN32_AVAILABLE:
            return jsonify({
                'success': False,
                'message': '프린터 목록 조회는 Windows 환경에서만 지원됩니다.'
            }), 501

        printers = []
        printer_enum = win32print.EnumPrinters(win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS)

        for printer in printer_enum:
            printer_name = printer[2]  # Printer name
            printers.append({
                'name': printer_name,
                'is_default': printer_name == win32print.GetDefaultPrinter()
            })

        return jsonify({
            'success': True,
            'printers': printers
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'프린터 목록 조회 실패: {str(e)}'
        }), 500


@system_settings_bp.route('/system/fax-printer', methods=['GET'])
@jwt_required()
def get_fax_printer():
    """저장된 팩스 프린터 설정 조회"""
    try:
        current_user_id = get_jwt_identity()
        user = User.get_by_id(current_user_id)

        if not user or not user.is_admin:
            return jsonify({
                'success': False,
                'message': '관리자만 접근할 수 있습니다.'
            }), 403

        conn = get_db_connection()
        setting = conn.execute(
            "SELECT value FROM system_settings WHERE key = 'fax_printer'"
        ).fetchone()
        conn.close()

        return jsonify({
            'success': True,
            'fax_printer': setting['value'] if setting else None
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'팩스 프린터 설정 조회 실패: {str(e)}'
        }), 500


@system_settings_bp.route('/system/fax-printer', methods=['POST'])
@jwt_required()
def set_fax_printer():
    """팩스 프린터 설정 저장"""
    try:
        current_user_id = get_jwt_identity()
        user = User.get_by_id(current_user_id)

        if not user or not user.is_admin:
            return jsonify({
                'success': False,
                'message': '관리자만 접근할 수 있습니다.'
            }), 403

        data = request.get_json()
        printer_name = data.get('printer_name')

        if not printer_name:
            return jsonify({
                'success': False,
                'message': '프린터 이름이 필요합니다.'
            }), 400

        conn = get_db_connection()

        # 기존 설정 확인
        existing = conn.execute(
            "SELECT * FROM system_settings WHERE key = 'fax_printer'"
        ).fetchone()

        if existing:
            # 업데이트
            conn.execute(
                "UPDATE system_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'fax_printer'",
                (printer_name,)
            )
        else:
            # 새로 생성
            conn.execute(
                "INSERT INTO system_settings (key, value) VALUES ('fax_printer', ?)",
                (printer_name,)
            )

        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'message': '팩스 프린터가 설정되었습니다.'
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'팩스 프린터 설정 실패: {str(e)}'
        }), 500


@system_settings_bp.route('/system/libreoffice-path', methods=['GET'])
@jwt_required()
def get_libreoffice_path():
    """저장된 LibreOffice 경로 설정 조회"""
    try:
        current_user_id = get_jwt_identity()
        user = User.get_by_id(current_user_id)

        if not user or not user.is_admin:
            return jsonify({
                'success': False,
                'message': '관리자만 접근할 수 있습니다.'
            }), 403

        conn = get_db_connection()
        setting = conn.execute(
            "SELECT value FROM system_settings WHERE key = 'libreoffice_path'"
        ).fetchone()
        conn.close()

        return jsonify({
            'success': True,
            'libreoffice_path': setting['value'] if setting else None
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'LibreOffice 경로 조회 실패: {str(e)}'
        }), 500


@system_settings_bp.route('/system/libreoffice-path', methods=['POST'])
@jwt_required()
def set_libreoffice_path():
    """LibreOffice 경로 설정 저장"""
    try:
        current_user_id = get_jwt_identity()
        user = User.get_by_id(current_user_id)

        if not user or not user.is_admin:
            return jsonify({
                'success': False,
                'message': '관리자만 접근할 수 있습니다.'
            }), 403

        data = request.get_json()
        libreoffice_path = data.get('libreoffice_path')

        if not libreoffice_path:
            return jsonify({
                'success': False,
                'message': 'LibreOffice 경로가 필요합니다.'
            }), 400

        # 경로 유효성 검증
        if not os.path.exists(libreoffice_path):
            return jsonify({
                'success': False,
                'message': '입력한 경로가 존재하지 않습니다. 경로를 확인해주세요.'
            }), 400

        conn = get_db_connection()

        # 기존 설정 확인
        existing = conn.execute(
            "SELECT * FROM system_settings WHERE key = 'libreoffice_path'"
        ).fetchone()

        if existing:
            # 업데이트
            conn.execute(
                "UPDATE system_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'libreoffice_path'",
                (libreoffice_path,)
            )
        else:
            # 새로 생성
            conn.execute(
                "INSERT INTO system_settings (key, value) VALUES ('libreoffice_path', ?)",
                (libreoffice_path,)
            )

        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'message': 'LibreOffice 경로가 설정되었습니다.'
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'LibreOffice 경로 설정 실패: {str(e)}'
        }), 500


@system_settings_bp.route('/system/info-history', methods=['GET'])
@jwt_required()
def get_system_info_history():
    """시스템 정보 이력 조회"""
    try:
        conn = get_db_connection()

        # system_info_history 테이블이 없으면 생성
        conn.execute('''
            CREATE TABLE IF NOT EXISTS system_info_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                version TEXT NOT NULL,
                description TEXT,
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()

        # 이력 조회 (최신순)
        history = conn.execute('''
            SELECT
                id,
                title,
                version,
                description,
                created_by,
                created_at
            FROM system_info_history
            ORDER BY created_at DESC
        ''').fetchall()

        conn.close()

        # 사용자 정보 조회 (user.db에서)
        user_conn = get_user_db_connection()

        # 결과 변환 및 사용자 이름 추가
        result = []
        for row in history:
            item = dict(row)

            # created_by가 있으면 사용자 이름 조회
            if item['created_by']:
                user = user_conn.execute(
                    'SELECT name FROM users WHERE id = ?',
                    (item['created_by'],)
                ).fetchone()
                item['created_by_name'] = user['name'] if user else '알 수 없음'
            else:
                item['created_by_name'] = '알 수 없음'

            result.append(item)

        user_conn.close()

        return jsonify({
            'success': True,
            'history': result
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'시스템 정보 이력 조회 실패: {str(e)}'
        }), 500


@system_settings_bp.route('/system/info-history', methods=['POST'])
@jwt_required()
def add_system_info():
    """시스템 정보 추가 (관리자만 가능)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.get_by_id(current_user_id)

        if not user or not user.is_admin:
            return jsonify({
                'success': False,
                'message': '관리자만 접근할 수 있습니다.'
            }), 403

        data = request.get_json()
        title = data.get('title')
        version = data.get('version')
        description = data.get('description', '')

        if not title or not version:
            return jsonify({
                'success': False,
                'message': '시스템 이름과 버전은 필수입니다.'
            }), 400

        conn = get_db_connection()

        # system_info_history 테이블이 없으면 생성
        conn.execute('''
            CREATE TABLE IF NOT EXISTS system_info_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                version TEXT NOT NULL,
                description TEXT,
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # 새 이력 추가 (한국 시간으로 명시적 설정)
        kst_now = get_kst_now()
        conn.execute('''
            INSERT INTO system_info_history (title, version, description, created_by, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (title, version, description, current_user_id, kst_now))

        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'message': '시스템 정보가 추가되었습니다.'
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'시스템 정보 추가 실패: {str(e)}'
        }), 500


@system_settings_bp.route('/system/safety-stock-range', methods=['GET'])
@jwt_required()
def get_safety_stock_range():
    """안전재고 범위(%) 조회"""
    try:
        conn = get_db_connection()
        setting = conn.execute(
            "SELECT value FROM system_settings WHERE key = 'safety_stock_range'"
        ).fetchone()
        conn.close()
        return jsonify({
            'success': True,
            'safety_stock_range': float(setting['value']) if setting else 20.0
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@system_settings_bp.route('/system/safety-stock-range', methods=['POST'])
@jwt_required()
def set_safety_stock_range():
    """안전재고 범위(%) 저장"""
    try:
        current_user_id = get_jwt_identity()
        user = User.get_by_id(current_user_id)
        if not user or not user.is_admin:
            return jsonify({'success': False, 'message': '관리자만 접근할 수 있습니다.'}), 403

        data = request.get_json()
        value = data.get('safety_stock_range')
        if value is None:
            return jsonify({'success': False, 'message': '값이 필요합니다.'}), 400
        try:
            value = float(value)
            if value < 0:
                raise ValueError
        except (ValueError, TypeError):
            return jsonify({'success': False, 'message': '0 이상의 숫자를 입력하세요.'}), 400

        conn = get_db_connection()
        existing = conn.execute(
            "SELECT * FROM system_settings WHERE key = 'safety_stock_range'"
        ).fetchone()
        if existing:
            conn.execute(
                "UPDATE system_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'safety_stock_range'",
                (str(value),)
            )
        else:
            conn.execute(
                "INSERT INTO system_settings (key, value) VALUES ('safety_stock_range', ?)",
                (str(value),)
            )
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': '안전재고 범위가 저장되었습니다.'}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@system_settings_bp.route('/system/invoice-save-path', methods=['GET'])
@jwt_required()
def get_invoice_save_path():
    """거래명세서 저장 경로 및 접속 정보 조회 (비밀번호 제외)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.get_by_id(current_user_id)

        if not user or not user.is_admin:
            return jsonify({
                'success': False,
                'message': '관리자만 접근할 수 있습니다.'
            }), 403

        conn = get_db_connection()
        rows = conn.execute(
            "SELECT key, value FROM system_settings "
            "WHERE key IN ('invoice_save_path','invoice_save_user','invoice_save_password')"
        ).fetchall()
        conn.close()

        settings = {r['key']: r['value'] for r in rows}
        return jsonify({
            'success': True,
            'invoice_save_path': settings.get('invoice_save_path') or '',
            'invoice_save_user': settings.get('invoice_save_user') or '',
            'has_password': bool(settings.get('invoice_save_password')),
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'거래명세서 저장 경로 조회 실패: {str(e)}'
        }), 500


@system_settings_bp.route('/system/invoice-save-path', methods=['POST'])
@jwt_required()
def set_invoice_save_path():
    """거래명세서 저장 경로 및 접속 정보 저장"""
    try:
        current_user_id = get_jwt_identity()
        user = User.get_by_id(current_user_id)

        if not user or not user.is_admin:
            return jsonify({
                'success': False,
                'message': '관리자만 접근할 수 있습니다.'
            }), 403

        data = request.get_json()
        invoice_save_path = data.get('invoice_save_path', '').strip()

        if not invoice_save_path:
            return jsonify({
                'success': False,
                'message': '저장 경로를 입력해주세요.'
            }), 400

        invoice_save_user     = data.get('invoice_save_user', '').strip()
        invoice_save_password = data.get('invoice_save_password', '')  # 빈 문자열이면 기존 값 유지

        conn = get_db_connection()

        def upsert(key, value):
            existing = conn.execute(
                "SELECT 1 FROM system_settings WHERE key = ?", (key,)
            ).fetchone()
            if existing:
                conn.execute(
                    "UPDATE system_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?",
                    (value, key)
                )
            else:
                conn.execute(
                    "INSERT INTO system_settings (key, value) VALUES (?, ?)",
                    (key, value)
                )

        upsert('invoice_save_path', invoice_save_path)
        upsert('invoice_save_user', invoice_save_user)

        # 비밀번호: 새 값이 전달된 경우에만 덮어씀
        if invoice_save_password:
            upsert('invoice_save_password', invoice_save_password)

        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'message': '거래명세서 저장 경로가 설정되었습니다.'
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'거래명세서 저장 경로 설정 실패: {str(e)}'
        }), 500


@system_settings_bp.route('/system/invoice-save-path/test', methods=['POST'])
@jwt_required()
def test_invoice_save_path():
    """거래명세서 저장 경로 연결 테스트 — 결과 로그를 브라우저에 반환"""
    import subprocess
    import platform
    import tempfile

    try:
        current_user_id = get_jwt_identity()
        user = User.get_by_id(current_user_id)
        if not user or not user.is_admin:
            return jsonify({'success': False, 'logs': ['❌ 관리자만 접근할 수 있습니다.']}), 403

        conn = get_db_connection()
        rows = conn.execute(
            "SELECT key, value FROM system_settings "
            "WHERE key IN ('invoice_save_path','invoice_save_user','invoice_save_password')"
        ).fetchall()
        conn.close()

        s = {r['key']: r['value'] for r in rows}
        path     = s.get('invoice_save_path') or ''
        username = s.get('invoice_save_user') or ''
        password = s.get('invoice_save_password') or ''

        logs = []
        logs.append(f'🔍 저장 경로  : {path or "(미설정)"}')
        logs.append(f'🔍 사용자     : {username or "(없음)"}')
        logs.append(f'🔍 비밀번호   : {"설정됨" if password else "(없음)"}')
        logs.append(f'🔍 서버 OS    : {platform.system()} {platform.release()}')
        logs.append('')

        if not path:
            logs.append('⚠️  저장 경로가 설정되지 않았습니다.')
            return jsonify({'success': False, 'logs': logs})

        is_unc = path.startswith('\\\\') or path.startswith('//')

        if is_unc:
            logs.append('📁 UNC 경로(네트워크 공유) 감지됨')

            # ── 1. smbclient 설치 확인 ──────────────────────────────
            logs.append('')
            logs.append('[1단계] smbclient 설치 확인...')
            if platform.system() == 'Windows':
                logs.append('   Windows 환경 — net use 방식 사용 (smbclient 불필요)')
                smb_ok = True
            else:
                import shutil as _shutil
                smbclient_path = _shutil.which('smbclient')
                # shutil.which 는 서비스 PATH 에서 못 찾을 수 있으므로 직접 실행도 시도
                if not smbclient_path:
                    for _p in ['/usr/bin/smbclient', '/usr/local/bin/smbclient', '/bin/smbclient']:
                        if os.path.exists(_p):
                            smbclient_path = _p
                            break
                if not smbclient_path:
                    try:
                        _r = subprocess.run(['smbclient', '--version'], capture_output=True, timeout=5)
                        if _r.returncode == 0:
                            smbclient_path = 'smbclient'
                    except Exception:
                        pass
                if smbclient_path:
                    logs.append(f'   ✅ smbclient 발견: {smbclient_path}')
                    smb_ok = True
                else:
                    logs.append('   ❌ smbclient 미설치')
                    logs.append('      → Ubuntu: sudo apt install smbclient')
                    return jsonify({'success': False, 'logs': logs})

            # ── 2. UNC 경로 파싱 ────────────────────────────────────
            normalized = path.replace('\\', '/').lstrip('/')
            parts = normalized.split('/', 2)
            server = parts[0]
            share  = parts[1] if len(parts) > 1 else ''
            logs.append(f'   서버: {server}  /  공유: {share}')

            # ── 3. 연결 테스트 ──────────────────────────────────────
            logs.append('')
            logs.append('[2단계] 공유 폴더 연결 테스트...')

            creds_fd, creds_path = tempfile.mkstemp(prefix='smb_test_', suffix='.creds')
            try:
                with os.fdopen(creds_fd, 'w') as f:
                    f.write(f'username={username}\n')
                    f.write(f'password={password}\n')
                os.chmod(creds_path, 0o600)

                from app.utils.smb_utils import _SMBCLIENT
                res = subprocess.run(
                    [_SMBCLIENT, f'//{server}/{share}', '-A', creds_path, '-c', 'ls'],
                    capture_output=True, text=True, timeout=15
                )

                if res.returncode == 0:
                    logs.append('   ✅ 연결 성공! 공유 폴더 내용:')
                    for line in res.stdout.strip().splitlines()[:8]:
                        if line.strip():
                            logs.append(f'      {line}')
                else:
                    logs.append(f'   ❌ 연결 실패')
                    for line in (res.stderr or res.stdout).strip().splitlines()[:5]:
                        logs.append(f'      {line}')
                    if 'NT_STATUS_LOGON_FAILURE' in res.stderr:
                        logs.append('   → ID 또는 비밀번호가 잘못되었습니다.')
                    elif 'NT_STATUS_BAD_NETWORK_NAME' in res.stderr:
                        logs.append('   → 공유 이름이 잘못되었거나 서버에 연결할 수 없습니다.')
                    elif 'NT_STATUS_CONNECTION_REFUSED' in res.stderr:
                        logs.append('   → 서버가 SMB 연결을 거부했습니다. (방화벽/포트 445 확인)')
                    return jsonify({'success': False, 'logs': logs})

                # ── 4. 폴더 생성 권한 테스트 ────────────────────────
                logs.append('')
                logs.append('[3단계] 폴더 생성 권한 테스트...')
                test_dir = '_webtranet_test_'
                res2 = subprocess.run(
                    [_SMBCLIENT, f'//{server}/{share}', '-A', creds_path,
                     '-c', f'mkdir "{test_dir}"'],
                    capture_output=True, text=True, timeout=15
                )
                already_exists = 'NT_STATUS_OBJECT_NAME_COLLISION' in res2.stderr
                if res2.returncode == 0 or already_exists:
                    logs.append('   ✅ 폴더 생성 권한 확인됨')
                    subprocess.run(
                        [_SMBCLIENT, f'//{server}/{share}', '-A', creds_path,
                         '-c', f'rmdir "{test_dir}"'],
                        capture_output=True, timeout=10
                    )
                else:
                    logs.append(f'   ❌ 폴더 생성 실패: {res2.stderr.strip()}')
                    return jsonify({'success': False, 'logs': logs})

            finally:
                try:
                    os.unlink(creds_path)
                except OSError:
                    pass

        else:
            logs.append('📁 로컬(또는 마운트) 경로')

            logs.append('')
            logs.append('[1단계] 경로 존재 확인...')
            if os.path.exists(path):
                logs.append(f'   ✅ 경로 존재: {path}')
            else:
                logs.append(f'   ⚠️  경로 없음 — 생성 시도...')
                try:
                    os.makedirs(path, exist_ok=True)
                    logs.append('   ✅ 생성 성공')
                except Exception as e:
                    logs.append(f'   ❌ 생성 실패: {e}')
                    return jsonify({'success': False, 'logs': logs})

            logs.append('')
            logs.append('[2단계] 쓰기 권한 확인...')
            try:
                tmp = tempfile.NamedTemporaryFile(dir=path, delete=True, prefix='_test_')
                tmp.close()
                logs.append('   ✅ 쓰기 권한 확인됨')
            except Exception as e:
                logs.append(f'   ❌ 쓰기 불가: {e}')
                return jsonify({'success': False, 'logs': logs})

        logs.append('')
        logs.append('🎉 모든 테스트 통과 — 거래명세서가 정상 저장될 것입니다.')
        return jsonify({'success': True, 'logs': logs})

    except Exception as e:
        return jsonify({'success': False, 'logs': [f'❌ 테스트 중 오류: {str(e)}']})


@system_settings_bp.route('/system/logo', methods=['GET'])
@jwt_required()
def get_logo():
    """회사 로고 이미지를 base64로 반환"""
    import base64
    logo_path = os.path.join(os.path.dirname(__file__), '..', '..', 'instance', 'LVD Logo_default.jpg')
    logo_path = os.path.abspath(logo_path)
    if not os.path.exists(logo_path):
        return jsonify({'success': False, 'message': '로고 파일이 없습니다.'}), 404
    with open(logo_path, 'rb') as f:
        encoded = base64.b64encode(f.read()).decode('utf-8')
    return jsonify({'success': True, 'data': f'data:image/jpeg;base64,{encoded}'})

