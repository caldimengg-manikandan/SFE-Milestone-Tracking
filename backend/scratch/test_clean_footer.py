import re

def clean_reply_content(text):
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

    # 2. Strip leading greetings
    greeting_pattern = re.compile(
        r'^(?:hi|hello|hey|dear|good\s+morning|good\s+afternoon|good\s+evening|greetings)'
        r'(?:\s+[\w\s\.\,\-\/\&]+)?[,\:\!\-]?$',
        re.IGNORECASE
    )
    while cleaned_lines and (not cleaned_lines[0] or greeting_pattern.match(cleaned_lines[0])):
        cleaned_lines.pop(0)

    # 3. Signature & Footer detection patterns
    signoff_pattern = re.compile(
        r'^(?:thanks(?:\s+and|\s*&)?\s*(?:regards|warm\s+regards)?|thank\s+you(?:\s+very\s+much|\s+all)?|'
        r'regards|best\s+regards|warm\s+regards|kind\s+regards|sincerely|cheers|with\s+regards|best|'
        r'sent\s+from\s+my\s+iphone|sent\s+from\s+mail\s+for\s+windows|sent\s+from\s+outlook|'
        r'get\s+outlook\s+for\s+android|get\s+outlook\s+for\s+ios)(?:\s*,)?(?:\s+[\w\s\.\,\-]+)?$',
        re.IGNORECASE
    )

    footer_line_pattern = re.compile(
        r'^(?:'
        r'--\s*|[-_=*]{2,}|'
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

    # Backwards stripping of signature/footer lines
    while cleaned_lines:
        last = cleaned_lines[-1]
        if not last or signoff_pattern.match(last) or footer_line_pattern.match(last):
            cleaned_lines.pop()
        else:
            break

    # Strip any remaining trailing sign-offs or empty lines
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


sample_email = """Hi Manikandan,

Detailing Cost: $2,500
Fabrication & Erection: $14,000
Delivery timeline: 2-3 weeks from receipt of approved IFC models.

Thanks & Regards,
Namrutha K.R
System Engineer -Software Development
CALDIM ENGINEERING PVT. LTD.
DAS (Digitalization and Automation Solutions)
Division:
Plot No. 22,23,24 , 2nd Floor, Durga Bhavani Towers,
Near RTO check Post, NH 207, Bagalur Road, Hosur – 635103.
Corporate Office:
Minmac center #118, First Floor,Arcot Road,
Valasaravakkam,Chennai-600087
Office # 248-455 3855 | Cell: +91 8778380617
Email:namrutha@caldimengg.com
Website www.caldimproducts.com"""

print("--- CLEANED RESULT ---")
print(clean_reply_content(sample_email))
print("--- END ---")
