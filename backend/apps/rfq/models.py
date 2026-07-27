"""
Core RFQ models — direct mapping of the Excel 'Data' sheet to PostgreSQL.
All 'No Fill' (computed) columns are handled in serializers/views, not stored here.
"""
import re
from django.db import models  # type: ignore
from django.core.validators import RegexValidator  # type: ignore
from django.core.exceptions import ValidationError  # type: ignore


# ─────────────────────────────────────────────────────────────────────────────
# LOOKUP / REFERENCE TABLES  (replace Excel dropdown validation lists)
# ─────────────────────────────────────────────────────────────────────────────



class Estimator(models.Model):
    objects = models.Manager()
    initials = models.CharField(max_length=20, unique=True)
    full_name = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['initials']

    def __str__(self):
        return f"{self.initials}" + (f" — {self.full_name}" if self.full_name not in (None, '') else "")


# ─────────────────────────────────────────────────────────────────────────────
# MONTHLY BID GOALS  (mirrors $ Dashboard hardcoded $2M/month goal)
# ─────────────────────────────────────────────────────────────────────────────

class MonthlyBidGoal(models.Model):
    objects = models.Manager()
    year = models.IntegerField()
    month = models.IntegerField(choices=[(i, i) for i in range(1, 13)])
    goal = models.DecimalField(max_digits=15, decimal_places=2, default=2000000)

    class Meta:
        unique_together = ('year', 'month')
        ordering = ['year', 'month']

    def __str__(self):
        return f"{self.year}-{self.month:02d}: ${self.goal:,.0f}"


# ─────────────────────────────────────────────────────────────────────────────
# QUOTE NO VALIDATOR
# Pattern: YY-MM-SEQ[R][n]  e.g. 23-06-05, 23-06-05R, 23-06-05R1
# ─────────────────────────────────────────────────────────────────────────────

quote_no_validator = RegexValidator(
    regex=r'^\d{2}-\d{2}-\d{2,3}(R\d?)?$',
    message='Quote No must follow format YY-MM-SEQ (e.g. 23-06-05) or with rebid suffix (e.g. 23-06-05R1)'
)


# ─────────────────────────────────────────────────────────────────────────────
# CORE TABLE: rfq_master
# Direct mapping of Excel 'Data' sheet (162 columns → grouped fields)
# ─────────────────────────────────────────────────────────────────────────────

class RFQMaster(models.Model):
    objects = models.Manager()

    # ── CHOICES ──────────────────────────────────────────────────────────────
    class BudgetType(models.TextChoices):
        BUDGET = 'Budget', 'Budget'
        FINAL = 'Final', 'Final'
        REBID = 'Rebid', 'Rebid'

    class DecisionToBid(models.TextChoices):
        YES = 'Yes', 'Yes'
        NO = 'No', 'No'
        NO_BID = 'NoBid', 'No Bid'
        BID = 'Bid', 'Bid'

    class WonLost(models.TextChoices):
        WON = 'Won', 'Won'
        LOST = 'Lost', 'Lost'
        PENDING = 'Pending', 'Pending'

    class TaxStatus(models.TextChoices):
        TAXABLE = 'Taxable', 'Taxable'
        EXEMPT = 'Exempt', 'Exempt'
        PARTIAL = 'Partial', 'Partial Exempt'

    # ═════════════════════════════════════════════════════════════════════════
    # IDENTITY  (Excel cols A–D)
    # ═════════════════════════════════════════════════════════════════════════

    # Col A — user-entered, format YY-MM-SEQ[R][n]
    quote_no = models.CharField(
        max_length=20,
        unique=True,
        validators=[quote_no_validator],
        help_text='Format: YY-MM-SEQ (e.g. 23-06-05). Rebids: 23-06-05R or 23-06-05R1'
    )

    # Col E
    budget_type = models.CharField(
        max_length=10,
        choices=BudgetType.choices,
        blank=True,
        null=True,
    )

    # ═════════════════════════════════════════════════════════════════════════
    # PROJECT IDENTIFICATION  (Excel cols F–L)
    # ═════════════════════════════════════════════════════════════════════════
    bid_reference = models.CharField(max_length=100, blank=True, default='')
    project_name = models.CharField(max_length=300)
    project_comments = models.TextField(blank=True, default='')
    bid_due_date = models.DateField(null=True, blank=True)
    bid_due_time = models.TimeField(null=True, blank=True)
    location = models.CharField(max_length=200, blank=True, default='')
    distance_travel = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True,
        help_text='Distance/travel time in hours'
    )

    # ═════════════════════════════════════════════════════════════════════════
    # PROJECT FLAGS  (Excel cols M–X)  — all Y/N booleans
    # ═════════════════════════════════════════════════════════════════════════
    aisc_fab = models.BooleanField(default=False, verbose_name='AISC Fabrication')
    aisc_erect = models.BooleanField(default=False, verbose_name='AISC Erection')
    domestic_steel = models.BooleanField(default=False, verbose_name='Domestic Steel')
    leed_project = models.BooleanField(default=False, verbose_name='LEED Project')
    minority_participation = models.BooleanField(default=False, verbose_name='Minority Participation')
    prevailing_wage = models.BooleanField(default=False, verbose_name='Prevailing Wage')
    ccip_ocip = models.BooleanField(default=False, verbose_name='CCIP/OCIP')
    bonded = models.BooleanField(default=False, verbose_name='Bonded')
    paint = models.BooleanField(default=False, verbose_name='Paint')
    galvanised = models.BooleanField(default=False, verbose_name='Galvanised')
    professional_engineer = models.BooleanField(default=False, verbose_name='Professional Engineer')
    third_party_inspection = models.BooleanField(default=False, verbose_name='3rd Party Inspection')

    # Col Y
    tax_status = models.CharField(
        max_length=20,
        choices=TaxStatus.choices,
        blank=True,
        null=True,
    )

    # ═════════════════════════════════════════════════════════════════════════
    # CUSTOMER & TEAM  (Excel cols Z–AF)
    # ═════════════════════════════════════════════════════════════════════════
    customer = models.ForeignKey(
        'projects.Customer',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='rfqs',
    )
    decision_to_bid = models.CharField(
        max_length=10,
        choices=DecisionToBid.choices,
        blank=True,
        null=True,
    )
    primary_estimator = models.ForeignKey(
        Estimator,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='rfqs',
    )
    outsourced_estimator = models.CharField(max_length=100, blank=True, default='')
    sent_to_jd = models.BooleanField(default=False, verbose_name='Sent to J&D')
    sent_to_detailing = models.BooleanField(default=False, verbose_name='Sent to Detailing')
    sent_to_erection = models.BooleanField(default=False, verbose_name='Sent to Erection')

    # ═════════════════════════════════════════════════════════════════════════
    # SCOPE / SIZE  (Excel col AG)
    # ═════════════════════════════════════════════════════════════════════════
    class ScopeOfWork(models.TextChoices):
        DETAILING = 'Detailing', 'Detailing'
        FABRICATION = 'Fabrication', 'Fabrication'
        ERECTION = 'Erection', 'Erection'

    scope_of_work = models.CharField(
        max_length=50,
        blank=True,
        null=True,
    )

    email_sent = models.BooleanField(default=False)

    est_sqft_ton = models.CharField(
        max_length=100, blank=True, default='',
        verbose_name='Est. Sq-Ft / Tons'
    )

    # ═════════════════════════════════════════════════════════════════════════
    # PRICING  (Excel cols AH–AM)
    # ═════════════════════════════════════════════════════════════════════════
    price_structure = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    price_erection = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    price_misc = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    price_misc_erection = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    bid_amount = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True,
        help_text='Col AL — used in dashboard aggregations'
    )
    quoted_profit = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True,
        help_text='Col AM — used in dashboard aggregations'
    )

    # ═════════════════════════════════════════════════════════════════════════
    # QUANTITIES  (Excel cols AN–AS — user entry)
    # Computed: total_tonnage, cost_per_ton, cost_per_sqft, etc. → serializer
    # ═════════════════════════════════════════════════════════════════════════
    ton_steel = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    ton_joist = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)
    num_main_structural_pcs = models.IntegerField(null=True, blank=True)
    sq_ft_structural = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    # ═════════════════════════════════════════════════════════════════════════
    # STRUCTURAL FABRICATION SCHEDULE  (Excel cols AZ–BD)
    # ═════════════════════════════════════════════════════════════════════════
    struct_fab_hours = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    struct_fab_start_month = models.DateField(
        null=True, blank=True,
        help_text='Store as first day of the month (YYYY-MM-01)'
    )
    struct_fab_duration_months = models.IntegerField(null=True, blank=True)

    # ═════════════════════════════════════════════════════════════════════════
    # MISC FABRICATION SCHEDULE  (Excel cols BE–BI)
    # ═════════════════════════════════════════════════════════════════════════
    misc_fab_hours = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    misc_fab_start_month = models.DateField(null=True, blank=True)
    misc_fab_duration_months = models.IntegerField(null=True, blank=True)

    # ═════════════════════════════════════════════════════════════════════════
    # STRUCTURAL ERECTION SCHEDULE  (Excel cols BJ–BN)
    # ═════════════════════════════════════════════════════════════════════════
    struct_erect_hours = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    struct_erect_start_month = models.DateField(null=True, blank=True)
    struct_erect_duration_months = models.IntegerField(null=True, blank=True)

    # ═════════════════════════════════════════════════════════════════════════
    # MISC ERECTION SCHEDULE  (Excel cols BO–BS)
    # ═════════════════════════════════════════════════════════════════════════
    misc_erect_hours = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    misc_erect_start_month = models.DateField(null=True, blank=True)
    misc_erect_duration_months = models.IntegerField(null=True, blank=True)

    # ═════════════════════════════════════════════════════════════════════════
    # ESTIMATING & OUTCOME  (Excel cols BT–BY)
    # ═════════════════════════════════════════════════════════════════════════
    estimating_hours = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    quote_date = models.DateField(null=True, blank=True)
    won_lost = models.CharField(
        max_length=10,
        choices=WonLost.choices,
        default=WonLost.PENDING,
    )
    follow_up_notes = models.TextField(blank=True, default='')
    follow_up_date = models.DateField(null=True, blank=True)
    awarded_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    # ═════════════════════════════════════════════════════════════════════════
    # POST-AWARD MILESTONES  (Excel cols BZ–CC)
    # ═════════════════════════════════════════════════════════════════════════
    sfe_job_no = models.IntegerField(
        null=True, blank=True, unique=True,
        help_text='SFE internal job number (e.g. 22003). Required when Won.'
    )
    awarded_job_date = models.DateField(null=True, blank=True)
    contract_executed_date = models.DateField(null=True, blank=True)
    fabrication_start_date = models.DateField(
        null=True, blank=True,
        help_text='Entered by Detailing / JF role'
    )

    # ═════════════════════════════════════════════════════════════════════════
    # SOFT DELETE + AUDIT
    # ═════════════════════════════════════════════════════════════════════════
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=100, blank=True, default='')
    updated_by = models.CharField(max_length=100, blank=True, default='')

    class Meta:
        db_table = 'rfq_master'
        ordering = ['-quote_no', '-id']
        indexes = [
            models.Index(fields=['quote_date'], name='idx_rfq_quote_date'),
            models.Index(fields=['awarded_job_date'], name='idx_rfq_awarded_date'),
            models.Index(fields=['won_lost'], name='idx_rfq_won_lost'),
            models.Index(fields=['customer'], name='idx_rfq_customer'),
            models.Index(fields=['sfe_job_no'], name='idx_rfq_sfe_job_no'),
            models.Index(fields=['bid_due_date'], name='idx_rfq_bid_due_date'),
            models.Index(fields=['deleted_at'], name='idx_rfq_deleted_at'),
        ]

    def __str__(self):
        return f"{self.quote_no} — {self.project_name}"

    # ─────────────────────────────────────────────────────────────────────────
    # Computed properties (replicate Excel 'No Fill' formulas)
    # ─────────────────────────────────────────────────────────────────────────

    @property
    def is_rebid(self):
        """Col C — TRUE if quote_no contains 'R' after the base sequence."""
        quote_no_str = str(self.quote_no) if self.quote_no not in (None, '') else ''
        return bool(re.search(r'\d{2}-\d{2}-\d+R', quote_no_str))

    @property
    def quote_no_rolled_up(self):
        """Col B — first 8 chars (strips rebid suffix)."""
        quote_no_str = str(self.quote_no) if self.quote_no not in (None, '') else ''
        return quote_no_str[:8]

    @property
    def rebid_label(self):
        return 'Rebid' if self.is_rebid else 'First Bid'

    @property
    def total_tonnage(self):
        ton_steel = self.ton_steel
        ton_joist = self.ton_joist
        if ton_steel is not None and ton_joist is not None:
            from decimal import Decimal
            return Decimal(str(ton_steel)) + Decimal(str(ton_joist))
        return ton_steel or ton_joist

    def _safe_div(self, numerator, denominator):
        """Division guard — return None instead of ZeroDivisionError."""
        if numerator is None or denominator is None or denominator == 0:
            return None
        return float(numerator) / float(denominator)

    @property
    def structural_pieces_per_ton(self):
        return self._safe_div(self.num_main_structural_pcs, self.ton_steel)

    @property
    def struct_tonnage_per_sqft_no_joist(self):
        return self._safe_div(self.ton_steel, self.sq_ft_structural)

    @property
    def struct_tonnage_per_sqft_with_joist(self):
        return self._safe_div(self.total_tonnage, self.sq_ft_structural)

    @property
    def struct_cost_per_ton(self):
        return self._safe_div(self.price_structure, self.ton_steel)

    @property
    def struct_erect_cost_per_ton(self):
        return self._safe_div(self.price_erection, self.ton_steel)

    @property
    def struct_cost_per_sqft(self):
        return self._safe_div(self.price_structure, self.sq_ft_structural)

    @property
    def struct_erect_cost_per_sqft(self):
        return self._safe_div(self.price_erection, self.sq_ft_structural)

    # ── Schedule end months & avg hours ─────────────────────────────────────

    def _end_month(self, start, duration):
        if not start or not duration or duration < 1:
            return None
        from dateutil.relativedelta import relativedelta  # type: ignore
        return start + relativedelta(months=duration - 1)

    def _avg_hours(self, total_hours, duration):
        return self._safe_div(total_hours, duration)

    @property
    def struct_fab_end_month(self):
        return self._end_month(self.struct_fab_start_month, self.struct_fab_duration_months)

    @property
    def avg_monthly_struct_fab(self):
        return self._avg_hours(self.struct_fab_hours, self.struct_fab_duration_months)

    @property
    def misc_fab_end_month(self):
        return self._end_month(self.misc_fab_start_month, self.misc_fab_duration_months)

    @property
    def avg_monthly_misc_fab(self):
        return self._avg_hours(self.misc_fab_hours, self.misc_fab_duration_months)

    @property
    def struct_erect_end_month(self):
        return self._end_month(self.struct_erect_start_month, self.struct_erect_duration_months)

    @property
    def avg_monthly_struct_erect(self):
        return self._avg_hours(self.struct_erect_hours, self.struct_erect_duration_months)

    @property
    def misc_erect_end_month(self):
        return self._end_month(self.misc_erect_start_month, self.misc_erect_duration_months)

    @property
    def avg_monthly_misc_erect(self):
        return self._avg_hours(self.misc_erect_hours, self.misc_erect_duration_months)

    # ─────────────────────────────────────────────────────────────────────────
    # VALIDATION
    # ─────────────────────────────────────────────────────────────────────────

    def clean(self):
        errors = {}

        # Bid due date required if decision_to_bid is Yes/Bid
        if self.decision_to_bid in ('Yes', 'Bid'):
            if not self.bid_due_date:
                errors['bid_due_date'] = 'Required when Decision to Bid is Yes/Bid.'

        # Won jobs require additional fields
        if self.won_lost == 'Won':
            if self.awarded_amount is None:
                errors['awarded_amount'] = 'Required when job is Won.'
            if not self.sfe_job_no:
                errors['sfe_job_no'] = 'Required when job is Won.'
            if not self.awarded_job_date:
                errors['awarded_job_date'] = 'Required when job is Won.'

        # Schedule duration guards
        schedule_pairs = [
            ('struct_fab_hours', 'struct_fab_duration_months'),
            ('misc_fab_hours', 'misc_fab_duration_months'),
            ('struct_erect_hours', 'struct_erect_duration_months'),
            ('misc_erect_hours', 'misc_erect_duration_months'),
        ]
        for hours_field, dur_field in schedule_pairs:
            hours_val = getattr(self, hours_field)
            dur_val = getattr(self, dur_field)
            if hours_val and hours_val > 0:
                if not dur_val or dur_val < 1:
                    errors[dur_field] = 'Must be ≥ 1 when hours are entered.'

        if errors:
            raise ValidationError(errors)


class SystemSetting(models.Model):
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField()
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'rfq_systemsetting'

    def __str__(self):
        return f"{self.key}: {self.value}"
