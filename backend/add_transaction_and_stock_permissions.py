#!/usr/bin/env python3
"""
거래명세서 및 부품 입출고내역 권한 필드 추가 마이그레이션 스크립트
- transaction_lock: 거래명세서 잠금 버튼 권한
- transaction_bill_view: 계산서 발행 처리 권한
- transaction_fax_send: 팩스 전송 버튼 권한
- transaction_file_download: 파일 다운로드 버튼 권한
- spare_parts_stock_history_edit: 입출고내역 수정 버튼 권한
- spare_parts_stock_history_delete: 입출고내역 삭제 버튼 권한
"""

import sqlite3
import os

def add_transaction_and_stock_permissions():
    """사용자 테이블에 거래명세서 및 입출고내역 권한 컬럼 추가"""
    # 데이터베이스 파일 경로
    db_path = os.path.join(os.path.dirname(__file__), 'app', 'database', 'user.db')
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 기존 컬럼 확인
        cursor.execute("PRAGMA table_info(users)")
        existing_columns = [column[1] for column in cursor.fetchall()]
        
        print(f"현재 users 테이블의 컬럼 수: {len(existing_columns)}")
        
        # 추가할 새로운 컬럼들
        new_columns = [
            ("transaction_lock", 1),  # 거래명세서 잠금 버튼 권한 (기본값: 1 - 권한 있음)
            ("transaction_bill_view", 1),  # 계산서 발행 처리 권한 (기본값: 1 - 권한 있음)
            ("transaction_fax_send", 1),  # 팩스 전송 버튼 권한 (기본값: 1 - 권한 있음)
            ("transaction_file_download", 1),  # 파일 다운로드 버튼 권한 (기본값: 1 - 권한 있음)
            ("spare_parts_stock_history_edit", 0),  # 입출고내역 수정 버튼 권한 (기본값: 0 - 권한 없음)
            ("spare_parts_stock_history_delete", 0),  # 입출고내역 삭제 버튼 권한 (기본값: 0 - 권한 없음)
        ]
        
        # 각 컬럼 추가
        for column_name, default_value in new_columns:
            if column_name not in existing_columns:
                print(f"{column_name} 컬럼 추가 중...")
                cursor.execute(f"""
                    ALTER TABLE users
                    ADD COLUMN {column_name} INTEGER DEFAULT {default_value}
                """)
                print(f"✓ {column_name} 컬럼이 추가되었습니다.")
            else:
                print(f"{column_name} 컬럼이 이미 존재합니다.")
        
        # 관리자 계정에 모든 권한 부여
        print("\n관리자 계정에 새로운 권한 부여 중...")
        cursor.execute("""
            UPDATE users SET 
                transaction_lock = 1,
                transaction_bill_view = 1,
                transaction_fax_send = 1,
                transaction_file_download = 1,
                spare_parts_stock_history_edit = 1,
                spare_parts_stock_history_delete = 1
            WHERE is_admin = 1
        """)
        
        conn.commit()
        print("✓ 관리자 계정에 새로운 권한들이 부여되었습니다.")
        
        # 업데이트된 컬럼 목록 확인
        cursor.execute("PRAGMA table_info(users)")
        updated_columns = [column[1] for column in cursor.fetchall()]
        print(f"\n업데이트된 users 테이블의 컬럼 수: {len(updated_columns)}")
        
        # 새로 추가된 컬럼만 표시
        print("\n새로 추가된 컬럼:")
        for column_name, _ in new_columns:
            if column_name in updated_columns:
                print(f"  ✓ {column_name}")
        
        print("\n마이그레이션이 성공적으로 완료되었습니다!")
        
    except Exception as e:
        print(f"오류 발생: {str(e)}")
        if 'conn' in locals():
            conn.rollback()
        import traceback
        traceback.print_exc()
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    print("=" * 60)
    print("거래명세서 및 입출고내역 권한 컬럼 추가 마이그레이션 시작")
    print("=" * 60)
    add_transaction_and_stock_permissions()
    print("=" * 60)
