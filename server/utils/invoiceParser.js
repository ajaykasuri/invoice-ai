const normalizeText = (text = '') =>
  String(text)
    .replace(/\r/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();

const parseMoney = (value) => {
  if (value === null || value === undefined || value === '') return 0;

  const cleaned = String(value)
    .replace(/[^0-9.\-,]/g, '')
    .replace(/,/g, '')
    .replace(/-(?=\d)/g, '')
    .trim();

  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
};

const parseDate = (value) => {
  if (!value) return null;

  const text = String(value).trim();
  const iso = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];

  const slash = text.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/);
  if (slash) {
    const raw = slash[1];
    const [a, b, c] = raw.split(/[/-]/);
    const year = c.length === 2 ? `20${c}` : c;
    const month = String(a).padStart(2, '0');
    const day = String(b).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return null;
};

const extractFirstMatch = (text, patterns, fallback = '') => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) return match[1].trim();
  }
  return fallback;
};

const findAmountByLabel = (text, labels) => {
  const labelRegex = labels.map(label => `${label}\\s*[:\-]?\\s*([₹$€£A-Za-z0-9,./-]+)`).join('|');
  const match = text.match(new RegExp(labelRegex, 'i'));
  if (match && match[1]) return parseMoney(match[1]);
  return 0;
};

const extractFromText = (rawText, fileName = '') => {
  const text = String(rawText || '').trim();
  const name = fileName || '';

  const invoiceNumber = extractFirstMatch(
    text,
    [
      /(?:invoice(?:\s*no|\s*number)|bill(?:\s*no|\s*number)|receipt(?:\s*no)?|inv)(?:\s*[:#-])?\s*([A-Z0-9-]+)/i,
      /(?:invoice|bill|receipt)[\s:#-]*([A-Z0-9-]{4,})/i,
      /([A-Z]{2,}-\d{3,})/i,
      /([A-Z0-9]{6,})/i
    ],
    name.replace(/\.[^/.]+$/, '') || 'INV-UNKNOWN'
  );

  const invoiceDate = parseDate(
    extractFirstMatch(
      text,
      [
        /(?:invoice\s*date|date|bill\s*date|issued\s*on)(?:\s*[:\-])?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})/i,
        /(\d{4}-\d{2}-\d{2})/,
        /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/
      ],
      ''
    )
  );

  const vendorName = extractFirstMatch(
    text,
    [
      /(?:billed\s*from|vendor|supplier|company|from|service\s*provider)(?:\s*[:\-])\s*([A-Za-z0-9&.,()\- ]{3,})/i,
      /([A-Z][A-Za-z0-9&.,()\- ]{3,}(?:\s*(?:LTD|LIMITED|PVT|PRIVATE|LLP|CO|CORP|CORPORATION)))/i,
      /([A-Z][A-Za-z0-9&.,()\- ]{3,})/i
    ],
    'Unknown Vendor'
  );

  const customerName = extractFirstMatch(
    text,
    [
      /(?:bill\s*to|customer|client|name)(?:\s*[:\-])\s*([A-Za-z0-9&.,()\- ]{3,})/i,
      /(?:customer\s*name)\s*[:\-]\s*([A-Za-z0-9&.,()\- ]{3,})/i,
      /(?:to\s*[:\-])\s*([A-Z][A-Za-z0-9&.,()\- ]{3,})/i
    ],
    'Unknown Customer'
  );

  const subtotal = findAmountByLabel(text, ['subtotal', 'sub total', 'amount before tax', 'net amount']);
  const taxAmount = findAmountByLabel(text, ['tax', 'gst', 'vat', 'cgst', 'sgst', 'igst']);
  const totalAmount = findAmountByLabel(text, ['total', 'grand total', 'invoice total', 'amount due']);

  const itemText = text.split(/\n|\r/).filter(line => /\d/.test(line) && /(qty|unit|price|amount|item|service|electric|units)/i.test(line));

  const items = itemText.slice(0, 5).map((line) => {
    const amount = line.match(/([₹$€£]?\s*\d+(?:,\d{3})*(?:\.\d{1,2})?)/g)?.pop() || '0';
    return {
      item_name: line.replace(/[0-9,₹$€£.\-]+/g, '').replace(/\s+/g, ' ').trim() || 'Item',
      description: line,
      quantity: parseMoney(line.match(/(\d+(?:\.\d+)?)\s*(?:qty|unit|units)/i)?.[1] || '1'),
      unit_price: parseMoney(line.match(/[₹$€£]?\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)/)?.[1] || '0'),
      amount: parseMoney(amount)
    };
  });

  return {
    file_name: name,
    original_name: name,
    mime_type: 'text/plain',
    file_size: 0,
    invoice_type: /handwritten|manual|written/i.test(name) ? 'handwritten' : 'printed',
    invoice_number: invoiceNumber,
    invoice_date: invoiceDate,
    due_date: null,
    vendor_name: vendorName,
    vendor_gst: '',
    customer_name: customerName,
    customer_gst: '',
    currency: /rs|inr|₹/i.test(text) ? 'INR' : 'INR',
    subtotal: subtotal || 0,
    tax_amount: taxAmount || 0,
    total_amount: totalAmount || subtotal || 0,
    raw_text: text || `Uploaded file: ${name}`,
    ocr_confidence: 80,
    status: 'draft',
    items
  };
};

const parseGeminiJson = (responseText) => {
  if (!responseText || typeof responseText !== 'string') return null;

  try {
    const cleaned = responseText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      const parsed = JSON.parse(cleaned.slice(start, end + 1));
      return parsed && typeof parsed === 'object' ? parsed : null;
    }
  } catch (error) {
    return null;
  }
  return null;
};

const normalizeGeminiResult = (payload = {}) => {
  const invoiceType =
    payload.invoice_type ||
    (/(handwritten|manual|written)/i.test(payload.vendor_name || '') ? 'handwritten' : 'printed');

  return {
    invoice_number: payload.invoice_number || payload.bill_number || 'INV-UNKNOWN',
    invoice_date: parseDate(payload.invoice_date) || null,
    vendor_name: payload.vendor_name || payload.supplier_name || 'Unknown Vendor',
    customer_name: payload.customer_name || payload.client_name || 'Unknown Customer',
    subtotal: parseMoney(payload.subtotal || payload.net_amount || 0),
    tax_amount: parseMoney(payload.tax_amount || payload.gst || payload.vat || 0),
    total_amount: parseMoney(payload.total_amount || payload.grand_total || payload.total || payload.subtotal || 0),
    currency: payload.currency || 'INR',
    invoice_type: invoiceType
  };
};

const callGeminiForExtraction = async (file) => {
  const apiKey = process.env.GEMIN_API_KEY;
  if (!apiKey || !file?.buffer) return null;

  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];
  const mimeType = file.mimetype || 'application/octet-stream';

  if (!allowedTypes.includes(mimeType)) return null;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Extract the invoice data into valid JSON only. Return ONLY a JSON object, no markdown, no explanation. Use exact keys: invoice_number, invoice_date, vendor_name, customer_name, subtotal, tax_amount, total_amount, currency, invoice_type. Use null for unknown values. The invoice type should be one of: printed, handwritten, mixed, unknown.`
                },
                {
                  inlineData: {
                    mimeType,
                    data: file.buffer.toString('base64')
                  }
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      }
    );

   if (!response.ok) {
  const errBody = await response.text();
  console.error('Gemini API error:', response.status, errBody);
  return null;
}
    const result = await response.json();
    const candidateText = result?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || '')
      .join('\n') || '';

    const parsed = parseGeminiJson(candidateText);
    return parsed ? normalizeGeminiResult(parsed) : null;
  } catch (error) {
    console.error('Gemini extraction failed:', error.message);
    return null;
  }
};

const readUploadedText = async (file) => {
  if (!file?.buffer) return '';

  const mime = (file.mimetype || '').toLowerCase();

  if (mime.startsWith('text/') || mime.includes('json') || mime.includes('csv')) {
    return file.buffer.toString('utf8');
  }

  if (mime.includes('pdf') || mime.startsWith('image/')) {
    const result = await callGeminiForExtraction(file);
    if (result && typeof result === 'object') {
      return JSON.stringify(result);
    }
  }

  return '';
};

const extractInvoiceFromFile = async (file) => {
  const fileName = file?.originalname || 'invoice-file';
  const rawText = await readUploadedText(file);

  if (rawText && rawText.trim().startsWith('{')) {
    const extracted = parseGeminiJson(rawText);
    if (extracted) {
      const normalized = normalizeGeminiResult(extracted);

      return {
        file_name: fileName,
        original_name: fileName,
        mime_type: file?.mimetype || 'application/octet-stream',
        file_size: file?.size || 0,
        invoice_type: normalized.invoice_type || (/handwritten|manual|written/i.test(fileName) ? 'handwritten' : 'printed'),
        invoice_number: normalized.invoice_number || 'INV-UNKNOWN',
        invoice_date: normalized.invoice_date || new Date().toISOString().slice(0, 10),
        due_date: null,
        vendor_name: normalized.vendor_name || 'Unknown Vendor',
        vendor_gst: '',
        customer_name: normalized.customer_name || 'Unknown Customer',
        customer_gst: '',
        currency: normalized.currency || 'INR',
        subtotal: normalized.subtotal || 0,
        tax_amount: normalized.tax_amount || 0,
        total_amount: normalized.total_amount || normalized.subtotal || 0,
        raw_text: JSON.stringify(extracted),
        ocr_confidence: 90,
        status: 'draft',
        items: []
      };
    }
  }

  return extractFromText(rawText || fileName, fileName);
};

module.exports = { extractInvoiceFromFile, extractFromText, parseMoney, parseDate };
