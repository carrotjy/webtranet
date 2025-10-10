from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
from app.models.spare_part import SparePart, StockHistory, PriceHistory
from app.database.init_db import db
from datetime import datetime, date, timedelta
from sqlalchemy import or_

spare_part_bp = Blueprint('spare_parts', __name__)

@spare_part_bp.route('/spare-parts', methods=['GET'])
@jwt_required()
def get_spare_parts():
    """스페어파트 목록 조회"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        search = request.args.get('search', '')
        category = request.args.get('category', '')
        low_stock = request.args.get('low_stock', False, type=bool)
        
        query = SparePart.query
        
        # 검색 필터
        if search:
            query = query.filter(
                or_(
                    SparePart.part_number.contains(search),
                    SparePart.part_name.contains(search),
                    SparePart.description.contains(search)
                )
            )
        
        # 카테고리 필터
        if category:
            query = query.filter(SparePart.category == category)
        
        # 재고 부족 필터
        if low_stock:
            query = query.filter(SparePart.current_stock <= SparePart.min_stock)
        
        # 페이징
        pagination = query.order_by(SparePart.part_number).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        parts = [part.to_dict() for part in pagination.items]
        
        return jsonify({
            'success': True,
            'data': parts,
            'pagination': {
                'page': page,
                'pages': pagination.pages,
                'per_page': per_page,
                'total': pagination.total
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@spare_part_bp.route('/spare-parts/<part_number>', methods=['GET'])
@jwt_required()
def get_spare_part(part_number):
    """특정 스페어파트 조회"""
    try:
        part = SparePart.query.get(part_number)
        if not part:
            return jsonify({'success': False, 'message': '파트를 찾을 수 없습니다.'}), 404
        
        return jsonify({
            'success': True,
            'data': part.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@spare_part_bp.route('/spare-parts', methods=['POST'])
@jwt_required()
def create_spare_part():
    """새로운 스페어파트 등록"""
    try:
        data = request.get_json()
        current_user = get_jwt_identity()
        
        # 필수 필드 확인
        required_fields = ['part_number', 'part_name']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f'{field}는 필수입니다.'}), 400
        
        # 중복 확인
        existing_part = SparePart.query.get(data['part_number'])
        if existing_part:
            return jsonify({'success': False, 'message': '이미 존재하는 파트번호입니다.'}), 400
        
        # 새 파트 생성
        part = SparePart(
            part_number=data['part_number'],
            part_name=data['part_name'],
            erp_name=data.get('erp_name'),
            description=data.get('description'),
            category=data.get('category'),
            current_stock=data.get('current_stock', 0),
            min_stock=data.get('min_stock', 0),
            current_price_eur=data.get('current_price_eur'),
            current_price_krw=data.get('current_price_krw'),
            created_by=current_user
        )
        
        db.session.add(part)
        
        # 초기 가격이 있으면 가격 히스토리 추가
        if data.get('current_price_eur'):
            price_history = PriceHistory(
                part_number=data['part_number'],
                price_eur=data['current_price_eur'],
                price_krw=data.get('current_price_krw'),
                price_date=date.today(),
                notes='초기 가격 등록',
                created_by=current_user
            )
            db.session.add(price_history)
            part.current_price_updated_at = datetime.utcnow()
        
        # 초기 재고가 있으면 재고 히스토리 추가
        if data.get('current_stock', 0) > 0:
            stock_history = StockHistory(
                part_number=data['part_number'],
                transaction_type='IN',
                quantity=data['current_stock'],
                previous_stock=0,
                new_stock=data['current_stock'],
                transaction_date=date.today(),
                notes='초기 재고 등록',
                created_by=current_user
            )
            db.session.add(stock_history)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': '스페어파트가 성공적으로 등록되었습니다.',
            'data': part.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@spare_part_bp.route('/spare-parts/<part_number>', methods=['PUT'])
@jwt_required()
def update_spare_part(part_number):
    """스페어파트 정보 수정"""
    try:
        data = request.get_json()
        current_user = get_jwt_identity()
        
        print(f"Updating part {part_number} with data: {data}")  # 디버깅용
        
        part = SparePart.query.get(part_number)
        if not part:
            return jsonify({'success': False, 'message': '파트를 찾을 수 없습니다.'}), 404
        
        print(f"Before update - erp_name: {part.erp_name}")  # 디버깅용
        
        # 기본 정보 업데이트
        part.part_name = data.get('part_name', part.part_name)
        part.erp_name = data.get('erp_name', part.erp_name)
        part.description = data.get('description', part.description)
        part.category = data.get('category', part.category)
        part.min_stock = data.get('min_stock', part.min_stock)
        part.updated_at = datetime.utcnow()
        
        print(f"After update - erp_name: {part.erp_name}")  # 디버깅용
        
        db.session.commit()
        
        print(f"Committed to DB - erp_name: {part.erp_name}")  # 디버깅용
        
        return jsonify({
            'success': True,
            'message': '스페어파트가 성공적으로 수정되었습니다.',
            'data': part.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@spare_part_bp.route('/spare-parts/<part_number>/stock', methods=['POST'])
@jwt_required()
def update_stock(part_number):
    """재고 입고/출고 처리"""
    try:
        data = request.get_json()
        current_user = get_jwt_identity()
        
        part = SparePart.query.get(part_number)
        if not part:
            return jsonify({'success': False, 'message': '파트를 찾을 수 없습니다.'}), 404
        
        # 필수 필드 확인
        if 'quantity' not in data or 'transaction_type' not in data:
            return jsonify({'success': False, 'message': '수량과 거래유형은 필수입니다.'}), 400
        
        quantity = int(data['quantity'])
        transaction_type = data['transaction_type']  # 'IN', 'OUT', 'ADJUST'
        
        if transaction_type not in ['IN', 'OUT', 'ADJUST']:
            return jsonify({'success': False, 'message': '올바르지 않은 거래유형입니다.'}), 400
        
        previous_stock = part.current_stock
        
        # 재고 계산
        if transaction_type == 'IN':
            new_stock = previous_stock + quantity
        elif transaction_type == 'OUT':
            if previous_stock < quantity:
                return jsonify({'success': False, 'message': '재고가 부족합니다.'}), 400
            new_stock = previous_stock - quantity
        else:  # ADJUST
            new_stock = quantity
            quantity = new_stock - previous_stock
        
        # 재고 업데이트
        part.current_stock = new_stock
        part.updated_at = datetime.utcnow()
        
        # 재고 히스토리 추가
        stock_history = StockHistory(
            part_number=part_number,
            transaction_type=transaction_type,
            quantity=quantity,
            previous_stock=previous_stock,
            new_stock=new_stock,
            transaction_date=datetime.strptime(data.get('transaction_date', str(date.today())), '%Y-%m-%d').date(),
            supplier=data.get('supplier'),
            invoice_number=data.get('invoice_number'),
            notes=data.get('notes'),
            created_by=current_user
        )
        
        db.session.add(stock_history)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': '재고가 성공적으로 처리되었습니다.',
            'data': {
                'part': part.to_dict(),
                'stock_history': stock_history.to_dict()
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@spare_part_bp.route('/spare-parts/<part_number>/price', methods=['POST'])
@jwt_required()
def update_price(part_number):
    """가격 업데이트"""
    try:
        data = request.get_json()
        current_user = get_jwt_identity()
        
        part = SparePart.query.get(part_number)
        if not part:
            return jsonify({'success': False, 'message': '파트를 찾을 수 없습니다.'}), 404
        
        # 필수 필드 확인
        if 'price_eur' not in data:
            return jsonify({'success': False, 'message': 'EUR 가격은 필수입니다.'}), 400
        
        # 가격 업데이트
        part.current_price_eur = data['price_eur']
        part.current_price_krw = data.get('price_krw')
        part.current_price_updated_at = datetime.utcnow()
        part.updated_at = datetime.utcnow()
        
        # 가격 히스토리 추가
        price_history = PriceHistory(
            part_number=part_number,
            price_eur=data['price_eur'],
            price_krw=data.get('price_krw'),
            exchange_rate=data.get('exchange_rate'),
            price_date=datetime.strptime(data.get('price_date', str(date.today())), '%Y-%m-%d').date(),
            supplier=data.get('supplier'),
            notes=data.get('notes'),
            created_by=current_user
        )
        
        db.session.add(price_history)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': '가격이 성공적으로 업데이트되었습니다.',
            'data': {
                'part': part.to_dict(),
                'price_history': price_history.to_dict()
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@spare_part_bp.route('/spare-parts/<part_number>/history/stock', methods=['GET'])
@jwt_required()
def get_stock_history(part_number):
    """재고 히스토리 조회"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        pagination = StockHistory.query.filter_by(part_number=part_number)\
            .order_by(StockHistory.created_at.desc())\
            .paginate(page=page, per_page=per_page, error_out=False)
        
        histories = [history.to_dict() for history in pagination.items]
        
        return jsonify({
            'success': True,
            'data': histories,
            'pagination': {
                'page': page,
                'pages': pagination.pages,
                'per_page': per_page,
                'total': pagination.total
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@spare_part_bp.route('/spare-parts/<part_number>/history/price', methods=['GET'])
@jwt_required()
def get_price_history(part_number):
    """가격 히스토리 조회"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        pagination = PriceHistory.query.filter_by(part_number=part_number)\
            .order_by(PriceHistory.created_at.desc())\
            .paginate(page=page, per_page=per_page, error_out=False)
        
        histories = [history.to_dict() for history in pagination.items]
        
        return jsonify({
            'success': True,
            'data': histories,
            'pagination': {
                'page': page,
                'pages': pagination.pages,
                'per_page': per_page,
                'total': pagination.total
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@spare_part_bp.route('/transactions', methods=['GET'])
@jwt_required()
def get_all_transactions():
    """모든 거래 내역 조회"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        part_number_filter = request.args.get('part_number', '')
        transaction_type_filter = request.args.get('transaction_type', '')
        days_filter = request.args.get('days', '', type=str)
        
        query = db.session.query(
            StockHistory.part_number,
            StockHistory.transaction_type,
            StockHistory.quantity_change,
            StockHistory.current_quantity,
            StockHistory.transaction_date,
            StockHistory.created_at,
            SparePart.part_name,
            SparePart.unit_price
        ).join(SparePart, StockHistory.part_number == SparePart.part_number)
        
        # 필터 적용
        if part_number_filter:
            query = query.filter(StockHistory.part_number.like(f'%{part_number_filter}%'))
        
        if transaction_type_filter:
            if transaction_type_filter == 'inbound':
                query = query.filter(StockHistory.transaction_type == 'IN')
            elif transaction_type_filter == 'outbound':
                query = query.filter(StockHistory.transaction_type == 'OUT')
        
        # 기간 필터
        if days_filter and days_filter != 'all':
            days = int(days_filter)
            from_date = date.today() - timedelta(days=days)
            query = query.filter(StockHistory.transaction_date >= from_date)
        
        # 페이징과 정렬
        query = query.order_by(StockHistory.created_at.desc())
        
        # 총 개수 계산
        total = query.count()
        
        # 페이징 적용
        offset = (page - 1) * per_page
        transactions = query.offset(offset).limit(per_page).all()
        
        # 결과 포맷팅
        result = []
        for transaction in transactions:
            total_amount = 0
            if transaction.transaction_type == 'IN' and transaction.unit_price:
                total_amount = abs(transaction.quantity_change) * transaction.unit_price
            
            result.append({
                'date': transaction.created_at.strftime('%Y-%m-%d %H:%M'),
                'transaction_type': 'inbound' if transaction.transaction_type == 'IN' else 'outbound',
                'part_number': transaction.part_number,
                'part_name': transaction.part_name,
                'quantity_change': transaction.quantity_change,
                'unit_price': transaction.unit_price,
                'total_amount': total_amount,
                'current_quantity': transaction.current_quantity
            })
        
        pages = (total + per_page - 1) // per_page  # 올림 계산
        
        return jsonify({
            'success': True,
            'data': result,
            'pagination': {
                'page': page,
                'pages': pages,
                'per_page': per_page,
                'total': total
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@spare_part_bp.route('/spare-parts/<part_number>', methods=['DELETE'])
@jwt_required()
def delete_spare_part(part_number):
    """스페어파트 삭제"""
    try:
        part = SparePart.query.get(part_number)
        if not part:
            return jsonify({'success': False, 'message': '파트를 찾을 수 없습니다.'}), 404
        
        db.session.delete(part)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': '스페어파트가 성공적으로 삭제되었습니다.'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500