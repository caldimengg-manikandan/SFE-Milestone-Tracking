import os
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
from typing import Any, Dict

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

def parse_quote_details(text: str) -> dict[str, Any]:
    """
    Parses structured quote details from emails.
    Extracts Quote ID, Date, Client Name, Project details, and item costs under Commercial Summary.
    """
    details: dict[str, Any] = {
        "bid_reference": None,
        "quote_id": None,
        "date": None,
        "customer_name": None,
        "project_name": None,
        "project_location": None,
        "project_comments": None,
        "budget_type": None,
        "bid_due_date": None,
        "bid_due_time": None,
        "distance_travel": None,
        "decision_to_bid": None,
        "scope_of_work": None,
        "primary_estimator": None,
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
    # Strip markdown asterisks to prevent formatting from disrupting regex matches
    text_clean = text_clean.replace('*', '')

    # Helper function to extract field values
    def get_field_val(patterns):
        for pattern in patterns:
            m = re.search(pattern, text_clean, re.IGNORECASE)
            if m:
                return m.group(1).strip()
        return None

    # 1. Parse Quotation Details fields
    details["bid_reference"] = get_field_val([
        r'Bid\s+Reference\s*:\s*([#\w\-]+)',
        r'Bid\s+Ref\s*:\s*([#\w\-]+)',
    ])

    details["quote_id"] = get_field_val([
        r'Quote\s+(?:Number|ID|Ref)\s*:\s*([#\w\-]+)',
        r'(?:Bid\s+Reference|Quote\s+ID|Quote\s+Ref)\s*:\s*([#\w\-]+)',
        r'Quote\s+ID\s*:\s*([^\n\r]+)'
    ]) or details["bid_reference"]

    details["date"] = get_field_val([
        r'Quotation\s+Date\s*:\s*([^\n\r]+)',
        r'Date\s*:\s*([^\n\r]+)'
    ])

    details["budget_type"] = get_field_val([
        r'Quotation\s+Type\s*:\s*([^\n\r]+)',
        r'Type\s*:\s*([^\n\r]+)'
    ])

    details["customer_name"] = get_field_val([
        r'Customer\s*(?:Name)?\s*:\s*([^\n\r]+)',
        r'Client\s*:\s*([^\n\r]+)'
    ])

    details["project_name"] = get_field_val([
        r'Project\s*(?:Name)?\s*:\s*([^\n\r]+)',
        r'(?:our|upcoming|new)\s+project\s*,\s*([^\n\r,]+)',
        r'project\s+named\s+([^\n\r,]+)',
        r'project\s+called\s+([^\n\r,]+)',
    ])

    details["project_location"] = get_field_val([
        r'Project\s+Location\s*:\s*([^\n\r]+)',
        r'Location\s*:\s*([^\n\r]+)',
        r'located\s+in\s+([^\n\r,.]+,\s*[^\n\r,.]+)', # matches "located in Bangalore, Karnataka"
        r'located\s+in\s+([^\n\r,.]+)',
        r'location\s+is\s+([^\n\r,.]+)'
    ])

    details["project_comments"] = get_field_val([
        r'Project\s+Comments\s*:\s*([^\n\r]+)'
    ])

    # Parse bid due date and time, supporting combined formats
    bid_due_val = get_field_val([
        r'(?:Bid\s+Submission\s+Deadline|Bid\s+Due\s+Date|Due\s+Date|Submission\s+Deadline)\s*:\s*([^\n\r]+)',
        r'Bid\s+Due\s*:\s*([^\n\r]+)',
    ])
    if bid_due_val:
        parts = re.split(r',|\bat\b', bid_due_val)
        details["bid_due_date"] = parts[0].strip()
        if len(parts) > 1:
            details["bid_due_time"] = parts[1].strip()

    if not details.get("bid_due_date"):
        details["bid_due_date"] = get_field_val([
            r'Bid\s+Due\s+Date\s*:\s*([^\n\r]+)',
            r'Due\s+Date\s*:\s*([^\n\r]+)',
            r'Deadline\s*:\s*([^\n\r]+)'
        ])

    if not details.get("bid_due_time"):
        details["bid_due_time"] = get_field_val([
            r'Bid\s+Due\s+Time\s*:\s*([^\n\r]+)',
            r'Due\s+Time\s*:\s*([^\n\r]+)',
            r'(?:^|\n)\s*Time\s*:\s*([^\n\r]+)'
        ])

    details["distance_travel"] = get_field_val([
        r'Distance\s*:\s*([^\n\r]+)'
    ])

    details["decision_to_bid"] = get_field_val([
        r'Decision\s+To\s+Bid\s*:\s*([^\n\r]+)'
    ])

    details["scope_of_work"] = get_field_val([
        r'Scope\s+of\s+Work\s*:\s*([^\n\r]+)'
    ])

    details["primary_estimator"] = get_field_val([
        r'Primary\s+Estimator\s*:\s*([^\n\r]+)'
    ])

    # 2. Match currency
    currency_m = re.search(r'(₹|\bRs\.?|\$|USD|INR)', text_clean)
    if currency_m:
        details["currency"] = currency_m.group(1)

    # 3. Extract items from Commercial Summary section
    summary_section = text_clean
    summary_match = re.search(r'Commercial\s+Summary(.*?)(?:Commercial\s+Terms|Terms\s+and\s+Conditions|$)', text_clean, re.DOTALL | re.IGNORECASE)
    if summary_match:
        summary_section = summary_match.group(1)

    exclude_keywords = ["id", "date", "customer", "project", "location", "total", "amount", "summary", "schedule", "term", "valid", "due", "distance", "decision", "scope", "estimator", "reference"]
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
    if details["quote_id"] or details["project_name"] or details["customer_name"]:
        if not details["quote_id"]:
            details["quote_id"] = f"QTE-{datetime.now().strftime('%Y%m%d')}-{random.randint(1000, 9999)}"
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
            {"<tr><td>Tax:</td><td style='text-align: right;'>" + currency + f"{quote_data['tax']:.2f}" + "</td></tr>" if quote_data.get('tax', 0.0) > 0.0 else ""}
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
        "\u2010": "-",  # hyphen
        "\u2011": "-",  # non-breaking hyphen
        "\u2012": "-",  # figure dash
        "\u2013": "-",  # en-dash
        "\u2014": "-",  # em-dash
        "\u2015": "-",  # horizontal bar
        "\u2018": "'",  # left single quote
        "\u2019": "'",  # right single quote
        "\u201a": "'",  # single low-9 quote
        "\u201b": "'",  # single high-reversed-9 quote
        "\u201c": '"',  # left double quote
        "\u201d": '"',  # right double quote
        "\u201e": '"',  # double low-9 quote
        "\u2022": "*",  # bullet point
        "\u2026": "...", # horizontal ellipsis
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
    pdf.cell(0, 10, "SALES QUOTATION")
    pdf.ln()
    
    pdf.set_x(15)
    pdf.set_font("helvetica", "I", 9)
    pdf.cell(0, 5, "Email Automation Engine")
    pdf.ln()
    
    # Top right quote parameters
    pdf.set_y(10)
    pdf.set_x(120)
    pdf.set_font("helvetica", "B", 10)
    pdf.cell(0, 5, f"Quote ID: {q_id}", align="R")
    pdf.ln()
    pdf.set_x(120)
    pdf.set_font("helvetica", "", 10)
    pdf.cell(0, 5, f"Date: {q_date}", align="R")
    pdf.ln()
    pdf.set_x(120)
    pdf.cell(0, 5, "Validity: 30 Days", align="R")
    pdf.ln()
    
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
    pdf.cell(0, 6, "Prepared For:")
    pdf.ln()
    
    pdf.set_x(20)
    pdf.set_font("helvetica", "", 10)
    pdf.set_text_color(75, 85, 99)
    
    if len(client_name) > 65:
        client_name = client_name[:62] + "..."
    pdf.cell(0, 5, f"Client Name: {client_name}")
    pdf.ln()
    
    if len(subject_text) > 65:
        subject_text = subject_text[:62] + "..."
    pdf.cell(0, 5, f"Regarding: {subject_text}")
    pdf.ln()
    
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
        pdf.cell(0, 5, f"Project Name: {project_name}")
        pdf.ln()
        
        if len(project_location) > 65:
            project_location = project_location[:62] + "..."
        pdf.cell(0, 5, f"Project Location: {project_location}")
        pdf.ln()
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
    pdf.cell(180, 5, "This is an auto-generated quotation based on the received email inquiry.", align="C")
    pdf.ln()
    pdf.cell(180, 5, "Thank you for your business! This quotation is valid for 30 days.", align="C")
    pdf.ln()
    
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
    recipient_email = quote_data.get("customer_email") or quote_data.get("sender")
    if not recipient_email or "@" not in recipient_email:
        recipient_email = quote_data.get("customer_name")

    # Parse out email address if in name format
    if recipient_email:
        m = re.search(r'<([^>]+)>', recipient_email)
        if m:
            recipient_email = m.group(1).strip()
        else:
            email_m = re.search(r'[\w.+]+@[\w.-]+\.[a-zA-Z]{2,}', recipient_email)
            if email_m:
                recipient_email = email_m.group(0).strip()

    if not recipient_email or "@" not in recipient_email:
        raise ValueError(f"No valid recipient email address could be determined for quote {quote_data.get('quote_id')}.")

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
    server = smtplib.SMTP(smtp_server, smtp_port)
    try:
        server.starttls()
        server.login(sender_email, password)
        server.sendmail(sender_email, recipient_email, msg.as_string())
        print("Email sent successfully!")
        return True
    except Exception as smtp_err:
        print(f"SMTP error: {smtp_err}")
        raise smtp_err
    finally:
        try:
            server.quit()
        except Exception:
            pass

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
    else:
        email_m = re.search(r'[\w.+]+@[\w.-]+\.[a-zA-Z]{2,}', recipient_email)
        if email_m:
            recipient_email = email_m.group(0).strip()

    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['To'] = recipient_email
    msg['Subject'] = subject
    
    msg.attach(MIMEText(body_text, 'plain'))
    
    if pdf_path and os.path.exists(pdf_path):
        try:
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

    server = smtplib.SMTP(smtp_server, smtp_port)
    try:
        server.starttls()
        server.login(sender_email, password)
        server.sendmail(sender_email, recipient_email, msg.as_string())
        return True
    except Exception as smtp_err:
        print(f"SMTP error: {smtp_err}")
        raise smtp_err
    finally:
        try:
            server.quit()
        except Exception:
            pass


def clean_reply_content(text):
    """
    Cleans an email reply by:
    1. Removing email client forwarding/reply quotation headers (e.g. 'On ... wrote:').
    2. Stripping leading greetings (e.g. 'Hi,', 'Hello team,', 'Good morning,').
    3. Stripping trailing sign-offs / footers (e.g. 'Thanks,', 'Best regards,', signatures).
    4. Returning only the core technical/cost information.
    """
    if not text:
        return ""
    
    # 1. Normalize line endings and split
    lines = text.replace('\r\n', '\n').replace('\r', '\n').split('\n')
    cleaned_lines = []
    
    # Strip thread quotes / forwarded headers
    for line in lines:
        stripped = line.strip()
        if re.match(r'^(On\s+.+wrote:|From:\s*.+|Sent:\s*.+|To:\s*.+|Subject:\s*.+|---------- Forwarded message ----------)', stripped, re.IGNORECASE):
            break
        if stripped.startswith('>') or stripped.startswith('>>'):
            continue
        cleaned_lines.append(stripped)

    # Remove empty lines at start and end
    while cleaned_lines and not cleaned_lines[0]:
        cleaned_lines.pop(0)
    while cleaned_lines and not cleaned_lines[-1]:
        cleaned_lines.pop()

    # 2. Strip leading greetings
    greeting_pattern = re.compile(
        r'^(?:hi|hello|hey|dear|good\s+morning|good\s+afternoon|good\s+evening|greetings)'
        r'(?:\s+[\w\s\.\,\-\/\&]+)?[,\:\!\-]?$',
        re.IGNORECASE
    )
    while cleaned_lines and (not cleaned_lines[0] or greeting_pattern.match(cleaned_lines[0])):
        cleaned_lines.pop(0)

    # 3. Comprehensive signature, sign-off, and corporate footer detection
    signoff_pattern = re.compile(
        r'^(?:thanks(?:\s+and|\s*&)?\s*(?:regards|warm\s+regards)?|thank\s+you(?:\s+very\s+much|\s+all)?|'
        r'regards|best\s+regards|warm\s+regards|kind\s+regards|sincerely|cheers|with\s+regards|best|'
        r'sent\s+from\s+my\s+iphone|sent\s+from\s+mail\s+for\s+windows|sent\s+from\s+outlook|'
        r'get\s+outlook\s+for\s+android|get\s+outlook\s+for\s+ios)(?:\s*,)?(?:\s+[\w\s\.\,\-]+)?$',
        re.IGNORECASE
    )

    footer_line_pattern = re.compile(
        r'^(?:'
        r'--\s*|[-_=*~]{2,}|'
        r'caldim\s+engineering.*|caldim.*|steel\s+fab\s+enterprises.*|'
        r'das\s*\(?digitalization.*|division\s*:?|department\s*:?|'
        r'corporate\s+office.*|registered\s+office.*|branch\s+office.*|head\s+office.*|'
        r'plot\s+no.*|near\s+rto.*|minmac\s+center.*|arcot\s+road.*|valasaravakkam.*|'
        r'.*(?:hosur|chennai|bangalore|bengaluru)\s*[-–\s]*\d{5,6}.*|'
        r'(?:office\s*#?|cell\s*:|tel\s*:|phone\s*:|mobile\s*:|fax\s*:|direct\s*:).*|'
        r'(?:email|e-mail)\s*:.*@.*|'
        r'(?:website|web)\s*:?.*|'
        r'(?:https?:\/\/)?(?:www\.)?(?:caldimproducts|caldimengg)\.com.*|'
        r'(?:system\s+engineer|software\s+development|software\s+engineer|estimator|detailer|draftsman|modeler|lead\s+estimator|senior\s+estimator|project\s+manager|sales\s+manager|manager|director|vp|ceo).*|'
        r'namrutha(?:\s+k\.?r\.?)?|divya(?:\s+[a-z]\.?)?|manikandan(?:\s+[a-z]\.?)?|thamizh(?:arasan)?|'
        r'disclaimer:?.*|confidentiality\s+notice:?.*|privileged\s+and\s+confidential.*|this\s+email\s+and\s+any\s+files.*'
        r')$',
        re.IGNORECASE
    )

    # Backwards stripping of signature, corporate footers, disclaimers, and sign-offs
    while cleaned_lines:
        last = cleaned_lines[-1]
        if not last or signoff_pattern.match(last) or footer_line_pattern.match(last):
            cleaned_lines.pop()
        else:
            break

    # Strip any remaining trailing empty lines or sign-off lines
    while cleaned_lines:
        last = cleaned_lines[-1]
        if not last or signoff_pattern.match(last) or footer_line_pattern.match(last):
            cleaned_lines.pop()
        else:
            break

    # Final trim
    while cleaned_lines and not cleaned_lines[0]:
        cleaned_lines.pop(0)
    while cleaned_lines and not cleaned_lines[-1]:
        cleaned_lines.pop()

    result = '\n'.join(cleaned_lines).strip()
    return result if result else text.strip()


def clean_reply_body(text):
    """Alias for clean_reply_content."""
    return clean_reply_content(text)


def build_combined_email_body(quote_id, estimator_reply, detailer_reply, project_name=None, customer_name=None):
    """
    Compiles Estimator pricing details and Detailer drafting timeline into a unified quotation template,
    ensuring header (Dear Customer,) and footer (Thanks & Best regards,) are common, and only the costs/details
    are merged.
    """
    greeting_name = customer_name.strip() if customer_name else "Customer"
    project_clause = f" for {project_name.strip()}" if project_name else ""
    
    est_clean = clean_reply_content(estimator_reply)
    det_clean = clean_reply_content(detailer_reply)
    
    est_content = est_clean if est_clean else "Commercial estimation details in progress."
    det_content = det_clean if det_clean else "Detailing & drafting schedule in progress."

    return f"""Dear {greeting_name},

We are pleased to provide the compiled commercial estimation and detailing quotation{project_clause} (Ref: {quote_id}).

Below is the consolidated summary provided by our technical teams:

=== ESTIMATION DETAILS ===
{est_content}

=== DETAILING DETAILS ===
{det_content}

Please review the details above and let us know if you require any revisions or have questions.

Thanks & Best regards,
Project Sales & Estimation Team
Steel Fab Enterprises"""



def send_combined_quote_email(recipient_email, subject, body_text, smtp_config=None, pdf_path=None):
    """
    Sends the compiled estimation and detailing reply to the customer via SMTP.
    """
    if smtp_config is None:
        import os
        from django.conf import settings
        smtp_config = {
            "email_user": getattr(settings, 'EMAIL_HOST_USER', os.getenv('EMAIL_HOST_USER', 'thamizh1700@gmail.com')).strip('\'"'),
            "email_password": getattr(settings, 'EMAIL_HOST_PASSWORD', os.getenv('EMAIL_HOST_PASSWORD', '')).strip('\'"'),
            "smtp_server": getattr(settings, 'EMAIL_HOST', os.getenv('EMAIL_HOST', 'smtp.gmail.com')).strip('\'"'),
            "smtp_port": getattr(settings, 'EMAIL_PORT', int(os.getenv('EMAIL_PORT', 587))),
        }

    sender_email: str = str(smtp_config.get("email_user") or "")
    password: str = str(smtp_config.get("email_password") or "")
    smtp_server: str = str(smtp_config.get("smtp_server") or "smtp.gmail.com")
    smtp_port: int = int(smtp_config.get("smtp_port") or 587)

    # Clean recipients
    if isinstance(recipient_email, list):
        recipients = recipient_email
    else:
        recipients = [r.strip() for r in str(recipient_email).split(',') if r.strip()]

    clean_recipients = []
    for r in recipients:
        m = re.search(r'<([^>]+)>', r)
        clean_recipients.append(m.group(1).strip() if m else r.strip())
    clean_recipients = [r for r in clean_recipients if r and '@' in r]

    if not clean_recipients:
        raise ValueError("No valid recipient email address provided.")

    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['To'] = ", ".join(clean_recipients)
    msg['Subject'] = subject

    msg.attach(MIMEText(body_text, 'plain'))

    # Optionally attach PDF if provided
    if pdf_path:
        import os
        if os.path.exists(pdf_path):
            try:
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
                print(f"Warning: Could not attach PDF: {e}")

    server = smtplib.SMTP(smtp_server, smtp_port)
    try:
        server.starttls()
        server.login(sender_email, password)
        server.sendmail(sender_email, clean_recipients, msg.as_string())
        return True
    finally:
        try:
            server.quit()
        except Exception:
            pass

