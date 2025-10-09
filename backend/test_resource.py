from app.models.resource import Resource

# 테스트: 고객 ID 42의 리소스 조회
try:
    resources = Resource.get_by_customer_id(42)
    print(f"고객 ID 42의 리소스 개수: {len(resources)}")
    
    for resource in resources:
        print(f"리소스 ID: {resource.id}")
        print(f"카테고리: {resource.category}")
        print(f"시리얼 번호: {resource.serial_number}")
        print(f"제품명: {resource.product_name}")
        print(f"관리 이력: {resource.management_history}")
        print("---")
        
except Exception as e:
    print(f"에러 발생: {e}")
    import traceback
    traceback.print_exc()