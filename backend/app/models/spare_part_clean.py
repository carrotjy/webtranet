from datetime import datetime
from . import db

class SparePart(db.Model):
    __tablename__ = 'spare_parts'
    
    part_number = db.Column(db.String(100), primary_key=True)
    part_name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(100))
    current_stock = db.Column(db.Integer, default=0)
    min_stock = db.Column(db.Integer, default=0)
    current_price_eur = db.Column(db.Float)
    current_price_krw = db.Column(db.Float)
    current_price_updated_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.String(100))
    
    # Relationships
    stock_history = db.relationship('StockHistory', backref='spare_part', lazy=True, cascade='all, delete-orphan')
    price_history = db.relationship('PriceHistory', backref='spare_part', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'part_number': self.part_number,
            'part_name': self.part_name,
            'description': self.description,
            'category': self.category,
            'current_stock': self.current_stock,
            'min_stock': self.min_stock,
            'current_price_eur': self.current_price_eur,
            'current_price_krw': self.current_price_krw,
            'current_price_updated_at': self.current_price_updated_at.isoformat() if self.current_price_updated_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_by': self.created_by
        }

class StockHistory(db.Model):
    __tablename__ = 'stock_history'
    
    id = db.Column(db.Integer, primary_key=True)
    part_number = db.Column(db.String(100), db.ForeignKey('spare_parts.part_number'), nullable=False)
    transaction_type = db.Column(db.String(20), nullable=False)  # IN, OUT, ADJUST
    quantity = db.Column(db.Integer, nullable=False)
    previous_stock = db.Column(db.Integer)
    new_stock = db.Column(db.Integer)
    transaction_date = db.Column(db.Date, nullable=False)
    supplier = db.Column(db.String(200))
    invoice_number = db.Column(db.String(100))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(100))
    
    def to_dict(self):
        return {
            'id': self.id,
            'part_number': self.part_number,
            'transaction_type': self.transaction_type,
            'quantity': self.quantity,
            'previous_stock': self.previous_stock,
            'new_stock': self.new_stock,
            'transaction_date': self.transaction_date.isoformat() if self.transaction_date else None,
            'supplier': self.supplier,
            'invoice_number': self.invoice_number,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'created_by': self.created_by
        }

class PriceHistory(db.Model):
    __tablename__ = 'price_history'
    
    id = db.Column(db.Integer, primary_key=True)
    part_number = db.Column(db.String(100), db.ForeignKey('spare_parts.part_number'), nullable=False)
    price_eur = db.Column(db.Float, nullable=False)
    price_krw = db.Column(db.Float)
    exchange_rate = db.Column(db.Float)
    price_date = db.Column(db.Date, nullable=False)
    supplier = db.Column(db.String(200))
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(100))
    
    def to_dict(self):
        return {
            'id': self.id,
            'part_number': self.part_number,
            'price_eur': self.price_eur,
            'price_krw': self.price_krw,
            'exchange_rate': self.exchange_rate,
            'price_date': self.price_date.isoformat() if self.price_date else None,
            'supplier': self.supplier,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'created_by': self.created_by
        }