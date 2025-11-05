#!/usr/bin/env python3
"""
invoice_items 테이블의 is_header 값 확인 및 수정
서비스 리포트에서 생성된 명세서의 헤더 행이 is_header=1로 제대로 설정되었는지 확인
"""
import sqlite3
import os

# 데이터베이스 경로
DB_PATH = os.path.join(os.path.dirname(__file__), 'app', 'database', 'user.db')

def check_and_fix_headers():
    print("=== invoice_items 헤더 행 확인 및 수정 ===")
    print(f"데이터베이스: {DB_PATH}\n")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    try:
        # 1. is_header 컬럼 존재 확인
        cursor.execute("PRAGMA table_info(invoice_items)")
        columns = [col[1] for col in cursor.fetchall()]

        if 'is_header' not in columns:
            print("❌ is_header 컬럼이 존재하지 않습니다.")
            print("   먼저 add_is_header_column.py를 실행하세요.")
            return

        # 2. 모든 항목 확인
        cursor.execute('''
            SELECT id, invoice_id, item_name, is_header 
            FROM invoice_items
            ORDER BY invoice_id, row_order, id
        ''')
        items = cursor.fetchall()

        print("현재 상태:")
        print("-" * 80)

        fixed_count = 0
        correct_count = 0
        for item_id, invoice_id, item_name, is_header in items:
            # 헤더 행 판별 (item_name에 "서비스비용" 또는 "부품비용" 포함)
            # 공백 있는 경우와 없는 경우 모두 체크
            is_header_row = False
            if item_name:
                # 공백 제거 후 비교
                item_name_no_space = item_name.replace(' ', '')
                if '서비스비용' in item_name_no_space or '부품비용' in item_name_no_space:
                    is_header_row = True

            # 헤더 행인데 is_header가 0인 경우 - 수정 필요
            if is_header_row and is_header != 1:
                print(f"[수정필요] ID:{item_id}, Invoice:{invoice_id}, Name:{item_name}, is_header:{is_header}")
                
                # 수정
                cursor.execute('''
                    UPDATE invoice_items
                    SET is_header = 1
                    WHERE id = ?
                ''', (item_id,))
                fixed_count += 1
                print(f"  → is_header를 1로 수정")

            # 헤더 행이고 is_header=1인 경우 - 정상
            elif is_header_row and is_header == 1:
                correct_count += 1
                print(f"[정상] ID:{item_id}, Invoice:{invoice_id}, Name:{item_name}, is_header:{is_header}")

            # 일반 행인데 is_header가 1인 경우 - 오류 (수정)
            elif not is_header_row and is_header == 1:
                print(f"[수정필요] ID:{item_id}, Invoice:{invoice_id}, Name:{item_name}, is_header:{is_header}")
                print(f"  → 일반 항목인데 is_header=1로 설정됨. 0으로 수정...")
                
                cursor.execute('''
                    UPDATE invoice_items
                    SET is_header = 0
                    WHERE id = ?
                ''', (item_id,))
                fixed_count += 1
                print(f"  → is_header를 0으로 수정")

        conn.commit()
        
        print("-" * 80)
        if fixed_count > 0:
            print(f"\n✅ {fixed_count}개의 항목을 수정했습니다.")
            print(f"   {correct_count}개의 헤더 행이 이미 올바르게 설정되어 있었습니다.")
        else:
            print(f"\n✅ 모든 항목이 올바르게 설정되어 있습니다.")
            print(f"   헤더 행: {correct_count}개")

        # 3. 최종 통계
        cursor.execute('SELECT COUNT(*) FROM invoice_items WHERE is_header = 1')
        header_count = cursor.fetchone()[0]

        cursor.execute('SELECT COUNT(*) FROM invoice_items WHERE is_header = 0')
        normal_count = cursor.fetchone()[0]

        print(f"\n통계:")
        print(f"  - 헤더 행 (is_header=1): {header_count}개")
        print(f"  - 일반 행 (is_header=0): {normal_count}개")

        print("\n🎉 완료!")

    except Exception as e:
        print(f"\n❌ 오류 발생: {str(e)}")
        conn.rollback()
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == '__main__':
    check_and_fix_headers()
