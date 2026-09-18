CREATE DATABASE IF NOT EXISTS invoice_db;
USE invoice_db;

CREATE TABLE IF NOT EXISTS invoice_documents (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    file_size BIGINT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    invoice_type VARCHAR(20) NOT NULL DEFAULT 'unknown',
    invoice_number VARCHAR(100),
    invoice_date DATE,
    due_date DATE,
    vendor_name VARCHAR(255),
    vendor_gst VARCHAR(100),
    customer_name VARCHAR(255),
    customer_gst VARCHAR(100),
    currency VARCHAR(10) DEFAULT 'INR',
    subtotal DECIMAL(18,2) DEFAULT 0.00,
    tax_amount DECIMAL(18,2) DEFAULT 0.00,
    total_amount DECIMAL(18,2) DEFAULT 0.00,
    raw_text LONGTEXT,
    ocr_confidence DECIMAL(5,2) DEFAULT 0.00,
    status VARCHAR(30) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice_items (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    invoice_id BIGINT NOT NULL,
    item_name VARCHAR(255),
    description VARCHAR(255),
    quantity DECIMAL(10,2) DEFAULT 0.00,
    unit_price DECIMAL(18,2) DEFAULT 0.00,
    amount DECIMAL(18,2) DEFAULT 0.00,
    FOREIGN KEY (invoice_id) REFERENCES invoice_documents(id) ON DELETE CASCADE
);

CREATE INDEX idx_invoice_number ON invoice_documents(invoice_number);
CREATE INDEX idx_invoice_date ON invoice_documents(invoice_date);
CREATE INDEX idx_invoice_status ON invoice_documents(status);
