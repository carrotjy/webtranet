from flask import Blueprint, request, jsonify
import sqlite3
import os
from datetime import datetime
from flask_jwt_extended import jwt_required

supplier_info_bp = Blueprint('supplier_info', __name__)

def get_db_connection():
    """데이터베이스 연결"""
    db_path = os.path.join('app', 'database', 'user.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

@supplier_info_bp.route('/admin/supplier-info', methods=['GET'])
@jwt_required()
def get_supplier_info():
    """공급자 정보 조회"""
    try:
        conn = get_db_connection()

        # supplier_info 테이블에서 조회
        supplier = conn.execute(
            '''SELECT company_name, registration_number, ceo_name,
                      address, phone, fax
               FROM supplier_info
               ORDER BY id DESC
               LIMIT 1'''
        ).fetchone()

        conn.close()

        if supplier:
            return jsonify({
                'company_name': supplier['company_name'] or '',
                'registration_number': supplier['registration_number'] or '',
                'ceo_name': supplier['ceo_name'] or '',
                'address': supplier['address'] or '',
                'phone': supplier['phone'] or '',
                'fax': supplier['fax'] or ''
            })
        else:
            # 데이터가 없으면 빈 값 반환
            return jsonify({
                'company_name': '',
                'registration_number': '',
                'ceo_name': '',
                'address': '',
                'phone': '',
                'fax': ''
            })

    except Exception as e:
        print(f"공급자 정보 조회 오류: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@supplier_info_bp.route('/admin/supplier-info', methods=['POST'])
@jwt_required()
def update_supplier_info():
    """공급자 정보 업데이트"""
    try:
        data = request.get_json()

        company_name = data.get('company_name', '')
        registration_number = data.get('registration_number', '')
        ceo_name = data.get('ceo_name', '')
        address = data.get('address', '')
        phone = data.get('phone', '')
        fax = data.get('fax', '')

        conn = get_db_connection()

        # 기존 데이터 확인
        existing = conn.execute('SELECT id FROM supplier_info LIMIT 1').fetchone()

        if existing:
            # 업데이트
            conn.execute(
                '''UPDATE supplier_info
                   SET company_name = ?, registration_number = ?, ceo_name = ?,
                       address = ?, phone = ?, fax = ?, updated_at = ?
                   WHERE id = ?''',
                (company_name, registration_number, ceo_name,
                 address, phone, fax, datetime.now(), existing['id'])
            )
        else:
            # 새로 삽입
            conn.execute(
                '''INSERT INTO supplier_info
                   (company_name, registration_number, ceo_name,
                    address, phone, fax, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                (company_name, registration_number, ceo_name,
                 address, phone, fax, datetime.now(), datetime.now())
            )

        conn.commit()
        conn.close()

        return jsonify({
            'success': True,
            'message': '공급자 정보가 성공적으로 저장되었습니다.'
        })

    except Exception as e:
        print(f"공급자 정보 저장 오류: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
