# user.py 파일에서 get_all 메서드의 resource_access와 invoice_access 부분을 수정하는 스크립트
with open('e:/zData/Webtranet/Webtrarev02/backend/app/models/user.py', 'r', encoding='utf-8') as f:
    content = f.read()

# get_all 메서드에서 resource_access와 invoice_access 조건부 체크를 단순화
old_pattern = "resource_access=bool(user_data['resource_access'] if 'resource_access' in user_data and user_data['resource_access'] is not None else 0),"
new_pattern = "resource_access=bool(user_data['resource_access'] or 0),"
content = content.replace(old_pattern, new_pattern)

old_pattern = "invoice_access=bool(user_data['invoice_access'] if 'invoice_access' in user_data and user_data['invoice_access'] is not None else 0),"
new_pattern = "invoice_access=bool(user_data['invoice_access'] or 0),"
content = content.replace(old_pattern, new_pattern)

with open('e:/zData/Webtranet/Webtrarev02/backend/app/models/user.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("get_all 메서드의 resource_access와 invoice_access 수정 완료")