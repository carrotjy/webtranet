#!/usr/bin/env python3
"""
invoice_items 테이블에 is_header 컬럼 추가 마이그레이션
"""
import sqlite3
import os

# 데이터베이스 경로
DB_PATH = os.path.join(os.path.dirname(__file__), 'app', 'database', 'user.db')

def migrate():
    print("=== invoice_items 테이블 마이그레이션 ===")
    print(f"데이터베이스: {DB_PATH}\n")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # 1. is_header 컬럼이 이미 있는지 확인
        cursor.execute("PRAGMA table_info(invoice_items)")
        columns = [col[1] for col in cursor.fetchall()]

        if 'is_header' in columns:
            print("✅ is_header 컬럼이 이미 존재합니다.")
        else:
            print("1. is_header 컬럼 추가 중...")
            cursor.execute('''
                ALTER TABLE invoice_items
                ADD COLUMN is_header INTEGER DEFAULT 0
            ''')
            print("   ✅ is_header 컬럼 추가 완료")

        # 2. 기존 데이터에서 헤더 행 감지 및 업데이트
        print("\n2. 기존 데이터 분석 중...")
        cursor.execute('''
            SELECT id, item_name FROM invoice_items
            WHERE item_name IS NOT NULL
        ''')
        items = cursor.fetchall()

        header_count = 0
        for item_id, item_name in items:
            # "1. 서비스비용", "2. 부품비용" 같은 패턴 감지
            if item_name and ('서비스비용' in item_name or '부품비용' in item_name):
                cursor.execute('''
                    UPDATE invoice_items
                    SET is_header = 1
                    WHERE id = ?
                ''', (item_id,))
                header_count += 1
                print(f"   헤더 행 감지: {item_name}")

        conn.commit()
        print(f"\n✅ {header_count}개의 헤더 행 업데이트 완료")

        print("\n🎉 마이그레이션 완료!")

    except Exception as e:
        print(f"\n❌ 마이그레이션 실패: {str(e)}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == '__main__':
    migrate()
