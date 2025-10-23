#!/usr/bin/env python
"""
서버에 등록된 라우트 확인 스크립트
서버에서 실행: python test_routes.py
"""
from app import create_app

app = create_app()

print("=" * 60)
print("등록된 Invoice 관련 라우트:")
print("=" * 60)

for rule in app.url_map.iter_rules():
    if 'invoice' in rule.rule or 'generate' in rule.rule:
        methods = ', '.join(sorted(rule.methods - {'HEAD', 'OPTIONS'}))
        print(f"{rule.rule:50s} [{methods}]")

print("\n" + "=" * 60)
print("모든 /api/ 라우트:")
print("=" * 60)

for rule in app.url_map.iter_rules():
    if rule.rule.startswith('/api/'):
        methods = ', '.join(sorted(rule.methods - {'HEAD', 'OPTIONS'}))
        print(f"{rule.rule:50s} [{methods}]")
