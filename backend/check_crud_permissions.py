#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sqlite3

def check_crud_permissions():
    conn = sqlite3.connect('app/database/user.db')
    conn.row_factory = sqlite3.Row
    
    # 백인혁 사용자의 고객정보 CRUD 권한 확인
    cursor = conn.execute('''
        SELECT name, customer_create, customer_read, customer_update, customer_delete
        FROM users 
        WHERE name LIKE '%백인혁%'
    ''')
    
    user = cursor.fetchone()
    
    if user:
        print(f"백인혁 사용자의 고객정보 CRUD 권한:")
        print(f"- 생성(Create): {user['customer_create']}")
        print(f"- 읽기(Read): {user['customer_read']}")  
        print(f"- 수정(Update): {user['customer_update']}")
        print(f"- 삭제(Delete): {user['customer_delete']}")
        
        # 만약 Create와 Read가 0이면 1로 설정
        if user['customer_create'] == 0 or user['customer_read'] == 0:
            print("\nCR 권한이 없으므로 부여합니다...")
            conn.execute('''
                UPDATE users 
                SET customer_create = 1, customer_read = 1
                WHERE name LIKE '%백인혁%'
            ''')
            conn.commit()
            print("CR 권한이 부여되었습니다.")
    else:
        print("백인혁 사용자를 찾을 수 없습니다.")
    
    conn.close()

if __name__ == '__main__':
    check_crud_permissions()