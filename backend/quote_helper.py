import re
import random
import html
import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from fpdf import FPDF

# A pre-defined product catalog with standard pricing
PRODUCT_CATALOG = {
    "laptop": 1200.00,
    "desktop": 950.00,
    "monitor": 280.00,
    "screen": 280.00,
    "keyboard": 45.00,
    "mouse": 25.00,
    "office chair": 180.00,
    "chair": 180.00,
    "desk": 220.00,
    "table": 220.00,
    "headphones": 75.00,
    "headset": 75.00,
    "webcam": 60.00,
    "camera": 60.00,
    "router": 150.00,
    "switch": 150.00,
    "server": 4500.00,
    "software license": 110.00,
    "license": 110.00,
    "cloud hosting": 85.00,
    "consulting": 150.00,
    "training": 150.00
}

def is_quote_related(subject, body):
    """Determines if the email is a quote request based on keywords in subject or body."""
    text = f"{subject} {body}".lower()
    keywords = [
        r"\bquote\b", r"\bquotation\b", r"\bpricing\b", r"\bprice quote\b",
        r"\bprice estimation\b", r"\brfq\b", r"\bcost estimate\b",
        r"\bprice list\b", r"\bhow much for\b", r"\bcost of\b"
    ]
    return any(re.search(kw, text) for kw in keywords)

def get_unit_price(item_name):
    """Matches an item name against the catalog to retrieve its price."""
    item_lower = item_name.lower().strip()
    for product, price in PRODUCT_CATALOG.items():
        if product in item_lower:
            return price
    return 100.00

def parse_items_and_qty(text):
    """
    Parses items and quantities from catalog-based text emails.
    """
    items = []
    lines = text.split('\n')
    seen_items = set()

    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        m = re.search(r'(\d+)\s+units?\s+of\s+([\w\s\-]{2,30})', line, re.IGNORECASE)
        if m:
            qty = int(m.group(1))
            name = m.group(2).strip()
            if name.lower() not in seen_items:
                items.append((name, qty))
                seen_items.add(name.lower())
            continue
            
        m = re.search(r'^(\d+)\s*x?\s+([\w\s\-]{2,30})$', line, re.IGNORECASE)
        if m:
            qty = int(m.group(1))
            name = m.group(2).strip()
            if name.lower() not in seen_items:
                items.append((name, qty))
                seen_items.add(name.lower())
            continue
            
        m = re.search(r'^([\w\s\-]{2,30})\s*[:\-]\s*(\d+)$', line, re.IGNORECASE)
        if m:
            name = m.group(1).strip()
            qty = int(m.group(2))
            if name.lower() not in seen_items:
                items.append((name, qty))
                seen_items.add(name.lower())
            continue
            
        for prod_key in PRODUCT_CATALOG.keys():
            m = re.search(r'(\d+)\s+(' + re.escape(prod_key) + r's?)', line, re.IGNORECASE)
            if m:
                qty = int(m.group(1))
                name = m.group(2).strip()
                if name.lower().endswith('s') and not prod_key.endswith('s'):
                    name = name[:-1]
                if prod_key not in seen_items:
                    items.append((name.capitalize(), qty))
                    seen_items.add(prod_key)

    if not items:
        items.append(("General Equipment / Services Request", 1))
        
    return items

def parse_quote_details(text):
    """
    Parses structured quote details from emails.
    Extracts Quote ID, Date, Client Name, Project details, and item costs under Commercial Summary.
    """
    details = {
        "quote_id": None,
        "date": None,
        "customer_name": None,
        "project_name": None,
        "project_location": None,
        "line_items": [],
        "subtotal": 0.0,
        "tax": 0.0,
        "total": 0.0,
        "currency": "₹"
    }

    # Clean HTML tags and entities
    text_clean = re.sub(r'<[^>]+>', '\n', text)
    text_clean = html.unescape(text_clean)
    text_clean = text_clean.replace('\r\n', '\n').replace('\r', '\n')

    # 1. Parse Quotation Details fields
    quote_id_m = re.search(r'Quote\s+ID\s*:\s*([A-Za-z0-9\-]+)', text_clean, re.IGNORECASE)
    if quote_id_m:
        details["quote_id"] = quote_id_m.group(1).strip()

    date_m = re.search(r'(?:Quotation\s+)?Date\s*:\s*([^\n\r]+)', text_clean, re.IGNORECASE)
    if date_m:
        details["date"] = date_m.group(1).strip()

    cust_m = re.search(r'Customer\s+(?:Name)?\s*:\s*([^\n\r]+)', text_clean, re.IGNORECASE)
    if cust_m:
        details["customer_name"] = cust_m.group(1).strip()

    proj_m = re.search(r'Project\s+(?:Name)?\s*:\s*([^\n\r]+)', text_clean, re.IGNORECASE)
    if proj_m:
        details["project_name"] = proj_m.group(1).strip()

    loc_m = re.search(r'Project\s+Location\s*:\s*([^\n\r]+)', text_clean, re.IGNORECASE)
    if loc_m:
        details["project_location"] = loc_m.group(1).strip()

    # 2. Match currency
    currency_m = re.search(r'(₹|\bRs\.?|\$|USD|INR)', text_clean)
    if currency_m:
        details["currency"] = currency_m.group(1)

    # 3. Extract items from Commercial Summary section
    summary_section = text_clean
    summary_match = re.search(r'Commercial\s+Summary(.*?)(?:Commercial\s+Terms|Terms\s+and\s+Conditions|$)', text_clean, re.DOTALL | re.IGNORECASE)
    if summary_match:
        summary_section = summary_match.group(1)

    exclude_keywords = ["id", "date", "customer", "project", "location", "total", "amount", "summary", "schedule", "term", "valid"]
    line_items = []
    total_val = 0.0

    for line in summary_section.split('\n'):
        line = line.strip()
        if not line:
            continue

        # Match <description> : <optional currency prefix> <amount>
        m = re.search(r'(?:^\*?\s*)?([\w\s&–\-]+)\s*:\s*([^0-9\n\r]*?)\s*([\d,]+(?:\.\d+)?)', line)
        if m:
            desc = m.group(1).strip()
            prefix = m.group(2).strip()
            amount_str = m.group(3).strip()

            desc_lower = desc.lower()
            
            # Check exclusions
            if any(ek in desc_lower for ek in exclude_keywords):
                if "total" in desc_lower and ("amount" in desc_lower or "quotation" in desc_lower or "due" in desc_lower):
                    try:
                        details["total"] = float(amount_str.replace(',', ''))
                    except ValueError:
                        pass
                continue

            has_currency = any(sym in prefix or sym in line for sym in ['₹', 'Rs', '$', 'USD', 'INR', ' rupees'])
            is_cost = any(cw in desc_lower for cw in ['cost', 'charge', 'price', 'fee', 'painting', 'transport', 'erection', 'installation', 'summary'])

            if has_currency or is_cost:
                try:
                    amt_val = float(amount_str.replace(',', ''))
                    line_items.append({
                        "item": desc,
                        "quantity": 1,
                        "unit_price": amt_val,
                        "total": amt_val
                    })
                    total_val += amt_val
                except ValueError:
                    pass

    details["line_items"] = line_items
    details["subtotal"] = total_val

    if not details["total"]:
        details["total"] = total_val

    return details

def generate_quote_data(sender, subject, body_text):
    """Generates quote data by trying structured parsing first, then catalog parsing."""
    details = parse_quote_details(body_text)

    # Use structured details if parsed successfully
    if details["quote_id"] and details["line_items"]:
        if not details["customer_name"]:
            details["customer_name"] = sender
        if not details["date"]:
            details["date"] = datetime.now().strftime("%Y-%m-%d")
        return details

    # Fallback to catalog product-based parsing
    items = parse_items_and_qty(body_text)
    line_items = []
    subtotal = 0.0
    for name, qty in items:
        unit_price = get_unit_price(name)
        total = unit_price * qty
        subtotal += total
        line_items.append({
            "item": name,
            "quantity": qty,
            "unit_price": unit_price,
            "total": total
        })

    tax = round(subtotal * 0.08, 2)
    grand_total = subtotal + tax
    
    quote_ref = f"QTE-{datetime.now().strftime('%Y%m%d')}-{random.randint(1000, 9999)}"

    return {
        "quote_id": quote_ref,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "customer_name": sender,
        "project_name": "Equipment Supply Inquiry",
        "project_location": "N/A",
        "line_items": line_items,
        "subtotal": subtotal,
        "tax": tax,
        "total": grand_total,
        "currency": "$"
    }

def format_quote_txt(quote_data):
    """Formats quote data as plain text."""
    border = "=" * 46
    line = "-" * 46
    currency = quote_data.get("currency", "$")
    
    txt = f"{border}\n"
    txt += f"               BUSINESS QUOTATION\n"
    txt += f"{border}\n"
    txt += f"Quote Reference: {quote_data['quote_id']}\n"
    txt += f"Date Issued:     {quote_data['date']}\n"
    txt += f"Prepared For:\n"
    txt += f"  Client:        {quote_data['customer_name']}\n"
    txt += f"  Project Name:  {quote_data.get('project_name', 'N/A')}\n"
    txt += f"  Location:      {quote_data.get('project_location', 'N/A')}\n"
    txt += f"{line}\n"
    txt += f"{'Item Description':<22} {'Qty':<4} {'Price':<9} {'Total':<9}\n"
    txt += f"{line}\n"
    for item in quote_data['line_items']:
        name_trunc = item['item'][:21]
        txt += f"{name_trunc:<22} {item['quantity']:<4} {currency}{item['unit_price']:<8.2f} {currency}{item['total']:<8.2f}\n"
    txt += f"{line}\n"
    txt += f"{'Subtotal:':<28} {currency}{quote_data['subtotal']:<8.2f}\n"
    if quote_data.get("tax", 0.0) > 0.0:
        txt += f"{'Estimated Tax (8%):':<28} {currency}{quote_data['tax']:<8.2f}\n"
    txt += f"{'Grand Total Due:':<28} {currency}{quote_data['total']:<8.2f}\n"
    txt += f"{border}\n"
    return txt

def format_quote_html(quote_data):
    """Formats quote data as HTML."""
    currency = quote_data.get("currency", "$")
    html_items = ""
    for item in quote_data['line_items']:
        html_items += f"""
        <tr class="item">
            <td>{item['item']}</td>
            <td style="text-align: center;">{item['quantity']}</td>
            <td style="text-align: right;">{currency}{item['unit_price']:.2f}</td>
            <td style="text-align: right;">{currency}{item['total']:.2f}</td>
        </tr>
        """
        
    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Quotation {quote_data['quote_id']}</title>
    <style>
        body {{ font-family: Arial, sans-serif; color: #333; }}
        .invoice-box {{ max-width: 650px; margin: auto; padding: 25px; border: 1px solid #eee; border-radius: 8px; }}
        .header {{ display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 15px; }}
        .brand-title {{ font-size: 24px; font-weight: bold; color: #4F46E5; }}
        .client-section {{ margin: 20px 0; background: #f9f9f9; padding: 15px; border-radius: 6px; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 15px; }}
        th {{ background: #f3f3f3; padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }}
        td {{ padding: 10px; border-bottom: 1px solid #eee; }}
        .summary {{ width: 50%; margin-left: auto; margin-top: 15px; }}
        .summary td {{ padding: 5px; border: none; }}
        .total {{ font-weight: bold; color: #4F46E5; font-size: 16px; }}
    </style>
</head>
<body>
    <div class="invoice-box">
        <div class="header">
            <div>
                <div class="brand-title">SALES QUOTATION</div>
            </div>
            <div style="text-align: right;">
                <strong>Quote ID:</strong> {quote_data['quote_id']}<br>
                <strong>Date:</strong> {quote_data['date']}
            </div>
        </div>
        <div class="client-section">
            <strong>Prepared For:</strong><br>
            Customer Name: {quote_data['customer_name']}<br>
            Project Name: {quote_data.get('project_name', 'N/A')}<br>
            Project Location: {quote_data.get('project_location', 'N/A')}
        </div>
        <table>
            <thead>
                <tr>
                    <th>Description</th>
                    <th style="text-align: center;">Qty</th>
                    <th style="text-align: right;">Unit Price</th>
                    <th style="text-align: right;">Total</th>
                </tr>
            </thead>
            <tbody>
                {html_items}
            </tbody>
        </table>
        <table class="summary">
            <tr>
                <td>Subtotal:</td>
                <td style="text-align: right;">{currency}{quote_data['subtotal']:.2f}</td>
            </tr>
            {"<tr><td>Tax:</td><td style='text-align: right;'>" + currency + str(f"{quote_data['tax']:.2f}") + "</td></tr>" if quote_data.get('tax', 0.0) > 0.0 else ""}
            <tr class="total">
                <td>Total:</td>
                <td style="text-align: right;">{currency}{quote_data['total']:.2f}</td>
            </tr>
        </table>
    </div>
</body>
</html>
"""
    return html

def clean_pdf_text(text):
    """Replaces Unicode characters outside Latin-1 character set with ASCII equivalents to prevent FPDF failures."""
    if not text:
        return ""
    replacements = {
        "\u2013": "-",  # en-dash
        "\u2014": "-",  # em-dash
        "\u2018": "'",  # left single quote
        "\u2019": "'",  # right single quote
        "\u201c": '"',  # left double quote
        "\u201d": '"',  # right double quote
        "\u2022": "*",  # bullet point
        "₹": "INR",     # Rupee symbol
    }
    for char, rep in replacements.items():
        text = text.replace(char, rep)
    # Encode and decode using latin-1 replace to handle any unmapped glyphs safely
    return text.encode('latin-1', 'replace').decode('latin-1')

def generate_pdf_quote(quote_data, output_path):
    """Generates a professional PDF quote document using fpdf2."""
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    
    # Currency symbol conversion to avoid glyph error in PDF Standard font
    currency = quote_data.get("currency", "$")
    if currency == "₹":
        currency = "INR"
    elif currency.lower() == "rs":
        currency = "Rs"
    else:
        currency = clean_pdf_text(currency)

    # Clean text values for PDF safety
    q_id = clean_pdf_text(quote_data['quote_id'])
    q_date = clean_pdf_text(quote_data['date'])
    client_name = clean_pdf_text(quote_data.get("customer_name", "Unknown Client"))
    subject_text = clean_pdf_text(quote_data.get("subject", "N/A"))
    project_name = clean_pdf_text(quote_data.get("project_name", "N/A"))
    project_location = clean_pdf_text(quote_data.get("project_location", "N/A"))

    # 1. Title Header Banner
    pdf.set_fill_color(79, 70, 229) # Indigo primary
    pdf.rect(0, 0, 210, 38, 'F')
    
    pdf.set_y(10)
    pdf.set_x(15)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("helvetica", "B", 20)
    pdf.cell(0, 10, "SALES QUOTATION", ln=True)
    
    pdf.set_x(15)
    pdf.set_font("helvetica", "I", 9)
    pdf.cell(0, 5, "Email Automation Engine", ln=True)
    
    # Top right quote parameters
    pdf.set_y(10)
    pdf.set_x(120)
    pdf.set_font("helvetica", "B", 10)
    pdf.cell(0, 5, f"Quote ID: {q_id}", ln=True, align="R")
    pdf.set_x(120)
    pdf.set_font("helvetica", "", 10)
    pdf.cell(0, 5, f"Date: {q_date}", ln=True, align="R")
    pdf.set_x(120)
    pdf.cell(0, 5, "Validity: 30 Days", ln=True, align="R")
    
    pdf.ln(25)
    
    # 2. Client Details Section Block
    pdf.set_x(15)
    pdf.set_fill_color(249, 250, 251)
    pdf.set_draw_color(229, 231, 235)
    pdf.rect(15, 48, 180, 32, 'DF')
    
    pdf.set_y(50)
    pdf.set_x(20)
    pdf.set_text_color(17, 24, 39)
    pdf.set_font("helvetica", "B", 11)
    pdf.cell(0, 6, "Prepared For:", ln=True)
    
    pdf.set_x(20)
    pdf.set_font("helvetica", "", 10)
    pdf.set_text_color(75, 85, 99)
    
    if len(client_name) > 65:
        client_name = client_name[:62] + "..."
    pdf.cell(0, 5, f"Client Name: {client_name}", ln=True)
    
    if len(subject_text) > 65:
        subject_text = subject_text[:62] + "..."
    pdf.cell(0, 5, f"Regarding: {subject_text}", ln=True)
    
    # 3. Project details card if available
    has_project = bool(project_name and project_name != "Equipment Supply Inquiry")
    if has_project:
        pdf.set_fill_color(249, 250, 251)
        pdf.rect(15, 83, 180, 22, 'DF')
        pdf.set_y(85)
        pdf.set_x(20)
        pdf.set_text_color(17, 24, 39)
        
        if len(project_name) > 65:
            project_name = project_name[:62] + "..."
        pdf.cell(0, 5, f"Project Name: {project_name}", ln=True)
        
        if len(project_location) > 65:
            project_location = project_location[:62] + "..."
        pdf.cell(0, 5, f"Project Location: {project_location}", ln=True)
        pdf.ln(12)
    else:
        pdf.ln(15)
        
    # 4. Table Headers
    pdf.set_x(15)
    pdf.set_fill_color(243, 244, 246)
    pdf.set_text_color(55, 65, 81)
    pdf.set_font("helvetica", "B", 10)
    
    pdf.cell(90, 10, " Description", border=1, fill=True)
    pdf.cell(20, 10, "Qty", border=1, fill=True, align="C")
    pdf.cell(35, 10, "Unit Price", border=1, fill=True, align="R")
    pdf.cell(35, 10, "Total", border=1, fill=True, align="R")
    pdf.ln()
    
    # 5. Table Rows
    pdf.set_font("helvetica", "", 10)
    pdf.set_text_color(17, 24, 39)
    for item in quote_data['line_items']:
        pdf.set_x(15)
        item_name = clean_pdf_text(item['item'])
        if len(item_name) > 42:
            item_name = item_name[:39] + "..."
            
        pdf.cell(90, 10, f" {item_name}", border=1)
        pdf.cell(20, 10, str(item['quantity']), border=1, align="C")
        pdf.cell(35, 10, f"{currency} {item['unit_price']:.2f}", border=1, align="R")
        pdf.cell(35, 10, f"{currency} {item['total']:.2f}", border=1, align="R")
        pdf.ln()
        
    # 6. Pricing Summary
    pdf.ln(5)
    pdf.set_font("helvetica", "", 10)
    pdf.set_text_color(107, 114, 128)
    
    pdf.set_x(110)
    pdf.cell(45, 8, "Subtotal:", align="R")
    pdf.set_font("helvetica", "B", 10)
    pdf.set_text_color(17, 24, 39)
    pdf.cell(40, 8, f"{currency} {quote_data['subtotal']:.2f}", align="R")
    pdf.ln()
    
    if quote_data.get("tax", 0.0) > 0.0:
        pdf.set_x(110)
        pdf.set_font("helvetica", "", 10)
        pdf.set_text_color(107, 114, 128)
        pdf.cell(45, 8, "Estimated Tax (8%):", align="R")
        pdf.set_font("helvetica", "B", 10)
        pdf.set_text_color(17, 24, 39)
        pdf.cell(40, 8, f"{currency} {quote_data['tax']:.2f}", align="R")
        pdf.ln()
    
    pdf.set_x(110)
    pdf.set_fill_color(79, 70, 229)
    pdf.set_text_color(79, 70, 229)
    pdf.set_font("helvetica", "B", 12)
    pdf.cell(45, 10, "Grand Total:", align="R")
    pdf.cell(40, 10, f"{currency} {quote_data['total']:.2f}", align="R")
    pdf.ln()
    
    # 7. Footer
    pdf.set_y(-25)
    pdf.set_x(15)
    pdf.set_font("helvetica", "I", 8)
    pdf.set_text_color(156, 163, 175)
    pdf.cell(180, 5, "This is an auto-generated quotation based on the received email inquiry.", align="C", ln=True)
    pdf.cell(180, 5, "Thank you for your business! This quotation is valid for 30 days.", align="C", ln=True)
    
    pdf.output(output_path)

def send_quote_email(config, quote_data, pdf_path):
    """Sends the quotation email with the PDF attachment using SMTP."""
    sender_email = config.get("email_user")
    password = config.get("email_password")
    
    # Determine SMTP server based on IMAP server
    imap_server = config.get("imap_server", "")
    if "gmail" in imap_server:
        smtp_server = "smtp.gmail.com"
        smtp_port = 587
    elif "outlook" in imap_server or "office365" in imap_server:
        smtp_server = "smtp.office365.com"
        smtp_port = 587
    else:
        # Default fallback
        smtp_server = imap_server.replace("imap", "smtp")
        smtp_port = 587

    # Target recipient (original sender of the quote request)
    recipient_email = quote_data["customer_name"]  # Use parsed customer name
    if not recipient_email or "@" not in recipient_email:
        recipient_email = quote_data["sender"]       # Fallback to sender header

    # Parse out email address if in name format
    m = re.search(r'<([^>]+)>', recipient_email)
    if m:
        recipient_email = m.group(1).strip()
        
    print(f"Sending quotation {quote_data['quote_id']} to {recipient_email} via SMTP...")

    # Create message
    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['To'] = recipient_email
    msg['Subject'] = f"Quotation {quote_data['quote_id']} - {quote_data.get('project_name', 'Inquiry')}"
    
    # Currency
    currency = quote_data.get("currency", "$")
    if currency == "₹":
        currency = "INR"

    # Create body text template
    body = f"""Dear {quote_data.get('customer_name', 'Customer')},

Thank you for your business inquiry regarding the project: {quote_data.get('project_name', 'Equipment/Services Request')}.

We are pleased to submit our commercial quotation (Ref: {quote_data['quote_id']}) for your review. Please find the detailed quotation PDF document attached to this email.

Commercial Summary:
- Project Location: {quote_data.get('project_location', 'N/A')}
- Total Amount: {currency} {quote_data['total']:,.2f}

If you have any questions or require modifications to this proposal, please do not hesitate to contact us.

Best Regards,
Project Sales Team
Email Automation Engine
"""
    msg.attach(MIMEText(body, 'plain'))
    
    # Attach PDF
    try:
        with open(pdf_path, "rb") as attachment:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(attachment.read())
        encoders.encode_base64(part)
        part.add_header(
            "Content-Disposition",
            f"attachment; filename=quote_{quote_data['quote_id']}.pdf",
        )
        msg.attach(part)
    except Exception as e:
        print(f"Failed to attach PDF to email: {e}")
        raise e

    # Send email
    try:
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(sender_email, password)
        server.sendmail(sender_email, recipient_email, msg.as_string())
        server.quit()
        print("Email sent successfully!")
        return True
    except Exception as smtp_err:
        print(f"SMTP error: {smtp_err}")
        raise smtp_err

def send_custom_quote_email(config, recipient_email, subject, body_text, pdf_path):
    """Sends a custom email with a PDF attachment using SMTP."""
    sender_email = config.get("email_user")
    password = config.get("email_password")
    
    imap_server = config.get("imap_server", "")
    if "gmail" in imap_server:
        smtp_server = "smtp.gmail.com"
        smtp_port = 587
    elif "outlook" in imap_server or "office365" in imap_server:
        smtp_server = "smtp.office365.com"
        smtp_port = 587
    else:
        smtp_server = imap_server.replace("imap", "smtp")
        smtp_port = 587

    # Parse out recipient email address
    m = re.search(r'<([^>]+)>', recipient_email)
    if m:
        recipient_email = m.group(1).strip()

    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['To'] = recipient_email
    msg['Subject'] = subject
    
    msg.attach(MIMEText(body_text, 'plain'))
    
    try:
        import os
        with open(pdf_path, "rb") as attachment:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(attachment.read())
        encoders.encode_base64(part)
        part.add_header(
            "Content-Disposition",
            f"attachment; filename={os.path.basename(pdf_path)}",
        )
        msg.attach(part)
    except Exception as e:
        print(f"Failed to attach PDF to email: {e}")
        raise e

    try:
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(sender_email, password)
        server.sendmail(sender_email, recipient_email, msg.as_string())
        server.quit()
        return True
    except Exception as smtp_err:
        print(f"SMTP error: {smtp_err}")
        raise smtp_err
