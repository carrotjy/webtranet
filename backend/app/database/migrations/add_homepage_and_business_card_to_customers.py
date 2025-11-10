"""
Add homepage and business_card_image fields to customers table

Migration script to add:
- homepage (TEXT): Customer website URL
- business_card_image (TEXT): Path to business card image file
"""

import sqlite3
import os

def get_db_path():
    """Get database path"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(current_dir, '..', 'user.db')

def migrate():
    """Apply migration"""
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(customers)")
        columns = [column[1] for column in cursor.fetchall()]

        # Add homepage column if it doesn't exist
        if 'homepage' not in columns:
            print("Adding 'homepage' column to customers table...")
            cursor.execute("""
                ALTER TABLE customers
                ADD COLUMN homepage TEXT DEFAULT ''
            """)
            print("[OK] 'homepage' column added successfully")
        else:
            print("'homepage' column already exists")

        # Add business_card_image column if it doesn't exist
        if 'business_card_image' not in columns:
            print("Adding 'business_card_image' column to customers table...")
            cursor.execute("""
                ALTER TABLE customers
                ADD COLUMN business_card_image TEXT DEFAULT ''
            """)
            print("[OK] 'business_card_image' column added successfully")
        else:
            print("'business_card_image' column already exists")

        conn.commit()
        print("\n[OK] Migration completed successfully!")

    except Exception as e:
        conn.rollback()
        print(f"\n[ERROR] Migration failed: {str(e)}")
        raise
    finally:
        conn.close()

def rollback():
    """Rollback migration (SQLite doesn't support DROP COLUMN easily)"""
    print("WARNING: SQLite doesn't support DROP COLUMN.")
    print("To rollback, you would need to:")
    print("1. Create a new table without these columns")
    print("2. Copy data from old table")
    print("3. Drop old table")
    print("4. Rename new table")

if __name__ == '__main__':
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == 'rollback':
        rollback()
    else:
        migrate()
