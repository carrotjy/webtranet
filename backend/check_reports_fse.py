import sqlite3
from datetime import datetime

conn = sqlite3.connect('app/database/user.db')
cursor = conn.cursor()

print("=== 현재 서비스 리포트 상황 ===")
cursor.execute('''
    SELECT sr.id, sr.report_number, sr.technician_id, u.name as technician_name, 
           sr.service_date, sr.customer_id, c.company_name
    FROM service_reports sr
    LEFT JOIN users u ON sr.technician_id = u.id
    LEFT JOIN customers c ON sr.customer_id = c.id
    ORDER BY sr.created_at DESC
    LIMIT 10
''')
reports = cursor.fetchall()

print("최근 10개 서비스 리포트:")
for report in reports:
    print(f"ID: {report[0]}, 번호: {report[1]}, FSE ID: {report[2]}, FSE: {report[3]}, 날짜: {report[4]}, 고객: {report[6]}")

print("\n=== 기술자 목록 ===")
cursor.execute('SELECT id, name, department FROM users WHERE department = "기술부" ORDER BY id')
tech_users = cursor.fetchall()
for user in tech_users:
    print(f"ID: {user[0]}, 이름: {user[1]}, 부서: {user[2]}")

# 특정 조건에 따라 FSE를 변경할지 물어보기
print("\n특정 서비스 리포트의 FSE를 변경하시겠습니까?")
print("예: 특정 고객사나 날짜 범위의 리포트를 인종현님(ID: 1)으로 변경")

conn.close()