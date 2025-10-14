# 수정된 VALUES 절 검증
values_line = "?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?"

question_marks = values_line.count('?')
current_timestamps = values_line.count('CURRENT_TIMESTAMP')

print(f"수정된 VALUES 절: {values_line}")
print(f"? 개수: {question_marks}")
print(f"CURRENT_TIMESTAMP 개수: {current_timestamps}")
print(f"총 값 개수: {question_marks + current_timestamps}")

if question_marks == 36 and current_timestamps == 2:
    print("\n✅ 정확합니다! 36개의 ? + 2개의 CURRENT_TIMESTAMP = 38개 컬럼")
else:
    print(f"\n❌ 오류: 36개가 필요한데 {question_marks}개")