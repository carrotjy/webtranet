"""
Database Migration Script
서버 배포 시 실행할 DB 마이그레이션 스크립트

Usage:
    python migrate_db.py
"""

import sqlite3
import os
from datetime import datetime

DB_PATH = 'backend/app/database/user.db'

def get_db_connection():
    """데이터베이스 연결"""
    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(f"데이터베이스 파일을 찾을 수 없습니다: {DB_PATH}")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def check_column_exists(conn, table_name, column_name):
    """컬럼이 존재하는지 확인"""
    cursor = conn.execute(f"PRAGMA table_info({table_name})")
    columns = [row[1] for row in cursor.fetchall()]
    return column_name in columns

def migrate_invoices_table(conn):
    """invoices 테이블에 invoice_code_id 컬럼 추가"""
    print("=== invoices 테이블 마이그레이션 시작 ===")

    # invoice_code_id 컬럼이 이미 존재하는지 확인
    if check_column_exists(conn, 'invoices', 'invoice_code_id'):
        print("✓ invoice_code_id 컬럼이 이미 존재합니다.")
        return True

    try:
        # invoice_code_id 컬럼 추가
        conn.execute('''
            ALTER TABLE invoices
            ADD COLUMN invoice_code_id INTEGER REFERENCES invoice_codes(id)
        ''')
        conn.commit()
        print("✓ invoice_code_id 컬럼이 성공적으로 추가되었습니다.")
        return True
    except Exception as e:
        print(f"✗ 마이그레이션 실패: {str(e)}")
        conn.rollback()
        return False

def migrate_users_soft_delete(conn):
    """users 테이블에 소프트 삭제 컬럼 추가"""
    print("=== users 테이블 소프트 삭제 마이그레이션 시작 ===")

    # is_deleted 컬럼 확인 및 추가
    if not check_column_exists(conn, 'users', 'is_deleted'):
        try:
            conn.execute('ALTER TABLE users ADD COLUMN is_deleted BOOLEAN DEFAULT 0')
            conn.commit()
            print("✓ is_deleted 컬럼이 성공적으로 추가되었습니다.")
        except Exception as e:
            print(f"✗ is_deleted 컬럼 추가 실패: {str(e)}")
            conn.rollback()
            return False
    else:
        print("✓ is_deleted 컬럼이 이미 존재합니다.")

    # deleted_at 컬럼 확인 및 추가
    if not check_column_exists(conn, 'users', 'deleted_at'):
        try:
            conn.execute('ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP')
            conn.commit()
            print("✓ deleted_at 컬럼이 성공적으로 추가되었습니다.")
        except Exception as e:
            print(f"✗ deleted_at 컬럼 추가 실패: {str(e)}")
            conn.rollback()
            return False
    else:
        print("✓ deleted_at 컬럼이 이미 존재합니다.")

    return True

def verify_migration(conn):
    """마이그레이션 검증"""
    print("\n=== 마이그레이션 검증 ===")

    # invoices 테이블 구조 확인
    cursor = conn.execute("PRAGMA table_info(invoices)")
    columns = cursor.fetchall()

    print("invoices 테이블 컬럼 목록:")
    for col in columns:
        col_id, name, col_type, not_null, default_val, pk = col
        print(f"  - {name} ({col_type})" + (" [PRIMARY KEY]" if pk else "") + (" [NOT NULL]" if not_null else ""))

    # invoice_code_id 컬럼 존재 확인
    has_invoice_code_id = any(col[1] == 'invoice_code_id' for col in columns)

    if has_invoice_code_id:
        print("\n✓ 마이그레이션이 성공적으로 완료되었습니다.")

        # 데이터 샘플 확인
        cursor = conn.execute('''
            SELECT id, invoice_number, invoice_code_id, service_report_id
            FROM invoices
            ORDER BY id DESC
            LIMIT 5
        ''')
        invoices = cursor.fetchall()

        if invoices:
            print("\n최근 Invoice 데이터 샘플:")
            for inv in invoices:
                print(f"  ID: {inv[0]}, Invoice#: {inv[1]}, CodeID: {inv[2]}, ReportID: {inv[3]}")

        return True
    else:
        print("\n✗ 마이그레이션 검증 실패: invoice_code_id 컬럼을 찾을 수 없습니다.")
        return False

def create_backup(db_path):
    """데이터베이스 백업 생성"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = f"{db_path}.backup_{timestamp}"

    try:
        import shutil
        shutil.copy2(db_path, backup_path)
        print(f"✓ 백업 생성 완료: {backup_path}")
        return backup_path
    except Exception as e:
        print(f"✗ 백업 생성 실패: {str(e)}")
        return None

def main():
    """메인 마이그레이션 실행"""
    print("=" * 60)
    print("Database Migration Script")
    print("=" * 60)
    print(f"대상 데이터베이스: {DB_PATH}")
    print(f"실행 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # 데이터베이스 백업
    print("\n1. 데이터베이스 백업 중...")
    backup_path = create_backup(DB_PATH)

    if not backup_path:
        response = input("\n⚠️  백업 생성에 실패했습니다. 계속 진행하시겠습니까? (yes/no): ")
        if response.lower() != 'yes':
            print("마이그레이션이 취소되었습니다.")
            return

    # 데이터베이스 연결
    print("\n2. 데이터베이스 연결 중...")
    try:
        conn = get_db_connection()
        print("✓ 데이터베이스 연결 성공")
    except Exception as e:
        print(f"✗ 데이터베이스 연결 실패: {str(e)}")
        return

    # 마이그레이션 실행
    print("\n3. 마이그레이션 실행 중...")
    try:
        # 1) invoices 테이블 마이그레이션
        success = migrate_invoices_table(conn)
        if not success:
            print("\ninvoices 테이블 마이그레이션이 실패했습니다.")
            conn.close()
            return

        # 2) users 소프트 삭제 마이그레이션
        success = migrate_users_soft_delete(conn)
        if not success:
            print("\nusers 테이블 마이그레이션이 실패했습니다.")
            conn.close()
            return

        # 마이그레이션 검증
        print("\n4. 마이그레이션 검증 중...")
        verify_success = verify_migration(conn)

        if verify_success:
            print("\n" + "=" * 60)
            print("✓ 모든 마이그레이션이 성공적으로 완료되었습니다!")
            print("=" * 60)
        else:
            print("\n" + "=" * 60)
            print("✗ 마이그레이션 검증에 실패했습니다.")
            print("=" * 60)

    except Exception as e:
        print(f"\n✗ 마이그레이션 중 오류 발생: {str(e)}")
        conn.rollback()
    finally:
        conn.close()
        print("\n데이터베이스 연결이 종료되었습니다.")

if __name__ == '__main__':
    main()
