from flask import Blueprint, request, jsonify
import sqlite3
import os
from datetime import datetime
from flask_jwt_extended import jwt_required, get_jwt_identity

spare_part_settings_bp = Blueprint('spare_part_settings', __name__)

def get_db_connection():
    """데이터베이스 연결"""
    db_path = os.path.join('app', 'database', 'user.db')
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

@spare_part_settings_bp.route('/admin/spare-part-settings', methods=['GET'])
@jwt_required()
def get_spare_part_settings():
    """부품 관리 설정 조회"""
    try:
        conn = get_db_connection()
        
        # pricing_factors에서 설정 조회
        settings = {}
        
        # 수리용 부품 설정
        repair_config = conn.execute(
            '''SELECT factor_a, factor_b, factor_c, min_price, max_price, min_factor, max_factor 
               FROM pricing_factors 
               WHERE part_type = "repair" AND currency = "KRW"'''
        ).fetchone()
        
        # 소모성 부품 설정
        consumable_config = conn.execute(
            '''SELECT factor_a, factor_b, factor_c, min_price, max_price, min_factor, max_factor 
               FROM pricing_factors 
               WHERE part_type = "consumable" AND currency = "KRW"'''
        ).fetchone()
        
        # 환율 설정
        eur_rate = conn.execute(
            '''SELECT rate FROM exchange_rates 
               WHERE currency_from = "EUR" AND currency_to = "KRW" AND is_active = 1'''
        ).fetchone()
        
        usd_rate = conn.execute(
            '''SELECT rate FROM exchange_rates 
               WHERE currency_from = "USD" AND currency_to = "KRW" AND is_active = 1'''
        ).fetchone()
        
        conn.close()
        
        # 기본값 설정
        if repair_config:
            settings['repairPartsConfig'] = {
                'a': repair_config['factor_a'],
                'b': repair_config['factor_b'],
                'c': repair_config['factor_c'],
                'minPrice': repair_config['min_price'],
                'maxPrice': repair_config['max_price'],
                'minFactor': repair_config['min_factor'] if repair_config['min_factor'] else 1.20,
                'maxFactor': repair_config['max_factor'] if repair_config['max_factor'] else 2.10
            }
        else:
            settings['repairPartsConfig'] = {
                'a': 0.0000001,
                'b': -0.000615608,
                'c': 2.149275123,
                'minPrice': 100,
                'maxPrice': 3000,
                'minFactor': 1.20,
                'maxFactor': 2.10
            }
        
        if consumable_config:
            settings['consumablePartsConfig'] = {
                'a': consumable_config['factor_a'],
                'b': consumable_config['factor_b'],
                'c': consumable_config['factor_c'],
                'minPrice': consumable_config['min_price'],
                'maxPrice': consumable_config['max_price'],
                'minFactor': consumable_config['min_factor'] if consumable_config['min_factor'] else 1.20,
                'maxFactor': consumable_config['max_factor'] if consumable_config['max_factor'] else 1.55
            }
        else:
            settings['consumablePartsConfig'] = {
                'a': 0.0000001,
                'b': -0.0003,
                'c': 1.6,
                'minPrice': 5,
                'maxPrice': 300,
                'minFactor': 1.20,
                'maxFactor': 1.55
            }
        
        settings['exchangeRates'] = {
            'EUR': eur_rate['rate'] if eur_rate else 1450.0,
            'USD': usd_rate['rate'] if usd_rate else 1340.0
        }
        
        settings['marginRate'] = 20  # 기본 마진율 20%
        
        return jsonify({
            'success': True,
            'data': settings
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@spare_part_settings_bp.route('/admin/spare-part-settings', methods=['POST'])
@jwt_required()
def update_spare_part_settings():
    """부품 관리 설정 업데이트"""
    try:
        data = request.get_json()
        
        conn = get_db_connection()
        
        # 수리용 부품 설정 업데이트
        if 'repairPartsConfig' in data:
            repair_config = data['repairPartsConfig']
            conn.execute(
                '''UPDATE pricing_factors 
                   SET factor_a = ?, factor_b = ?, factor_c = ?, 
                       min_price = ?, max_price = ?, min_factor = ?, max_factor = ?, updated_at = ?
                   WHERE part_type = "repair" AND currency = "KRW"''',
                (repair_config['a'], repair_config['b'], repair_config['c'],
                 repair_config['minPrice'], repair_config['maxPrice'], 
                 repair_config['minFactor'], repair_config['maxFactor'], datetime.now())
            )
        
        # 소모성 부품 설정 업데이트
        if 'consumablePartsConfig' in data:
            consumable_config = data['consumablePartsConfig']
            conn.execute(
                '''UPDATE pricing_factors 
                   SET factor_a = ?, factor_b = ?, factor_c = ?, 
                       min_price = ?, max_price = ?, min_factor = ?, max_factor = ?, updated_at = ?
                   WHERE part_type = "consumable" AND currency = "KRW"''',
                (consumable_config['a'], consumable_config['b'], consumable_config['c'],
                 consumable_config['minPrice'], consumable_config['maxPrice'],
                 consumable_config['minFactor'], consumable_config['maxFactor'], datetime.now())
            )
        
        # 환율 설정 업데이트
        if 'exchangeRates' in data:
            rates = data['exchangeRates']
            
            # EUR 환율 업데이트
            conn.execute(
                '''UPDATE exchange_rates 
                   SET rate = ?, updated_at = ?
                   WHERE currency_from = "EUR" AND currency_to = "KRW" AND is_active = 1''',
                (rates['EUR'], datetime.now())
            )
            
            # USD 환율 업데이트
            conn.execute(
                '''UPDATE exchange_rates 
                   SET rate = ?, updated_at = ?
                   WHERE currency_from = "USD" AND currency_to = "KRW" AND is_active = 1''',
                (rates['USD'], datetime.now())
            )
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': '부품 관리 설정이 성공적으로 업데이트되었습니다.'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500