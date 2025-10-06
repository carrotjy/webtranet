from flask import Blueprint, request, jsonify
import sqlite3
import os
from datetime import datetime

spare_parts_bp = Blueprint('spare_parts', __name__)

def get_db_connection():
    """데이터베이스 연결"""
    db_path = os.path.join('app', 'database', 'user.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

@spare_parts_bp.route('/spare-parts', methods=['GET'])
def get_spare_parts():
    """스페어파트 목록 조회"""
    try:
        conn = get_db_connection()
        
        # 검색 파라미터 가져오기
        search_term = request.args.get('search', '').strip()
        
        # 기본 쿼리
        if search_term:
            # 파트번호 또는 파트명으로 검색 (부분 일치)
            query = '''
                SELECT * FROM spare_parts 
                WHERE part_number LIKE ? OR part_name LIKE ? 
                ORDER BY part_number
            '''
            search_pattern = f'%{search_term}%'
            parts = conn.execute(query, (search_pattern, search_pattern)).fetchall()
        else:
            # 검색어가 없으면 전체 조회
            parts = conn.execute('SELECT * FROM spare_parts ORDER BY part_number').fetchall()
            
        conn.close()
        
        # 결과 변환 - 프론트엔드 형식에 맞춤
        parts_list = []
        for part in parts:
            parts_list.append({
                'id': part['id'],  # 실제 id 필드 사용
                'part_number': part['part_number'],
                'part_name': part['part_name'],  # part_name 필드명 유지
                'stock_quantity': part['stock_quantity'],  # stock_quantity 필드명 유지
                'price': part['price'] if part['price'] else 0,  # price 필드명 유지
                'created_at': part['created_at'] if part['created_at'] else datetime.now().isoformat(),
                'updated_at': part['updated_at'] if part['updated_at'] else datetime.now().isoformat()
            })
        
        return jsonify(parts_list)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@spare_parts_bp.route('/spare-parts', methods=['POST'])
def create_spare_part():
    """새 스페어파트 생성"""
    try:
        data = request.get_json()
        
        part_number = data.get('part_number')
        part_name = data.get('part_name')
        description = data.get('description', '')
        category = data.get('category', '')
        current_stock = data.get('stock_quantity', 0)  # 프론트엔드 필드명에 맞춤
        min_stock = data.get('min_stock', 0)
        price_eur = data.get('price', 0)  # 프론트엔드 필드명에 맞춤
        
        if not part_number or not part_name:
            return jsonify({
                'success': False,
                'error': '파트번호와 파트명은 필수입니다.'
            }), 400
        
        conn = get_db_connection()
        
        # 중복 체크
        existing = conn.execute(
            'SELECT part_number FROM spare_parts WHERE part_number = ?',
            (part_number,)
        ).fetchone()
        
        if existing:
            conn.close()
            return jsonify({
                'success': False,
                'error': '이미 존재하는 파트번호입니다.'
            }), 400
        
        # 삽입
        conn.execute('''
            INSERT INTO spare_parts 
            (part_number, part_name, description, price, stock_quantity, minimum_stock, supplier)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (part_number, part_name, description, price_eur, current_stock, min_stock, category))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': '스페어파트가 생성되었습니다.'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@spare_parts_bp.route('/spare-parts/<int:part_id>', methods=['PUT'])
def update_spare_part(part_id):
    """스페어파트 수정"""
    try:
        data = request.get_json()
        
        part_name = data.get('part_name')
        description = data.get('description', '')
        category = data.get('category', '')
        current_stock = data.get('stock_quantity', 0)  # 프론트엔드 필드명에 맞춤
        min_stock = data.get('min_stock', 0)
        price_eur = data.get('price', 0)  # 프론트엔드 필드명에 맞춤
        
        if not part_name:
            return jsonify({
                'success': False,
                'error': '파트명은 필수입니다.'
            }), 400
        
        conn = get_db_connection()
        
        # 업데이트
        conn.execute('''
            UPDATE spare_parts 
            SET part_name = ?, description = ?, price = ?, 
                stock_quantity = ?, minimum_stock = ?, supplier = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (part_name, description, price_eur, current_stock, min_stock, category, part_id))
        
        if conn.total_changes == 0:
            conn.close()
            return jsonify({
                'success': False,
                'error': '해당 부품을 찾을 수 없습니다.'
            }), 404
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': '스페어파트가 수정되었습니다.'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@spare_parts_bp.route('/spare-parts/<int:part_id>', methods=['DELETE'])
def delete_spare_part(part_id):
    """스페어파트 삭제"""
    try:
        conn = get_db_connection()
        
        # 삭제
        conn.execute('DELETE FROM spare_parts WHERE id = ?', (part_id,))
        
        if conn.total_changes == 0:
            conn.close()
            return jsonify({
                'success': False,
                'error': '해당 부품을 찾을 수 없습니다.'
            }), 404
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': '스페어파트가 삭제되었습니다.'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@spare_parts_bp.route('/spare-parts/inbound', methods=['POST'])
def process_inbound():
    """입고 처리"""
    try:
        data = request.get_json()
        part_number = data.get('part_number')
        part_name = data.get('part_name')
        quantity = data.get('quantity', 0)
        currency = data.get('currency', 'EUR')
        price = data.get('price', 0)
        transaction_date = data.get('transaction_date')
        
        if not all([part_number, part_name, quantity > 0]):
            return jsonify({
                'success': False,
                'error': '필수 필드가 누락되었습니다.'
            }), 400
        
        conn = get_db_connection()
        
        # 기존 파트 확인
        existing_part = conn.execute(
            'SELECT * FROM spare_parts WHERE part_number = ?', 
            (part_number,)
        ).fetchone()
        
        if existing_part:
            # 기존 파트인 경우 재고 업데이트
            new_stock = existing_part['stock_quantity'] + quantity
            
            # 가격 정보 업데이트 (EUR 기준으로 저장)
            if currency == 'EUR':
                updated_price = price
            elif currency == 'USD':
                updated_price = price * 0.85  # USD to EUR 환율 (임시)
            else:  # KRW
                updated_price = price / 1320  # KRW to EUR 환율 (임시)
            
            conn.execute('''
                UPDATE spare_parts 
                SET stock_quantity = ?, price = ?
                WHERE part_number = ?
            ''', (new_stock, updated_price, part_number))
            
            # stock_history에 입고 기록 추가
            conn.execute('''
                INSERT INTO stock_history 
                (part_number, transaction_type, quantity, previous_stock, new_stock, 
                 transaction_date, created_at, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (part_number, 'IN', quantity, existing_part['stock_quantity'], 
                  new_stock, transaction_date or datetime.now().date(), 
                  datetime.now(), 'system'))
            
        else:
            # 신규 파트 등록
            if currency == 'EUR':
                eur_price = price
            elif currency == 'USD':
                eur_price = price * 0.85
            else:  # KRW
                eur_price = price / 1320
            
            conn.execute('''
                INSERT INTO spare_parts 
                (part_number, part_name, description, supplier, stock_quantity, minimum_stock, price)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (part_number, part_name, '', 'Unknown', quantity, 0, eur_price))
            
            # stock_history에 입고 기록 추가 (신규 파트)
            conn.execute('''
                INSERT INTO stock_history 
                (part_number, transaction_type, quantity, previous_stock, new_stock, 
                 transaction_date, created_at, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (part_number, 'IN', quantity, 0, quantity, 
                  transaction_date or datetime.now().date(), 
                  datetime.now(), 'system'))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': '입고 처리가 완료되었습니다.'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@spare_parts_bp.route('/spare-parts/outbound', methods=['POST'])
def process_outbound():
    """출고 처리"""
    try:
        data = request.get_json()
        part_number = data.get('part_number')
        quantity = data.get('quantity', 0)
        
        if not all([part_number, quantity > 0]):
            return jsonify({
                'success': False,
                'error': '필수 필드가 누락되었습니다.'
            }), 400
        
        conn = get_db_connection()
        
        # 기존 파트 확인
        existing_part = conn.execute(
            'SELECT * FROM spare_parts WHERE part_number = ?', 
            (part_number,)
        ).fetchone()
        
        if not existing_part:
            conn.close()
            return jsonify({
                'success': False,
                'error': '등록되지 않은 파트입니다.'
            }), 404
        
        if existing_part['stock_quantity'] < quantity:
            conn.close()
            return jsonify({
                'success': False,
                'error': '재고가 부족합니다.'
            }), 400
        
        # 재고 차감
        new_stock = existing_part['stock_quantity'] - quantity
        conn.execute('''
            UPDATE spare_parts 
            SET stock_quantity = ?
            WHERE part_number = ?
        ''', (new_stock, part_number))
        
        # stock_history에 출고 기록 추가
        conn.execute('''
            INSERT INTO stock_history 
            (part_number, transaction_type, quantity, previous_stock, new_stock, 
             transaction_date, created_at, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (part_number, 'OUT', quantity, existing_part['stock_quantity'], 
              new_stock, datetime.now().date(), datetime.now(), 'system'))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': '출고 처리가 완료되었습니다.'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@spare_parts_bp.route('/spare-parts/search/<part_number>', methods=['GET'])
def search_part_by_number(part_number):
    """파트번호로 검색"""
    try:
        conn = get_db_connection()
        
        part = conn.execute(
            'SELECT * FROM spare_parts WHERE part_number = ?', 
            (part_number,)
        ).fetchone()
        
        conn.close()
        
        if part:
            return jsonify({
                'success': True,
                'data': {
                    'part_number': part['part_number'],
                    'part_name': part['part_name'],
                    'description': part['description'],
                    'category': part['supplier'],
                    'current_stock': part['stock_quantity'],
                    'min_stock': part['minimum_stock'],
                    'current_price_eur': part['price'],
                    'current_price_krw': part['price'] * 1320 if part['price'] else None
                }
            })
        else:
            return jsonify({
                'success': False,
                'error': '파트를 찾을 수 없습니다.'
            }), 404
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@spare_parts_bp.route('/transactions', methods=['GET'])
def get_all_transactions():
    """모든 거래 내역 조회"""
    try:
        conn = get_db_connection()
        
        # 페이지네이션 파라미터
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        offset = (page - 1) * per_page
        
        # 필터 파라미터
        part_number_filter = request.args.get('part_number', '')
        transaction_type_filter = request.args.get('transaction_type', '')
        days_filter = request.args.get('days', '')
        
        # 기본 쿼리
        where_conditions = []
        params = []
        
        # 파트번호 필터
        if part_number_filter:
            where_conditions.append("sh.part_number LIKE ?")
            params.append(f'%{part_number_filter}%')
        
        # 거래유형 필터
        if transaction_type_filter:
            if transaction_type_filter == 'inbound':
                where_conditions.append("sh.transaction_type = ?")
                params.append('IN')
            elif transaction_type_filter == 'outbound':
                where_conditions.append("sh.transaction_type = ?")
                params.append('OUT')
        
        # 기간 필터
        if days_filter and days_filter != 'all':
            days = int(days_filter)
            where_conditions.append("sh.transaction_date >= DATE('now', '-{} days')".format(days))
        
        where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""
        
        # 총 개수 조회
        count_query = f"""
            SELECT COUNT(*) as total
            FROM stock_history sh
            JOIN spare_parts sp ON sh.part_number = sp.part_number
            {where_clause}
        """
        
        total = conn.execute(count_query, params).fetchone()['total']
        
        # 데이터 조회
        data_query = f"""
            SELECT 
                sh.part_number,
                sh.transaction_type,
                sh.quantity as quantity_change,
                sh.new_stock as current_quantity,
                sh.transaction_date,
                sh.created_at,
                sp.part_name,
                sp.price as unit_price
            FROM stock_history sh
            JOIN spare_parts sp ON sh.part_number = sp.part_number
            {where_clause}
            ORDER BY sh.created_at DESC
            LIMIT ? OFFSET ?
        """
        
        params.extend([per_page, offset])
        transactions_raw = conn.execute(data_query, params).fetchall()
        conn.close()
        
        # 결과 포맷팅
        transactions = []
        for t in transactions_raw:
            total_amount = 0
            if t['transaction_type'] == 'IN' and t['unit_price']:
                total_amount = abs(t['quantity_change']) * t['unit_price']
            
            transactions.append({
                'date': t['created_at'] if t['created_at'] else t['transaction_date'],
                'transaction_type': 'inbound' if t['transaction_type'] == 'IN' else 'outbound',
                'part_number': t['part_number'],
                'part_name': t['part_name'],
                'quantity_change': t['quantity_change'],
                'unit_price': t['unit_price'],
                'total_amount': total_amount,
                'current_quantity': t['current_quantity']
            })
        
        pages = (total + per_page - 1) // per_page
        
        return jsonify({
            'success': True,
            'data': transactions,
            'pagination': {
                'page': page,
                'pages': pages,
                'per_page': per_page,
                'total': total
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@spare_parts_bp.route('/spare-parts/history', methods=['GET'])
def get_spare_parts_history():
    """스페어파트 입출고 내역 조회"""
    try:
        conn = get_db_connection()
        
        # 입출고 내역 조회 (최신순)
        history_records = conn.execute('''
            SELECT 
                sh.id,
                sh.part_number,
                sp.part_name,
                sh.transaction_type,
                sh.quantity,
                sh.previous_stock,
                sh.new_stock,
                sh.transaction_date,
                sh.created_at,
                sh.created_by,
                sh.invoice_number
            FROM stock_history sh
            LEFT JOIN spare_parts sp ON sh.part_number = sp.part_number
            ORDER BY sh.created_at DESC
            LIMIT 100
        ''').fetchall()
        
        conn.close()
        
        # 결과 변환
        history_list = []
        for record in history_records:
            history_list.append({
                'id': record['id'],
                'part_number': record['part_number'],
                'part_name': record['part_name'] or 'Unknown',
                'transaction_type': record['transaction_type'],
                'quantity': record['quantity'],
                'previous_stock': record['previous_stock'],
                'new_stock': record['new_stock'],
                'transaction_date': record['transaction_date'] or record['created_at'][:10],
                'created_at': record['created_at'],
                'created_by': record['created_by'] or 'system',
                'reference_number': record['invoice_number'] or ''
            })
        
        return jsonify(history_list)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@spare_parts_bp.route('/spare-parts/<int:part_id>/stock', methods=['POST'])
def update_stock(part_id):
    """부품 재고 입출고 처리"""
    try:
        data = request.get_json()
        
        transaction_type = data.get('type')  # 'in' 또는 'out'
        quantity = data.get('quantity', 0)
        
        if not transaction_type or quantity <= 0:
            return jsonify({
                'success': False,
                'error': '거래 유형과 수량이 필요합니다.'
            }), 400
        
        conn = get_db_connection()
        
        # 부품 정보 조회
        part = conn.execute('SELECT * FROM spare_parts WHERE id = ?', (part_id,)).fetchone()
        if not part:
            conn.close()
            return jsonify({
                'success': False,
                'error': '해당 부품을 찾을 수 없습니다.'
            }), 404
        
        current_stock = part['stock_quantity']
        
        if transaction_type == 'in':
            # 입고 처리
            new_stock = current_stock + quantity
        elif transaction_type == 'out':
            # 출고 처리
            if current_stock < quantity:
                conn.close()
                return jsonify({
                    'success': False,
                    'error': '재고가 부족합니다.'
                }), 400
            new_stock = current_stock - quantity
        else:
            conn.close()
            return jsonify({
                'success': False,
                'error': '잘못된 거래 유형입니다.'
            }), 400
        
        # 재고 업데이트
        conn.execute('''
            UPDATE spare_parts 
            SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (new_stock, part_id))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': f'{"입고" if transaction_type == "in" else "출고"} 처리가 완료되었습니다.',
            'new_stock': new_stock
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@spare_parts_bp.route('/spare-parts/stock-transaction', methods=['POST'])
def create_stock_transaction():
    """재고 입출고 처리"""
    try:
        data = request.get_json()
        part_number = data.get('part_number')
        transaction_type = data.get('transaction_type')  # 'IN' 또는 'OUT'
        quantity = data.get('quantity', 0)
        transaction_date = data.get('transaction_date')
        reference_number = data.get('reference_number', '')
        customer_name = data.get('customer_name', '')
        
        if not all([part_number, transaction_type, quantity > 0]):
            return jsonify({
                'success': False,
                'error': '필수 필드가 누락되었습니다.'
            }), 400
        
        conn = get_db_connection()
        
        # 기존 파트 확인
        existing_part = conn.execute(
            'SELECT * FROM spare_parts WHERE part_number = ?', 
            (part_number,)
        ).fetchone()
        
        if not existing_part:
            conn.close()
            return jsonify({
                'success': False,
                'error': '부품을 찾을 수 없습니다.'
            }), 404
        
        previous_stock = existing_part['stock_quantity']
        
        if transaction_type == 'IN':
            new_stock = previous_stock + quantity
        elif transaction_type == 'OUT':
            if previous_stock < quantity:
                conn.close()
                return jsonify({
                    'success': False,
                    'error': f'재고가 부족합니다. (현재 재고: {previous_stock})'
                }), 400
            new_stock = previous_stock - quantity
        else:
            conn.close()
            return jsonify({
                'success': False,
                'error': '잘못된 거래 유형입니다.'
            }), 400
        
        # 재고 업데이트
        conn.execute(
            'UPDATE spare_parts SET stock_quantity = ? WHERE part_number = ?',
            (new_stock, part_number)
        )
        
        # 거래 내역 기록 (customer_name과 reference_number 포함)
        conn.execute(
            '''INSERT INTO stock_history 
               (part_number, transaction_type, quantity, previous_stock, new_stock, 
                transaction_date, reference_number, customer_name, created_at, created_by) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (part_number, transaction_type, quantity, previous_stock, new_stock,
             transaction_date or datetime.now().date(), reference_number, customer_name,
             datetime.now(), 'system')
        )
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': f'{transaction_type.lower()} 처리가 완료되었습니다.',
            'data': {
                'part_number': part_number,
                'transaction_type': transaction_type,
                'quantity': quantity,
                'previous_stock': previous_stock,
                'new_stock': new_stock,
                'reference_number': reference_number,
                'customer_name': customer_name
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500