from django.db import models  # type: ignore
from decimal import Decimal

class Project(models.Model):
    objects = models.Manager()
    STATUS_CHOICES = [
        ('Planning', 'Planning'),
        ('In Progress', 'In Progress'),
        ('Yet to Start', 'Yet to Start'),
        ('Completed', 'Completed')
    ]
    PRIORITY_CHOICES = [('Low', 'Low'), ('Medium', 'Medium'), ('High', 'High')]

    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=300)
    customer_name = models.CharField(max_length=300, blank=True, null=True)
    project_manager_name = models.CharField(max_length=200, blank=True, null=True)
    detailer_name = models.CharField(max_length=200, blank=True, null=True)
    total_ton = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_manhours = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    manhour_ton = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    steel_budget_worksheet = models.JSONField(default=dict, blank=True, null=True)
    estimation_data = models.JSONField(default=dict, blank=True, null=True)
    erection_date = models.DateField(null=True, blank=True)
    shop_name = models.CharField(max_length=100, blank=True, null=True)
    schedule_field_measure_required = models.CharField(max_length=10, default='Yes')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Yet to Start')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='Medium')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'projects'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.code} — {self.name}"

    @property
    def rate_config(self):
        return RateConfigAdapter(self)

    @property
    def is_finalized(self):
        return self.status == 'Completed'



class StructuralScheduleItem(models.Model):
    objects = models.Manager()
    project = models.ForeignKey(Project, related_name='structural_schedules', on_delete=models.CASCADE)
    seq_no = models.CharField(max_length=50)
    tons = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    item_description = models.CharField(max_length=500)
    category = models.CharField(max_length=100, blank=True)

    scheduled_ofa_date = models.DateField(null=True, blank=True)
    actual_ofa_date = models.DateField(null=True, blank=True)
    scheduled_bfa_date = models.DateField(null=True, blank=True)
    actual_bfa_date = models.DateField(null=True, blank=True)
    scheduled_field_measure_date = models.DateField(null=True, blank=True)
    rts_date = models.DateField(null=True, blank=True)
    ship_date = models.DateField(null=True, blank=True)
    actual_rts_date = models.DateField(null=True, blank=True)
    actual_ship_date = models.DateField(null=True, blank=True)
    shop_lead_time_weeks = models.IntegerField(default=0)
    scheduled_erection_date = models.DateField(null=True, blank=True)
    budget_shop_hours = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    budget_field_hours = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    actual_shop_hours = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    actual_field_hours = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    detailer_vendor = models.CharField(max_length=200, blank=True)
    dwg_status = models.CharField(max_length=100, blank=True)
    tracking_status = models.CharField(max_length=100, blank=True, null=True)
    notes = models.TextField(blank=True)
    fabrication_details = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'structural_schedule_items'
        ordering = ['seq_no']

    def __str__(self):
        return f"{self.project.code} - {self.seq_no}"


class Customer(models.Model):
    objects = models.Manager()
    name = models.CharField(max_length=300)
    code = models.CharField(max_length=100, blank=True)
    category = models.CharField(max_length=100, default='Domestic')
    country = models.CharField(max_length=100, default='India')
    street = models.CharField(max_length=200, blank=True)
    state = models.CharField(max_length=100, blank=True)
    address = models.TextField(blank=True)
    designation = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'customers'
        ordering = ['-created_at']

    def __str__(self):
        return self.name

class CustomerContact(models.Model):
    objects = models.Manager()
    customer = models.ForeignKey(Customer, related_name='contacts', on_delete=models.CASCADE)
    person = models.CharField(max_length=200, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = 'customer_contacts'

    def __str__(self):
        return self.person

class Detailer(models.Model):
    objects = models.Manager()
    name = models.CharField(max_length=300)
    code = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'detailers'
        ordering = ['-created_at']

    def __str__(self):
        return self.name

class DetailerContact(models.Model):
    objects = models.Manager()
    detailer = models.ForeignKey(Detailer, related_name='contacts', on_delete=models.CASCADE)
    person = models.CharField(max_length=200, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = 'detailer_contacts'

    def __str__(self):
        return self.person


from django.db.models.signals import post_delete  # type: ignore
from django.dispatch import receiver  # type: ignore

@receiver(post_delete, sender=StructuralScheduleItem)
def cleanup_production_items(sender, instance, **kwargs):
    from production.models import ProductionItem, ProductionPriorityItem
    # Delete related production schedule items
    ProductionItem.objects.filter(
        job_number=instance.project.code,
        sequence_number=instance.seq_no
    ).delete()
    # Delete related production priority items
    ProductionPriorityItem.objects.filter(
        job_number=instance.project.code,
        sequence_number=instance.seq_no
    ).delete()


# ─── RATE CONFIG ADAPTER ───
class RateConfigAdapter:
    def __init__(self, project):
        self.project = project
        self.est_data = project.estimation_data or {}
        self.bid_enquiry = self.est_data.get('bidEnquiry', {})
        self.est_sections = self.est_data.get('estimationSections', {})

    def _get_dec(self, dct, key, default):
        val = dct.get(key)
        if val is None or str(val).strip() == '':
            return Decimal(str(default))
        try:
            return Decimal(str(val))
        except Exception:
            return Decimal(str(default))

    @property
    def cost_code_labor_rate(self):
        return Decimal('21.00')

    @property
    def scrap_rate(self):
        return self._get_dec(self.bid_enquiry, 'scrapPercent', 5.0) / Decimal('100.0')

    @property
    def bolt_unit_price(self):
        return self._get_dec(self.bid_enquiry, 'boltRate', 1.75)

    @property
    def paint_unit_price(self):
        return self._get_dec(self.bid_enquiry, 'paintRate', 22.20)

    @property
    def galv_unit_price(self):
        return self._get_dec(self.bid_enquiry, 'galvanizingRate', 0.40)

    @property
    def use_tax_rate(self):
        return self._get_dec(self.bid_enquiry, 'taxPercent', 6.0) / Decimal('100.0')

    @property
    def shop_labor_rate(self):
        return self._get_dec(self.est_sections, 'hourlyLaborRate', 60.0)

    @property
    def shipping_hourly_rate(self):
        return self._get_dec(self.est_sections, 'shippingRate', 195.0)

    @property
    def overhead_rate(self):
        return self._get_dec(self.est_sections, 'overheadPercent', 12.0) / Decimal('100.0')

    @property
    def profit_rate(self):
        return self._get_dec(self.est_sections, 'profitPercent', 10.0) / Decimal('100.0')

    @property
    def labor_billing_rate(self):
        return self._get_dec(self.est_sections, 'miscellaneousLaborRate', 85.0)

    @property
    def erection_markup(self):
        return self._get_dec(self.est_sections, 'miscellaneousErectionMultiplier', 1.12)

    @property
    def joist_deck_markup(self):
        return self._get_dec(self.est_sections, 'miscellaneousJoistDeckMultiplier', 1.12)

    @property
    def other_buyout_markup(self):
        return self._get_dec(self.est_sections, 'miscellaneousOtherCostMultiplier', 1.12)

    @property
    def efficiency_factor(self):
        return self._get_dec(self.est_sections, 'efficiency_factor', 0.50)
        
    @property
    def flange_constant(self):
        return Decimal('4.38')
        
    @property
    def field_factor(self):
        return Decimal('1.40')
        
    @property
    def material_lbs_rate(self):
        return Decimal('0.55')
        
    @property
    def stair_labor_rate(self):
        return Decimal('65.00')


# ─── SYNC BID SUMMARY FROM ESTIMATION DATA ───
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=Project)
def sync_bid_summary_from_estimation_data(sender, instance, **kwargs):
    from django.apps import apps
    try:
        BidSummary = apps.get_model('bid_summary', 'BidSummary')
        BidMaterialLine = apps.get_model('bid_summary', 'BidMaterialLine')
    except (LookupError, ValueError):
        return

    estimation_data = instance.estimation_data
    if not estimation_data or not isinstance(estimation_data, dict):
        return

    project_info = estimation_data.get('projectInfo', {})
    bid_enquiry = estimation_data.get('bidEnquiry', {})
    estimation_sections = estimation_data.get('estimationSections', {})

    if not bid_enquiry and not estimation_sections:
        return

    def to_dec(val, default=0):
        if val is None or str(val).strip() == '':
            return Decimal(str(default))
        try:
            return Decimal(str(val))
        except Exception:
            return Decimal(str(default))

    bid_summary, created = BidSummary.objects.get_or_create(project=instance)

    bid_summary.mill_steel_lbs = to_dec(bid_enquiry.get('millWeight'))
    bid_summary.mill_steel_total = to_dec(bid_enquiry.get('millAmount'))
    bid_summary.warehouse_steel_lbs = to_dec(bid_enquiry.get('warehouseWeight'))
    bid_summary.warehouse_steel_total = to_dec(bid_enquiry.get('warehouseAmount'))
    bid_summary.bolt_pieces = to_dec(bid_enquiry.get('boltQty'))
    bid_summary.paint_gallons = to_dec(bid_enquiry.get('paintQty'))
    bid_summary.galv_lbs = to_dec(bid_enquiry.get('galvanizingWeight'))

    bid_summary.joist_total = to_dec(estimation_sections.get('steelJoistCost'))
    bid_summary.deck_total = to_dec(estimation_sections.get('deckCost'))
    
    bid_summary.freight_out_trucks = to_dec(estimation_sections.get('numTrucks'), default=0)
    bid_summary.freight_out_hours_each = to_dec(estimation_sections.get('hoursPerTruck'), default=0)
    bid_summary.freight_galv_trucks = to_dec(estimation_sections.get('galvanizingTrucks'), default=0)
    bid_summary.freight_galv_hours_each = to_dec(estimation_sections.get('galvHoursPerTruck'), default=0.0)

    bid_summary.shop_fab_hrs = to_dec(estimation_sections.get('plantFabricationHours'))
    
    bid_summary.draft_lbs = to_dec(estimation_sections.get('plantFabricationHours'))
    bid_summary.draft_sub_amount = to_dec(estimation_sections.get('subletDetailingCost'))
    bid_summary.pe_stamp_cost = to_dec(estimation_sections.get('peStampCost'))
    bid_summary.shop_subcontract_total = to_dec(estimation_sections.get('otherDirectCosts'))

    mat_date_str = project_info.get('materialDate')
    if mat_date_str:
        bid_summary.material_date = mat_date_str
    else:
        bid_summary.material_date = None

    budget_pricing_val = project_info.get('budgetPricing')
    bid_summary.budget_pricing = (budget_pricing_val == 'Y' or budget_pricing_val is True)

    bid_summary.joist_deck_tons = to_dec(estimation_sections.get('steelJoistTons'))
    bid_summary.sublet_erection = to_dec(estimation_sections.get('subletErectionCost'))
    bid_summary.misc_metals = to_dec(estimation_sections.get('miscMetalCost'))
    bid_summary.osha_posts_lf = to_dec(estimation_sections.get('oshaLinearFeet'))
    
    safety = to_dec(estimation_sections.get('additionalSafetyCosts'))
    ccip = to_dec(estimation_sections.get('ccipCosts'))
    bid_summary.safety_ccip = safety + ccip
    
    leed = to_dec(estimation_sections.get('leedSubmissionCost'))
    custom1 = to_dec(estimation_sections.get('otherCustom1Cost'))
    custom2 = to_dec(estimation_sections.get('otherCustom2Cost'))
    bid_summary.leed_data = leed + custom1 + custom2
    bid_summary.misc_bid_amount = to_dec(estimation_sections.get('miscCharges'))

    bid_summary.save()

    misc_items = bid_enquiry.get('miscItems', [])
    if isinstance(misc_items, list):
        BidMaterialLine.objects.filter(bid_summary=bid_summary).delete()
        for idx, item in enumerate(misc_items):
            name = item.get('name')
            amount = item.get('amount')
            if (name and str(name).strip() != '') or (amount and str(amount).strip() != ''):
                BidMaterialLine.objects.create(
                    bid_summary=bid_summary,
                    description=name or '',
                    amount=to_dec(amount),
                    sort_order=idx
                )

