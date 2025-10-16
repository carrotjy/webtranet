import sqlite3
import os

# Database path
DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'app', 'database', 'user.db')

def add_invoice_items_columns():
    """invoice_items table에 month, day, item_name, part_number columns 추가"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()

    try:
        # month column 추가 (월)
        cursor.execute('ALTER TABLE invoice_items ADD COLUMN month INTEGER')
        print("[OK] month column added")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("[SKIP] month column already exists")
        else:
            print(f"[ERROR] Failed to add month column: {e}")

    try:
        # day column 추가 (일)
        cursor.execute('ALTER TABLE invoice_items ADD COLUMN day INTEGER')
        print("[OK] day column added")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("[SKIP] day column already exists")
        else:
            print(f"[ERROR] Failed to add day column: {e}")

    try:
        # item_name column 추가 (품목)
        cursor.execute('ALTER TABLE invoice_items ADD COLUMN item_name TEXT')
        print("[OK] item_name column added")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("[SKIP] item_name column already exists")
        else:
            print(f"[ERROR] Failed to add item_name column: {e}")

    try:
        # part_number column 추가 (부품번호)
        cursor.execute('ALTER TABLE invoice_items ADD COLUMN part_number TEXT')
        print("[OK] part_number column added")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("[SKIP] part_number column already exists")
        else:
            print(f"[ERROR] Failed to add part_number column: {e}")

    conn.commit()
    conn.close()
    print("\nMigration completed!")

if __name__ == '__main__':
    add_invoice_items_columns()
