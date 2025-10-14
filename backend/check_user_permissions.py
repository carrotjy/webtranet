#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sqlite3

def check_user_permissions():
    conn = sqlite3.connect('app/database/user.db')
    conn.row_factory = sqlite3.Row
    
    # 백인혁 사용자 찾기
    cursor = conn.execute('''
        SELECT name, service_report_access, customer_access, resource_access, 
               spare_parts_access, transaction_access, invoice_access 
        FROM users 
        WHERE name LIKE '%백인혁%' OR name LIKE '%백%'
    ''')
    
    users = cursor.fetchall()
    
    if not users:
        print("백인혁 사용자를 찾을 수 없습니다.")
        # 모든 사용자 출력
        cursor = conn.execute('SELECT name FROM users')
        all_users = cursor.fetchall()
        print("전체 사용자 목록:")
        for user in all_users:
            print(f"- {user['name']}")
    else:
        for user in users:
            print(f"이름: {user['name']}")
            print(f"서비스리포트: {user['service_report_access']}")
            print(f"고객정보: {user['customer_access']}")  
            print(f"리소스: {user['resource_access']}")
            print(f"부품: {user['spare_parts_access']}")
            print(f"트랜잭션: {user['transaction_access']}")
            print(f"인보이스: {user['invoice_access']}")
            print('---')
    
    conn.close()

if __name__ == '__main__':
    check_user_permissions()