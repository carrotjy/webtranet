#!/usr/bin/env python3
"""
백엔드 서버 시작 래퍼 스크립트
가상환경을 자동으로 활성화하고 Flask 서버를 시작합니다.
"""

import os
import sys
import subprocess

def start_server():
    # 백엔드 디렉토리로 이동
    backend_dir = r"E:\zData\Webtranet\Webtrarev02\backend"
    os.chdir(backend_dir)
    
    # 가상환경의 Python 경로
    venv_python = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
    
    # 가상환경 Python이 존재하는지 확인
    if not os.path.exists(venv_python):
        print(f"❌ 가상환경을 찾을 수 없습니다: {venv_python}")
        print("먼저 가상환경을 생성하세요: python -m venv venv")
        return False
    
    # run.py 파일이 존재하는지 확인
    run_py = os.path.join(backend_dir, "run.py")
    if not os.path.exists(run_py):
        print(f"❌ run.py 파일을 찾을 수 없습니다: {run_py}")
        return False
    
    print("🚀 백엔드 서버를 시작합니다...")
    print(f"📁 작업 디렉토리: {backend_dir}")
    print(f"🐍 Python 경로: {venv_python}")
    
    try:
        # 가상환경의 Python으로 run.py 실행
        subprocess.run([venv_python, "run.py"], check=True)
    except subprocess.CalledProcessError as e:
        print(f"❌ 서버 시작 중 오류 발생: {e}")
        return False
    except KeyboardInterrupt:
        print("\n⏹️ 서버가 중지되었습니다.")
        return True
    
    return True

if __name__ == "__main__":
    start_server()