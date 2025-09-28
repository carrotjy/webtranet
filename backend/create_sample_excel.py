import pandas as pd
import os

# 샘플 고객 데이터
sample_data = [
    {
        'company_name': '테스트회사1',
        'contact_person': '김철수',
        'email': 'kim@test1.com',
        'phone': '02-1234-5678',
        'address': '서울시 강남구 테스트로 123',
        'postal_code': '12345',
        'tel': '02-1234-5678',
        'fax': '02-1234-5679',
        'president': '김대표',
        'mobile': '010-1234-5678',
        'contact': '김철수 부장'
    },
    {
        'company_name': '테스트회사2',
        'contact_person': '이영희',
        'email': 'lee@test2.com',
        'phone': '02-9876-5432',
        'address': '서울시 서초구 샘플로 456',
        'postal_code': '54321',
        'tel': '02-9876-5432',
        'fax': '02-9876-5433',
        'president': '이대표',
        'mobile': '010-9876-5432',
        'contact': '이영희 과장'
    },
    {
        'company_name': '엑셀테스트',
        'contact_person': '박민수',
        'email': 'park@excel.com',
        'phone': '02-5555-6666',
        'address': '부산시 해운대구 엑셀로 789',
        'postal_code': '67890',
        'tel': '02-5555-6666',
        'fax': '02-5555-6667',
        'president': '박사장',
        'mobile': '010-5555-6666',
        'contact': '박민수 팀장'
    }
]

# DataFrame 생성
df = pd.DataFrame(sample_data)

# 엑셀 파일로 저장
output_path = 'sample_customers.xlsx'
df.to_excel(output_path, index=False)

print(f"샘플 엑셀 파일이 생성되었습니다: {output_path}")
print("컬럼 정보:")
for col in df.columns:
    print(f"  - {col}")