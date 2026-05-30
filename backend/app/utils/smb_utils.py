"""
SMB 네트워크 공유(\\server\share) 접근 유틸리티
Linux: smbclient 명령 사용 (samba-client 패키지 필요)
Windows: net use 명령 사용
"""
import os
import platform
import shutil
import subprocess
import tempfile

# gunicorn 서비스는 PATH가 제한적이므로 절대 경로로 탐색
def _find_smbclient() -> str:
    found = shutil.which('smbclient')
    if found:
        return found
    for p in ('/usr/bin/smbclient', '/usr/local/bin/smbclient', '/bin/smbclient'):
        if os.path.exists(p):
            return p
    return 'smbclient'  # 마지막 폴백

_SMBCLIENT = _find_smbclient()


def is_unc_path(path: str) -> bool:
    """UNC 경로 여부 확인 (\\\\server\\share 또는 //server/share)"""
    return bool(path) and (path.startswith('\\\\') or path.startswith('//'))


def parse_unc(path: str):
    """
    UNC 경로를 (server, share, subpath) 로 파싱
    \\\\server\\share\\a\\b  ->  ('server', 'share', 'a/b')
    """
    normalized = path.replace('\\', '/').lstrip('/')
    parts = normalized.split('/', 2)
    server = parts[0] if len(parts) > 0 else ''
    share  = parts[1] if len(parts) > 1 else ''
    sub    = parts[2] if len(parts) > 2 else ''
    return server, share, sub


def unc_join(base: str, *parts) -> str:
    """UNC 경로 결합"""
    result = base.rstrip('/\\')
    for p in parts:
        p = str(p).strip('/\\')
        result = result + '\\' + p
    return result


def _write_creds_file(username: str, password: str) -> str:
    """smbclient 전용 임시 자격증명 파일 생성. 파일 경로 반환."""
    fd, path = tempfile.mkstemp(prefix='smb_', suffix='.creds')
    try:
        with os.fdopen(fd, 'w') as f:
            f.write(f'username={username}\n')
            f.write(f'password={password}\n')
        os.chmod(path, 0o600)
    except Exception:
        try:
            os.unlink(path)
        except OSError:
            pass
        raise
    return path


def _run_smbclient(server: str, share: str, commands: list,
                    username: str, password: str) -> subprocess.CompletedProcess:
    """smbclient 명령 실행 (Linux 전용)"""
    creds = None
    try:
        creds = _write_creds_file(username, password)
        result = subprocess.run(
            [_SMBCLIENT, f'//{server}/{share}', '-A', creds,
             '-c', '; '.join(commands)],
            capture_output=True, text=True, timeout=30
        )
        return result
    finally:
        if creds:
            try:
                os.unlink(creds)
            except OSError:
                pass


def _smb_makedirs(server: str, share: str, remote_dir: str,
                   username: str, password: str):
    """SMB 공유에 디렉토리(상위 포함) 생성. 이미 존재해도 무시."""
    if not remote_dir:
        return
    parts = [p for p in remote_dir.replace('\\', '/').split('/') if p]
    cmds = []
    for i in range(len(parts)):
        partial = '/'.join(parts[:i + 1])
        cmds.append(f'mkdir "{partial}"')
    if cmds:
        _run_smbclient(server, share, cmds, username, password)


def smb_put(local_path: str, server: str, share: str, remote_sub: str,
             username: str, password: str):
    """로컬 파일을 SMB 공유에 업로드"""
    remote_sub = remote_sub.replace('\\', '/')
    remote_dir = '/'.join(remote_sub.split('/')[:-1])
    if remote_dir:
        _smb_makedirs(server, share, remote_dir, username, password)
    result = _run_smbclient(
        server, share,
        [f'put "{local_path}" "{remote_sub}"'],
        username, password
    )
    if result.returncode != 0:
        stderr = result.stderr.strip()
        if stderr and 'NT_STATUS' in stderr and 'NT_STATUS_OK' not in stderr:
            raise RuntimeError(f'SMB 업로드 실패: {stderr}')


def smb_get(server: str, share: str, remote_sub: str,
             username: str, password: str) -> str:
    """SMB 공유에서 파일 다운로드 → 임시 파일 경로 반환 (호출자가 삭제 필요)"""
    remote_sub = remote_sub.replace('\\', '/')
    suffix = os.path.splitext(remote_sub)[1]
    fd, tmp = tempfile.mkstemp(suffix=suffix, prefix='smb_dl_')
    os.close(fd)
    result = _run_smbclient(
        server, share,
        [f'get "{remote_sub}" "{tmp}"'],
        username, password
    )
    if result.returncode != 0 or not os.path.getsize(tmp):
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise RuntimeError(f'SMB 다운로드 실패: {result.stderr.strip()}')
    return tmp


def smb_exists(server: str, share: str, remote_sub: str,
                username: str, password: str) -> bool:
    """SMB 공유의 파일 존재 여부 확인"""
    try:
        remote_sub = remote_sub.replace('\\', '/')
        result = _run_smbclient(
            server, share,
            [f'ls "{remote_sub}"'],
            username, password
        )
        filename = os.path.basename(remote_sub)
        return result.returncode == 0 and filename in result.stdout
    except Exception:
        return False


# ─── 고수준 API ────────────────────────────────────────────────────────────────

def copy_to_target(local_path: str, target_path: str,
                   username: str = None, password: str = None):
    """
    로컬 파일을 대상 경로에 복사.
    target_path 가 UNC 이면 SMB(Linux) / net use(Windows) 를 사용.
    """
    if is_unc_path(target_path):
        server, share, sub = parse_unc(target_path)
        if platform.system() == 'Windows':
            share_unc = f'\\\\{server}\\{share}'
            subprocess.run(
                ['net', 'use', share_unc,
                 f'/user:{username}', password or '', '/persistent:no'],
                capture_output=True, timeout=15
            )
            target_dir = os.path.dirname(target_path)
            if target_dir:
                os.makedirs(target_dir, exist_ok=True)
            shutil.copy2(local_path, target_path)
        else:
            if not username:
                raise ValueError('UNC 경로 접근에는 사용자 이름이 필요합니다.')
            smb_put(local_path, server, share, sub, username, password or '')
    else:
        target_dir = os.path.dirname(target_path)
        if target_dir:
            os.makedirs(target_dir, exist_ok=True)
        shutil.copy2(local_path, target_path)


def get_for_serve(file_path: str, username: str = None, password: str = None):
    """
    파일을 서빙용으로 준비. UNC(Linux)이면 임시 다운로드.
    반환: (serve_path, is_temp) — is_temp == True 이면 사용 후 삭제 필요
    """
    if is_unc_path(file_path):
        if platform.system() == 'Windows':
            return file_path, False
        server, share, sub = parse_unc(file_path)
        tmp = smb_get(server, share, sub, username, password or '')
        return tmp, True
    return file_path, False


def path_exists(file_path: str, username: str = None, password: str = None) -> bool:
    """파일 존재 여부 확인 (UNC 지원)"""
    if is_unc_path(file_path):
        if platform.system() == 'Windows':
            return os.path.exists(file_path)
        if username:
            server, share, sub = parse_unc(file_path)
            return smb_exists(server, share, sub, username, password or '')
        return False
    return os.path.exists(file_path)
