-- System Settings Table
CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fax Logs Table
CREATE TABLE IF NOT EXISTS fax_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    customer_name TEXT NOT NULL,
    fax_number TEXT NOT NULL,
    status TEXT NOT NULL, -- 'sending', 'sent', 'failed'
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_fax_logs_invoice_id ON fax_logs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
