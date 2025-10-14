# VALUES 절 분석
values_line = "?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?"

# ?의 개수 세기
question_marks = values_line.count('?')
current_timestamps = values_line.count('CURRENT_TIMESTAMP')

print(f"현재 VALUES 절: {values_line}")
print(f"? 개수: {question_marks}")
print(f"CURRENT_TIMESTAMP 개수: {current_timestamps}")
print(f"총 값 개수: {question_marks + current_timestamps}")

# 필요한 개수
print(f"\n필요한 구성:")
print(f"- 총 컬럼: 38개")
print(f"- CURRENT_TIMESTAMP: 2개 (created_at, updated_at)")
print(f"- 필요한 ?: {38 - 2} = 36개")
print(f"- 현재 ?: {question_marks}개")
print(f"- 부족한 ?: {36 - question_marks}개")