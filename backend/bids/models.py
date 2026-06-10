from django.db import models
from decimal import Decimal
from projects.models import Customer
from employees.models import Employee


# ─── Holiday Model ───────────────────────────────────────────────────────────
class Holiday(models.Model):
    objects = models.Manager()

    TIMEZONE_CHOICES = [
        ('America/Chicago', 'US (CST)'),
    ]

    TYPE_CHOICES = [
        ('Public', 'Public'),
        ('Company', 'Company'),
        ('Optional', 'Optional'),
    ]

    date = models.DateField()
    description = models.CharField(max_length=300)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='Public')
    timezone = models.CharField(max_length=50, choices=TIMEZONE_CHOICES, default='America/Chicago')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'holidays'
        ordering = ['date']
        unique_together = ('date', 'timezone')

    def __str__(self):
        return f"{self.date} — {self.description} ({self.timezone})"


MONTH_MAP = {
    'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
    'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
}
REV_MONTH_MAP = {
    1: 'January', 2: 'February', 3: 'March', 4: 'April', 5: 'May', 6: 'June',
    7: 'July', 8: 'August', 9: 'September', 10: 'October', 11: 'November', 12: 'December'
}

def calculate_end_month(start_month_str, duration):
    if not start_month_str or not isinstance(start_month_str, str):
        return ""
    cleaned = start_month_str.strip().lower()
    
    # Check if there is a year in the string, e.g. "May 2026" or "May-26"
    words = cleaned.split()
    month_part = words[0] if words else cleaned
    year_part = ""
    if len(words) > 1:
        year_part = words[1]
    
    # Try with hyphen split, e.g. "May-26" or "May-2026"
    if "-" in cleaned:
        parts = cleaned.split("-")
        month_part = parts[0]
        year_part = parts[1]

    month_num = MONTH_MAP.get(month_part)
    if not month_num:
        return start_month_str  # fallback
    
    end_num = month_num + max(0, duration - 1)
    
    if year_part:
        try:
            if len(year_part) == 2:
                year = int("20" + year_part)
            else:
                year = int(year_part)
            
            years_to_add = (end_num - 1) // 12
            end_num = (end_num - 1) % 12 + 1
            final_year = year + years_to_add
            
            end_month_name = REV_MONTH_MAP.get(end_num, "")
            if len(year_part) == 2:
                return f"{end_month_name} '{str(final_year)[2:]}"
            else:
                return f"{end_month_name} {final_year}"
        except:
            pass

    end_num = (end_num - 1) % 12 + 1
    return REV_MONTH_MAP.get(end_num, start_month_str.capitalize())


class BidEnquiry(models.Model):
    objects = models.Manager()

    # --- Part 1: Bidding & Enquiry Details (Pink Section — 19 Fields) ---
    quote_no = models.CharField(max_length=100, unique=True)
    project_name = models.CharField(max_length=300)
    project_comments = models.TextField(blank=True, null=True)
    bid_due_date = models.DateField(null=True, blank=True)
    bid_due_time = models.TimeField(null=True, blank=True)
    location = models.CharField(max_length=300, blank=True, null=True)
    distance = models.CharField(max_length=100, blank=True, null=True)
    aisc_fab_req = models.CharField(max_length=20, default='No')
    aisc_erect_req = models.CharField(max_length=20, default='No')
    customer_name = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='bid_enquiries')
    SCOPE_CHOICES = [
        ('Fabrication', 'Fabrication'),
        ('Detailing', 'Detailing'),
        ('Erection', 'Erection'),
    ]
    scope_of_work = models.CharField(max_length=50, blank=True, null=True, choices=SCOPE_CHOICES)
    decision_to_bid = models.CharField(max_length=20, default='TBD')
    primary_estimator = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='bid_enquiries')
    sent_to_jd = models.DateField(null=True, blank=True)
    sent_to_detailing = models.DateField(null=True, blank=True)
    sent_to_erection = models.DateField(null=True, blank=True)
    est_sqft_ton = models.DecimalField(max_digits=12, decimal_places=4, default=0.0)
    sfe_job_no = models.CharField(max_length=100, blank=True, null=True)
    awarded_job_no_date = models.DateField(null=True, blank=True)
    contract_executed_date = models.DateField(null=True, blank=True)

    # --- Part 2: Estimation Details (Purple/Blue Sections — 45 Fields) ---
    # Estimator Inputs
    price_structure = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)
    price_struc_erection = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)
    price_misc = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)
    price_misc_erection = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)
    bid_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)
    quoted_profit = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)
    ton_steel = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    ton_joist = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    main_structural_pcs = models.IntegerField(default=0)
    sqft_structural = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)
    struct_fab_hours = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    struct_fab_start_month = models.CharField(max_length=50, blank=True, null=True)
    struct_fab_duration = models.IntegerField(default=0)
    misc_fab_hours = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    misc_fab_start_month = models.CharField(max_length=50, blank=True, null=True)
    misc_fab_duration = models.IntegerField(default=0)
    struct_erect_hours = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    struct_erect_start_month = models.CharField(max_length=50, blank=True, null=True)
    struct_erect_duration = models.IntegerField(default=0)
    misc_erect_hours = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    misc_erect_start_month = models.CharField(max_length=50, blank=True, null=True)
    misc_erect_duration = models.IntegerField(default=0)
    estimating_hours = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    quote_date = models.DateField(null=True, blank=True)
    won_lost = models.CharField(max_length=50, default='Pending')
    estimator_followup_notes = models.TextField(blank=True, null=True)
    estimator_followup_date = models.DateField(null=True, blank=True)
    awarded_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)
    fab_start_date = models.DateField(null=True, blank=True)

    # Auto-Calculated Fields (No Fill)
    total_tonnage = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    struct_pcs_per_ton = models.DecimalField(max_digits=12, decimal_places=4, default=0.0)
    struct_ton_per_sqft_no_joist = models.DecimalField(max_digits=12, decimal_places=6, default=0.0)
    struct_ton_per_sqft_with_joist = models.DecimalField(max_digits=12, decimal_places=6, default=0.0)
    struct_cost_per_ton = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)
    struct_erect_cost_per_ton = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)
    struct_cost_per_sqft = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)
    struct_erect_cost_per_sqft = models.DecimalField(max_digits=15, decimal_places=2, default=0.0)
    
    struct_fab_end_month = models.CharField(max_length=50, blank=True, null=True)
    avg_monthly_struct_fab_hours = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    misc_fab_end_month = models.CharField(max_length=50, blank=True, null=True)
    avg_monthly_misc_fab_hours = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    struct_erect_end_month = models.CharField(max_length=50, blank=True, null=True)
    avg_monthly_struct_erect_hours = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    misc_erect_end_month = models.CharField(max_length=50, blank=True, null=True)
    avg_monthly_misc_erect_hours = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'bid_enquiries'
        ordering = ['-created_at']

    def calculate_values(self):
        # 1. Total Tonnage
        ton_steel_dec = Decimal(str(self.ton_steel or 0.0))
        ton_joist_dec = Decimal(str(self.ton_joist or 0.0))
        self.total_tonnage = ton_steel_dec + ton_joist_dec
        
        # 2. Structural Pieces / Ton (Without Jst)
        if self.ton_steel and float(self.ton_steel) > 0:
            self.struct_pcs_per_ton = Decimal(self.main_structural_pcs or 0) / ton_steel_dec
            self.struct_cost_per_ton = Decimal(str(self.price_structure or 0.0)) / ton_steel_dec
        else:
            self.struct_pcs_per_ton = Decimal('0.0')
            self.struct_cost_per_ton = Decimal('0.0')

        # 3. Structural Tonnage / Sq. ft (Without Jst) & (With joist) & Cost/Sqft
        sqft_dec = Decimal(str(self.sqft_structural or 0.0))
        if sqft_dec > 0:
            self.struct_ton_per_sqft_no_joist = ton_steel_dec / sqft_dec
            self.struct_ton_per_sqft_with_joist = self.total_tonnage / sqft_dec
            self.struct_cost_per_sqft = Decimal(str(self.price_structure or 0.0)) / sqft_dec
            self.struct_erect_cost_per_sqft = Decimal(str(self.price_struc_erection or 0.0)) / sqft_dec
        else:
            self.struct_ton_per_sqft_no_joist = Decimal('0.0')
            self.struct_ton_per_sqft_with_joist = Decimal('0.0')
            self.struct_cost_per_sqft = Decimal('0.0')
            self.struct_erect_cost_per_sqft = Decimal('0.0')

        # 4. Structural Erection Cost / Ton
        if self.total_tonnage and self.total_tonnage > 0:
            self.struct_erect_cost_per_ton = Decimal(str(self.price_struc_erection or 0.0)) / self.total_tonnage
        else:
            self.struct_erect_cost_per_ton = Decimal('0.0')

        # 5. Average Monthly Fabrication Hours & End Months
        self.struct_fab_end_month = calculate_end_month(self.struct_fab_start_month, self.struct_fab_duration or 0)
        if self.struct_fab_duration and self.struct_fab_duration > 0:
            self.avg_monthly_struct_fab_hours = Decimal(str(self.struct_fab_hours or 0.0)) / Decimal(self.struct_fab_duration)
        else:
            self.avg_monthly_struct_fab_hours = Decimal('0.0')

        self.misc_fab_end_month = calculate_end_month(self.misc_fab_start_month, self.misc_fab_duration or 0)
        if self.misc_fab_duration and self.misc_fab_duration > 0:
            self.avg_monthly_misc_fab_hours = Decimal(str(self.misc_fab_hours or 0.0)) / Decimal(self.misc_fab_duration)
        else:
            self.avg_monthly_misc_fab_hours = Decimal('0.0')

        self.struct_erect_end_month = calculate_end_month(self.struct_erect_start_month, self.struct_erect_duration or 0)
        if self.struct_erect_duration and self.struct_erect_duration > 0:
            self.avg_monthly_struct_erect_hours = Decimal(str(self.struct_erect_hours or 0.0)) / Decimal(self.struct_erect_duration)
        else:
            self.avg_monthly_struct_erect_hours = Decimal('0.0')

        self.misc_erect_end_month = calculate_end_month(self.misc_erect_start_month, self.misc_erect_duration or 0)
        if self.misc_erect_duration and self.misc_erect_duration > 0:
            self.avg_monthly_misc_erect_hours = Decimal(str(self.misc_erect_hours or 0.0)) / Decimal(self.misc_erect_duration)
        else:
            self.avg_monthly_misc_erect_hours = Decimal('0.0')

    def save(self, *args, **kwargs):
        self.calculate_values()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.quote_no} — {self.project_name}"
