const { getPool } = require('../config/db');
const { extractInvoiceFromFile } = require('../utils/invoiceParser');

const fileReader = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file detected.' });
    }

    try {
        const invoice = await extractInvoiceFromFile(req.file);
// console.log('Extracted invoice data:', invoice);
        return res.status(200).json({
            message: 'Invoice preview created. Please review and edit before saving.',
            invoice
        });
    } catch (error) {
        console.error('Invoice parsing failed:', error);
        return res.status(500).json({
            message: 'Invoice could not be processed.',
            details: error.message
        });
    }
};

const saveInvoice = async (req, res) => {
    const invoice = req.body?.invoice || req.body;

    if (!invoice) {
        return res.status(400).json({ error: 'Invoice data is required.' });
    }

    try {
        const pool = await getPool();

        const [result] = await pool.execute(
            `INSERT INTO invoice_documents (
                file_name,
                original_name,
                mime_type,
                file_size,
                invoice_type,
                invoice_number,
                invoice_date,
                due_date,
                vendor_name,
                vendor_gst,
                customer_name,
                customer_gst,
                currency,
                subtotal,
                tax_amount,
                total_amount,
                raw_text,
                ocr_confidence,
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                invoice.file_name || 'invoice-file',
                invoice.original_name || invoice.file_name || 'invoice-file',
                invoice.mime_type || 'application/octet-stream',
                invoice.file_size || 0,
                invoice.invoice_type || 'unknown',
                invoice.invoice_number || `INV-${Date.now()}`,
                invoice.invoice_date || null,
                invoice.due_date || null,
                invoice.vendor_name || 'Unknown Vendor',
                invoice.vendor_gst || null,
                invoice.customer_name || 'Unknown Customer',
                invoice.customer_gst || null,
                invoice.currency || 'INR',
                Number(invoice.subtotal || 0),
                Number(invoice.tax_amount || 0),
                Number(invoice.total_amount || 0),
                invoice.raw_text || '',
                Number(invoice.ocr_confidence || 0),
                invoice.status || 'saved'
            ]
        );

        const invoiceId = result.insertId;

        if (Array.isArray(invoice.items) && invoice.items.length > 0) {
            const itemValues = invoice.items.map(item => [
                invoiceId,
                item.item_name || 'Item',
                item.description || '',
                Number(item.quantity || 0),
                Number(item.unit_price || 0),
                Number(item.amount || 0)
            ]);

            await pool.query(
                `INSERT INTO invoice_items (invoice_id, item_name, description, quantity, unit_price, amount) VALUES ?`,
                [itemValues]
            );
        }

        return res.status(200).json({
            message: 'Invoice saved successfully after review.',
            invoiceId,
            invoice
        });
    } catch (error) {
        console.error('Invoice save failed:', error);
        return res.status(500).json({
            message: 'Invoice could not be saved to the database.',
            details: error.message
        });
    }
};

module.exports = { fileReader, saveInvoice };
