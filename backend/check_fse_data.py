import sqlite3

conn = sqlite3.connect('app/database/user.db')
cursor = conn.cursor()

print("=== 사용자 정보 ===")
cursor.execute('SELECT id, name, department FROM users ORDER BY id')
users = cursor.fetchall()
for user in users:
    print(f"ID: {user[0]}, 이름: {user[1]}, 부서: {user[2]}")

print("\n=== 서비스 리포트에서 FSE 정보 ===")
cursor.execute('''
    SELECT sr.id, sr.report_number, sr.technician_id, u.name as technician_name, sr.service_date
    FROM service_reports sr
    LEFT JOIN users u ON sr.technician_id = u.id
    ORDER BY sr.id DESC
    LIMIT 10
''')
reports = cursor.fetchall()
for report in reports:
    print(f"리포트 ID: {report[0]}, 리포트번호: {report[1]}, 기술자ID: {report[2]}, 기술자명: {report[3]}, 서비스일: {report[4]}")

print("\n=== 특정 리포트의 상세 정보 ===")
cursor.execute('''
    SELECT sr.*, u.name as technician_name
    FROM service_reports sr
    LEFT JOIN users u ON sr.technician_id = u.id
    WHERE sr.technician_id IS NOT NULL
    ORDER BY sr.created_at DESC
    LIMIT 5
''')
detailed_reports = cursor.fetchall()
for report in detailed_reports:
    print(f"리포트 ID: {report[0]}, 기술자ID: {report[2]}, 실제 기술자명: {report[-1]}")

conn.close()