# Models package
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

from .invoice import Invoice
from .invoice_item import InvoiceItem  
from .invoice_rate import InvoiceRate
from .spare_part import SparePart, StockHistory, PriceHistory