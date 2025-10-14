#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sqlite3

def grant_all_access_to_user():
    conn = sqlite3.connect('app/database/user.db')
    
    # 백인혁 사용자에게 모든 접근 권한 부여
    cursor = conn.execute('''
        UPDATE users 
        SET resource_access = 1, invoice_access = 1
        WHERE name LIKE '%백인혁%'
    ''')
    
    if cursor.rowcount > 0:
        print(f"백인혁 사용자의 resource_access와 invoice_access를 1로 설정했습니다. ({cursor.rowcount}명 업데이트)")
        
        # 업데이트 확인
        check_cursor = conn.execute('''
            SELECT name, service_report_access, customer_access, resource_access, 
                   spare_parts_access, transaction_access, invoice_access 
            FROM users 
            WHERE name LIKE '%백인혁%'
        ''')
        
        user = check_cursor.fetchone()
        if user:
            print(f"업데이트 후 권한 상태:")
            print(f"- 서비스리포트: {user[1]}")
            print(f"- 고객정보: {user[2]}")  
            print(f"- 리소스: {user[3]}")
            print(f"- 부품: {user[4]}")
            print(f"- 트랜잭션: {user[5]}")
            print(f"- 인보이스: {user[6]}")
            
    else:
        print("백인혁 사용자를 찾을 수 없습니다.")
    
    conn.commit()
    conn.close()

if __name__ == '__main__':
    grant_all_access_to_user()