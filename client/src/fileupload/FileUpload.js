import React, { useState } from 'react';

const initialInvoice = {
    file_name: '',
    invoice_number: '',
    invoice_date: '',
    vendor_name: '',
    customer_name: '',
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    invoice_type: 'printed',
    currency: 'INR',
    status: 'draft'
};

const FileUpload = () => {
    const [file, setFile] = useState(null);
    const [invoice, setInvoice] = useState(initialInvoice);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [saved, setSaved] = useState(false);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setInvoice((prev) => ({ ...prev, [name]: value }));
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();

        if (!file) {
            setMessage('Please choose a file first.');
            return;
        }

        setLoading(true);
        setMessage('');
        setSaved(false);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('http://localhost:5000/file/fileUpload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Upload failed');
            }

            setInvoice({ ...initialInvoice, ...result.invoice });
            setMessage('Invoice data extracted. Please review and correct any mismatches before saving.');
        } catch (err) {
            setMessage(err.message || 'Something went wrong while uploading.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        setMessage('');

        try {
            const response = await fetch('http://localhost:5000/file/saveInvoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ invoice })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || result.message || 'Save failed');
            }

            setSaved(true);
            setMessage(`Invoice saved successfully. Invoice ID: ${result.invoiceId}`);
        } catch (err) {
            setMessage(err.message || 'Could not save the invoice.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
            <h3>Upload Invoice</h3>

            <form onSubmit={handleFormSubmit}>
                <input type="file" onChange={handleFileChange} />
                <button type="submit" disabled={loading} style={{ marginTop: '10px', display: 'block' }}>
                    {loading ? 'Processing...' : 'Upload & Preview'}
                </button>
            </form>

            {message && (
                <p style={{ marginTop: '15px', color: saved ? 'green' : '#333' }}>
                    {message}
                </p>
            )}

            {invoice.file_name && (
                <div style={{ marginTop: '30px', border: '1px solid #ddd', padding: '20px', borderRadius: '8px' }}>
                    <h4>Review Extracted Invoice Data</h4>
                    <p><strong>File:</strong> {invoice.file_name}</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <label>
                            Invoice Number
                            <input name="invoice_number" value={invoice.invoice_number || ''} onChange={handleInputChange} style={{ width: '100%', marginTop: '5px' }} />
                        </label>

                        <label>
                            Invoice Date
                            <input type="date" name="invoice_date" value={invoice.invoice_date || ''} onChange={handleInputChange} style={{ width: '100%', marginTop: '5px' }} />
                        </label>

                        <label>
                            Vendor Name
                            <input name="vendor_name" value={invoice.vendor_name || ''} onChange={handleInputChange} style={{ width: '100%', marginTop: '5px' }} />
                        </label>

                        <label>
                            Customer Name
                            <input name="customer_name" value={invoice.customer_name || ''} onChange={handleInputChange} style={{ width: '100%', marginTop: '5px' }} />
                        </label>

                        <label>
                            Invoice Type
                            <select name="invoice_type" value={invoice.invoice_type || 'printed'} onChange={handleInputChange} style={{ width: '100%', marginTop: '5px' }}>
                                <option value="printed">Printed</option>
                                <option value="handwritten">Handwritten</option>
                                <option value="mixed">Mixed</option>
                                <option value="unknown">Unknown</option>
                            </select>
                        </label>

                        <label>
                            Currency
                            <input name="currency" value={invoice.currency || 'INR'} onChange={handleInputChange} style={{ width: '100%', marginTop: '5px' }} />
                        </label>

                        <label>
                            Subtotal
                            <input type="number" name="subtotal" value={invoice.subtotal || 0} onChange={handleInputChange} style={{ width: '100%', marginTop: '5px' }} />
                        </label>

                        <label>
                            Tax Amount
                            <input type="number" name="tax_amount" value={invoice.tax_amount || 0} onChange={handleInputChange} style={{ width: '100%', marginTop: '5px' }} />
                        </label>

                        <label>
                            Total Amount
                            <input type="number" name="total_amount" value={invoice.total_amount || 0} onChange={handleInputChange} style={{ width: '100%', marginTop: '5px' }} />
                        </label>
                    </div>

                    <button type="button" onClick={handleSave} disabled={loading} style={{ marginTop: '20px' }}>
                        {loading ? 'Saving...' : 'Save Confirmed Invoice'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default FileUpload;