"""
RFQ ViewSets — CRUD for rfq_master, customers, estimators, goals, and print view.
"""
import re
import math
import io
from datetime import date
from rest_framework import viewsets, generics, filters, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as df_filters
from .models import RFQMaster, Customer, Estimator, MonthlyBidGoal
from .serializers import (
    RFQMasterSerializer, RFQListSerializer, PrintSetupSerializer,
    CustomerSerializer, EstimatorSerializer, MonthlyBidGoalSerializer,
)
from .permissions import CanEditRFQ, IsManagerOrReadOnly
import threading
import logging
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# FILTERS
# ─────────────────────────────────────────────────────────────────────────────

class RFQFilter(df_filters.FilterSet):
    year = df_filters.NumberFilter(field_name='quote_date', lookup_expr='year')
    bid_year = df_filters.NumberFilter(field_name='bid_due_date', lookup_expr='year')
    customer = df_filters.NumberFilter(field_name='customer__id')
    estimator = df_filters.NumberFilter(field_name='primary_estimator__id')
    won_lost = df_filters.CharFilter(field_name='won_lost')
    bid_due_from = df_filters.DateFilter(field_name='bid_due_date', lookup_expr='gte')
    bid_due_to = df_filters.DateFilter(field_name='bid_due_date', lookup_expr='lte')
    is_active = df_filters.BooleanFilter(field_name='deleted_at', lookup_expr='isnull')
    budget_type = df_filters.CharFilter(field_name='budget_type')

    class Meta:
        model = RFQMaster
        fields = ['won_lost', 'budget_type', 'decision_to_bid']


# ─────────────────────────────────────────────────────────────────────────────
# RFQ MASTER VIEWSET
# ─────────────────────────────────────────────────────────────────────────────

def send_rfq_email_async(rfq_id):
    """Function to run in a background thread to send the email."""
    try:
        rfq = RFQMaster.objects.select_related('customer', 'primary_estimator').get(id=rfq_id)
        if not rfq.scope_of_work:
            return
            
        recipient_name = None
        recipient_email = None
        
        scope = rfq.scope_of_work
        if scope == 'Detailing':
            recipient_name = 'namrutha'
            recipient_email = 'namrutha@caldimengg.in'
        elif scope in ['Fabrication', 'Erection']:
            recipient_name = 'divya'
            recipient_email = 'divya@caldimengg.in'
            
        if not recipient_email:
            return
            
        subject = f"Project Details: {rfq.quote_no} - {rfq.project_name}"
        
        body = f"Dear {recipient_name},\n\nPlease find the below details of the project:\n\n"
        body += f"Quote No: {rfq.quote_no}\n"
        body += f"Project Name: {rfq.project_name}\n"
        body += f"Scope of Work: {rfq.scope_of_work}\n"
        if rfq.customer:
            body += f"Customer: {rfq.customer.name}\n"
        if rfq.primary_estimator:
            body += f"Primary Estimator: {rfq.primary_estimator.initials}\n"
        if rfq.bid_due_date:
            body += f"Bid Due Date: {rfq.bid_due_date}\n"
        if rfq.bid_amount:
            body += f"Bid Amount: ${rfq.bid_amount:,.2f}\n"
        if rfq.location:
            body += f"Location: {rfq.location}\n"
        if rfq.project_comments:
            body += f"Comments: {rfq.project_comments}\n"
            
        body += "\nBest Regards,\nSFE Team"
        
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            fail_silently=False
        )
        rfq.email_sent = True
        rfq.save(update_fields=['email_sent'])
    except Exception as e:
        logger.error(f"Error sending email for RFQ {rfq_id}: {str(e)}", exc_info=True)

class RFQMasterViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, CanEditRFQ]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = RFQFilter
    search_fields = ['quote_no', 'project_name', 'bid_reference', 'customer__name']
    ordering_fields = ['bid_due_date', 'quote_date', 'bid_amount', 'won_lost', 'project_name']
    ordering = ['-bid_due_date']
    pagination_class = None

    def get_queryset(self):
        qs = RFQMaster.objects.select_related('customer', 'primary_estimator')
        # Exclude soft-deleted by default unless explicitly requested
        if not self.request.query_params.get('include_deleted'):
            qs = qs.filter(deleted_at__isnull=True)
        return qs

    def get_serializer_class(self):
        if self.action == 'print_view':
            return PrintSetupSerializer
        return RFQMasterSerializer

    def perform_create(self, serializer):
        serializer.save(
            created_by=self.request.user.username,
            updated_by=self.request.user.username,
        )

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user.username)

    def destroy(self, request, *args, **kwargs):
        """Hard delete — permanently delete from DB."""
        instance = self.get_object()
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'], url_path='print')
    def print_view(self, request):
        """Weekly meeting print view — filtered by bid_due_date range."""
        qs = self.get_queryset().filter(
            decision_to_bid__in=['Yes', 'Bid'],
            deleted_at__isnull=True,
        ).order_by('bid_due_date', 'customer__name')

        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(bid_due_date__gte=date_from)
        if date_to:
            qs = qs.filter(bid_due_date__lte=date_to)

        serializer = PrintSetupSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='next-quote-no')
    def next_quote_no(self, request):
        """Auto-generate next quote number, reusing gaps in sequences of the last active month."""
        qnos = list(RFQMaster.objects.filter(deleted_at__isnull=True).values_list('quote_no', flat=True))
        
        parsed = []
        for q in qnos:
            m = re.match(r'^(\d{2})-(\d{2})-(\d+)', q)
            if m:
                try:
                    yy = int(m.group(1))
                    mm = int(m.group(2))
                    seq = int(m.group(3))
                    parsed.append((yy, mm, seq))
                except ValueError:
                    pass
        
        if parsed:
            parsed.sort(key=lambda x: (x[0], x[1], x[2]))
            last_yy, last_mm, last_seq = parsed[-1]
            
            # Gather all existing sequences in that specific last year and month
            existing_seqs = {seq for (yy, mm, seq) in parsed if yy == last_yy and mm == last_mm}
            
            # Find the first sequence (starting from 1) that is not currently in use
            next_seq = 1
            while next_seq in existing_seqs:
                next_seq += 1
                
            next_no = f"{last_yy:02d}-{last_mm:02d}-{next_seq:02d}"
        else:
            from django.utils import timezone
            now = timezone.now()
            next_no = f"{now.strftime('%y')}-{now.strftime('%m')}-01"
            
        return Response({'next_quote_no': next_no})

    @action(detail=True, methods=['patch'], url_path='sebw-sync',
            permission_classes=[IsAuthenticated, CanEditRFQ])
    def sebw_sync(self, request, pk=None):
        """
        Accept exactly the 5 SEBW output fields.
        Audit trail: sets updated_by = 'sebw_sync' so we know which fields
        came from SEBW rather than being entered manually.
        """
        ALLOWED = {
            'bid_amount', 'quoted_profit', 'struct_erect_hours',
            'struct_erect_duration_months', 'sq_ft_structural',
        }
        data = {k: v for k, v in request.data.items() if k in ALLOWED}
        if not data:
            return Response({'detail': 'No valid SEBW fields provided.'}, status=400)

        instance = self.get_object()
        serializer = RFQMasterSerializer(
            instance, data=data, partial=True, context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(updated_by='sebw_sync')
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='duplicate',
            permission_classes=[IsAuthenticated, CanEditRFQ])
    def duplicate(self, request, pk=None):
        """
        Clone an RFQ as a Rebid with an auto-generated quote_no.
        Appends R suffix: 25-11-06 → 25-11-06R → 25-11-06R1 → 25-11-06R2 …
        Resets: won_lost=Pending, clears sfe_job_no and post-award dates.
        """
        source = self.get_object()
        # Strip any existing R suffix to get the base quote number
        base = re.sub(r'R\d*$', '', source.quote_no)
        # Try R, R1, R2 ... R19 until we find an available quote_no
        candidate = None
        for suffix in ['R'] + [f'R{i}' for i in range(1, 20)]:
            test = base + suffix
            if not RFQMaster.objects.filter(quote_no=test).exists():
                candidate = test
                break
        if not candidate:
            return Response(
                {'detail': 'Could not auto-generate rebid quote number (R through R19 all taken).'},
                status=status.HTTP_409_CONFLICT
            )

        # Clone the source record
        source.pk = None  # detach from DB to create new instance
        source.id = None
        source.quote_no = candidate
        source.budget_type = 'Rebid'
        source.won_lost = 'Pending'
        source.sfe_job_no = None
        source.awarded_job_date = None
        source.contract_executed_date = None
        source.fabrication_start_date = None
        source.awarded_amount = None
        source.deleted_at = None
        source.created_by = request.user.username
        source.updated_by = request.user.username
        source.save()
        return Response(RFQMasterSerializer(source).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='send-email',
            permission_classes=[IsAuthenticated, CanEditRFQ])
    def send_email(self, request, pk=None):
        """Send email for a single RFQ master record."""
        rfq = self.get_object()
        if not rfq.scope_of_work:
            return Response({'detail': 'Scope of Work is not selected for this project.'}, status=400)
            
        thread = threading.Thread(target=send_rfq_email_async, args=(rfq.id,))
        thread.start()
        
        return Response({'detail': 'Email sending initiated.'})

    @action(detail=False, methods=['post'], url_path='send-bulk-emails',
            permission_classes=[IsAuthenticated, CanEditRFQ])
    def send_bulk_emails(self, request):
        """Send pending emails for all non-deleted RFQs with a scope of work."""
        pending_rfqs = RFQMaster.objects.filter(
            deleted_at__isnull=True,
            scope_of_work__isnull=False,
            email_sent=False
        ).exclude(scope_of_work='')
        
        count = pending_rfqs.count()
        if count == 0:
            return Response({'detail': 'No pending emails to send.'}, status=400)
            
        for rfq in pending_rfqs:
            thread = threading.Thread(target=send_rfq_email_async, args=(rfq.id,))
            thread.start()
            
        return Response({'detail': f'Bulk sending initiated for {count} project(s).'})

    @action(detail=False, methods=['post'], url_path='test-smtp',
            permission_classes=[IsAuthenticated, CanEditRFQ])
    def test_smtp(self, request):
        """Diagnose SMTP configurations by sending a test email synchronously."""
        try:
            recipient = request.data.get('email', 'support@caldimengg.in')
            subject = "SFE SMTP Diagnostics Test"
            body = "This is a synchronous test email to verify SMTP configuration on the SFE Milestone server."
            
            send_mail(
                subject=subject,
                message=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient],
                fail_silently=False
            )
            return Response({
                'success': True,
                'detail': f'Test email sent successfully to {recipient}.',
                'smtp_host': settings.EMAIL_HOST,
                'smtp_port': settings.EMAIL_PORT,
                'from_email': settings.DEFAULT_FROM_EMAIL
            })
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            return Response({
                'success': False,
                'detail': str(e),
                'traceback': error_trace,
                'smtp_host': getattr(settings, 'EMAIL_HOST', None),
                'smtp_port': getattr(settings, 'EMAIL_PORT', None),
                'from_email': getattr(settings, 'DEFAULT_FROM_EMAIL', None)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='upload-excel',
            permission_classes=[IsAuthenticated, CanEditRFQ],
            parser_classes=[MultiPartParser, FormParser])
    def upload_excel(self, request):
        """
        Accept an .xlsx file upload.
        ?commit=true  → actually save records
        ?commit=false → dry-run preview only (default)
        Returns { new: [], updated: [], skipped: int, errors: [] }
        """
        import sys, os
        from datetime import datetime, date, time
        import datetime as dt
        from decimal import Decimal, InvalidOperation
        from django.db import transaction

        file_obj = request.FILES.get('file')
        commit = request.data.get('commit', 'false').lower() == 'true'

        if not file_obj:
            return Response({'detail': 'No file uploaded.'}, status=400)
        if not file_obj.name.endswith('.xlsx'):
            return Response({'detail': 'Only .xlsx files are accepted.'}, status=400)

        try:
            import openpyxl
        except ImportError:
            return Response({'detail': 'openpyxl not installed on server.'}, status=500)

        # Full column mapping from migrate_excel.py
        EXCEL_COLUMN_MAP = {
            'A': 'quote_no',
            'E': 'budget_type',
            'F': 'bid_reference',
            'G': 'project_name',
            'H': 'project_comments',
            'I': 'bid_due_date',
            'J': 'bid_due_time',
            'K': 'location',
            'L': 'distance_travel',
            'M': 'aisc_fab',
            'N': 'aisc_erect',
            'O': 'domestic_steel',
            'P': 'leed_project',
            'Q': 'minority_participation',
            'R': 'prevailing_wage',
            'S': 'ccip_ocip',
            'T': 'bonded',
            'U': 'paint',
            'V': 'galvanised',
            'W': 'professional_engineer',
            'X': 'third_party_inspection',
            'Y': 'tax_status',
            'Z': '_customer_name',
            'AA': 'decision_to_bid',
            'AB': '_estimator_initials',
            'AC': 'outsourced_estimator',
            'AD': 'sent_to_jd',
            'AE': 'sent_to_detailing',
            'AF': 'sent_to_erection',
            'AG': 'est_sqft_ton',
            'AH': 'price_structure',
            'AI': 'price_erection',
            'AJ': 'price_misc',
            'AK': 'price_misc_erection',
            'AL': 'bid_amount',
            'AM': 'quoted_profit',
            'AN': 'ton_steel',
            'AO': 'ton_joist',
            'AQ': 'num_main_structural_pcs',
            'AS': 'sq_ft_structural',
            'AZ': 'struct_fab_hours',
            'BA': 'struct_fab_start_month',
            'BB': 'struct_fab_duration_months',
            'BE': 'misc_fab_hours',
            'BF': 'misc_fab_start_month',
            'BG': 'misc_fab_duration_months',
            'BJ': 'struct_erect_hours',
            'BK': 'struct_erect_start_month',
            'BL': 'struct_erect_duration_months',
            'BO': 'misc_erect_hours',
            'BP': 'misc_erect_start_month',
            'BQ': 'misc_erect_duration_months',
            'BT': 'estimating_hours',
            'BU': 'quote_date',
            'BV': 'won_lost',
            'BW': 'follow_up_notes',
            'BX': 'follow_up_date',
            'BY': 'awarded_amount',
            'BZ': 'sfe_job_no',
            'CA': 'awarded_job_date',
            'CB': 'contract_executed_date',
            'CC': 'fabrication_start_date',
        }

        BOOL_FIELDS = {
            'aisc_fab', 'aisc_erect', 'domestic_steel', 'leed_project',
            'minority_participation', 'prevailing_wage', 'ccip_ocip', 'bonded',
            'paint', 'galvanised', 'professional_engineer', 'third_party_inspection',
            'sent_to_jd', 'sent_to_detailing', 'sent_to_erection',
        }

        DATE_FIELDS = {
            'bid_due_date', 'quote_date', 'follow_up_date',
            'awarded_job_date', 'contract_executed_date', 'fabrication_start_date',
            'struct_fab_start_month', 'misc_fab_start_month',
            'struct_erect_start_month', 'misc_erect_start_month',
        }

        DECIMAL_FIELDS = {
            'price_structure', 'price_erection', 'price_misc', 'price_misc_erection',
            'bid_amount', 'quoted_profit', 'awarded_amount',
            'ton_steel', 'ton_joist', 'sq_ft_structural',
            'struct_fab_hours', 'misc_fab_hours', 'struct_erect_hours', 'misc_erect_hours',
            'estimating_hours', 'distance_travel',
        }

        INT_FIELDS = {
            'num_main_structural_pcs', 'sfe_job_no',
            'struct_fab_duration_months', 'misc_fab_duration_months',
            'struct_erect_duration_months', 'misc_erect_duration_months',
        }

        WON_LOST_MAP = {
            'Won': 'Won', 'won': 'Won', 'W': 'Won',
            'Lost': 'Lost', 'lost': 'Lost', 'L': 'Lost',
            'Pending': 'Pending', 'pending': 'Pending', 'P': 'Pending',
            '': 'Pending', None: 'Pending',
        }

        def col_idx(letter):
            result = 0
            for c in letter.upper():
                result = result * 26 + (ord(c) - ord('A') + 1)
            return result - 1

        def coerce_bool(val):
            if val is None: return False
            if isinstance(val, bool): return val
            return str(val).strip().upper() in ('Y', 'YES', 'TRUE', '1', 'X')

        def coerce_date(val):
            if val is None: return None
            if isinstance(val, (datetime, date)):
                return val.date() if isinstance(val, datetime) else val
            if isinstance(val, str):
                val = val.strip()
                if not val: return None
                for fmt in ('%Y-%m-%d', '%m/%d/%Y', '%m/%d/%y', '%d-%b-%Y'):
                    try:
                        return datetime.strptime(val, fmt).date()
                    except ValueError:
                        pass
            return None

        def coerce_decimal(val):
            if val is None: return None
            if isinstance(val, dt.timedelta):
                return Decimal(str(round(val.total_seconds() / 3600.0, 2)))
            if isinstance(val, (int, float)):
                if isinstance(val, float) and (val != val or math.isnan(val)):
                    return None
                return Decimal(str(val))
            try:
                return Decimal(str(val).replace(',', '').strip())
            except (InvalidOperation, ValueError, TypeError):
                return None

        def coerce_int(val):
            if val is None: return None
            try:
                f_val = float(str(val).replace(',', ''))
                if math.isnan(f_val):
                    return None
                return int(f_val)
            except (ValueError, TypeError):
                return None

        def coerce_time(val):
            if val is None: return None
            if isinstance(val, time):
                return val
            if isinstance(val, datetime):
                return val.time()
            if isinstance(val, str):
                val = val.strip()
                if not val: return None
                for fmt in ('%H:%M:%S', '%H:%M', '%I:%M %p', '%I:%M%p'):
                    try:
                        return datetime.strptime(val, fmt).time()
                    except ValueError:
                        pass
            return None

        wb = openpyxl.load_workbook(file_obj, read_only=True, data_only=True)
        if 'Data' not in wb.sheetnames:
            return Response({'detail': "Sheet 'Data' not found in workbook."}, status=400)
        ws = wb['Data']

        col_positions = {letter: col_idx(letter) for letter in EXCEL_COLUMN_MAP}

        new_records, updated_records, skipped, errors = [], [], 0, []
        parsed_records = []

        for row_num, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
            if not any(row):
                continue
            raw_qno = row[col_positions['A']] if col_positions['A'] < len(row) else None
            if not raw_qno:
                skipped += 1
                continue
            quote_no = str(raw_qno).strip()
            
            # Normalize quote number pattern YY-MM-SEQ
            if not re.match(r'^\d{2}-\d{2}-\d{2,3}(R\d?)?$', quote_no):
                quote_no = re.sub(r'\s+', '', quote_no)
                if not re.match(r'^\d{2}-\d{2}-\d{2,3}(R\d?)?$', quote_no):
                    skipped += 1
                    continue

            # Build record dict
            rec = {'quote_no': quote_no}
            
            for letter, field in EXCEL_COLUMN_MAP.items():
                if field.startswith('_'):
                    continue  # customer / estimator handled separately
                
                idx = col_positions[letter]
                raw = row[idx] if idx < len(row) else None
                
                if field in BOOL_FIELDS:
                    rec[field] = coerce_bool(raw)
                elif field in DATE_FIELDS:
                    rec[field] = coerce_date(raw)
                elif field in DECIMAL_FIELDS:
                    rec[field] = coerce_decimal(raw)
                elif field in INT_FIELDS:
                    rec[field] = coerce_int(raw)
                elif field == 'won_lost':
                    rec[field] = WON_LOST_MAP.get(raw, 'Pending')
                elif field == 'bid_due_time':
                    rec[field] = coerce_time(raw)
                else:
                    rec[field] = str(raw).strip() if raw is not None else ''

            # Extract customer name
            cname = str(row[col_positions['Z']] if col_positions['Z'] < len(row) else '').strip()
            if cname:
                rec['_customer_name'] = cname

            # Extract estimator initials
            einit = str(row[col_positions['AB']] if col_positions['AB'] < len(row) else '').strip()
            if einit:
                rec['_estimator_initials'] = einit

            parsed_records.append(rec)

        # Categorize records for response preview
        for rec in parsed_records:
            exists = RFQMaster.objects.filter(quote_no=rec['quote_no']).exists()
            entry = {
                'quote_no': rec['quote_no'],
                'project_name': rec.get('project_name', ''),
                'is_new': not exists,
            }
            if exists:
                updated_records.append(entry)
            else:
                new_records.append(entry)

        if commit:
            seen_job_nos = set()
            try:
                with transaction.atomic():
                    for rec in parsed_records:
                        quote_no = rec['quote_no']
                        
                        # Get or create customer
                        customer_obj = None
                        cname = rec.get('_customer_name')
                        if cname:
                            customer_obj, _ = Customer.objects.get_or_create(name=cname)
                            
                        # Get or create estimator
                        estimator_obj = None
                        einit = rec.get('_estimator_initials')
                        if einit:
                            estimator_obj, _ = Estimator.objects.get_or_create(
                                initials=einit,
                                defaults={'is_active': True, 'full_name': ''}
                            )
                            
                        # Build RFQ field dictionary for update/create
                        defaults = {k: v for k, v in rec.items() if not k.startswith('_')}
                        defaults['customer'] = customer_obj
                        defaults['primary_estimator'] = estimator_obj
                        
                        # Handle duplicate sfe_job_no safely to avoid database IntegrityError
                        jno = defaults.get('sfe_job_no')
                        if jno is not None:
                            if jno in seen_job_nos or RFQMaster.objects.filter(sfe_job_no=jno).exclude(quote_no=quote_no).exists():
                                defaults['sfe_job_no'] = None
                            else:
                                seen_job_nos.add(jno)

                        # Save or update RFQMaster instance
                        rfq_inst = RFQMaster.objects.filter(quote_no=quote_no).first()
                        if rfq_inst:
                            # Update existing
                            for k, v in defaults.items():
                                setattr(rfq_inst, k, v)
                            rfq_inst.updated_by = request.user.username or 'excel_upload'
                            rfq_inst.save()
                        else:
                            # Create new
                            rfq_inst = RFQMaster(**defaults)
                            rfq_inst.created_by = request.user.username or 'excel_upload'
                            rfq_inst.updated_by = request.user.username or 'excel_upload'
                            rfq_inst.save()
            except Exception as e:
                return Response({
                    'detail': f'Error occurred during import transaction: {str(e)}'
                }, status=500)

        result = {
            'new': new_records,
            'updated': updated_records,
            'skipped': skipped,
            'errors': errors,
            'commit': commit,
        }

        if commit:
            result['message'] = f'Successfully committed {len(new_records)} new and {len(updated_records)} updated records to the database.'

        return Response(result)



# ─────────────────────────────────────────────────────────────────────────────
# LOOKUP TABLES
# ─────────────────────────────────────────────────────────────────────────────

class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by('name')
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']
    pagination_class = None  # Return all customers for dropdowns


class EstimatorViewSet(viewsets.ModelViewSet):
    queryset = Estimator.objects.filter(is_active=True).order_by('initials')
    serializer_class = EstimatorSerializer
    permission_classes = [IsAuthenticated, IsManagerOrReadOnly]
    pagination_class = None


class MonthlyBidGoalViewSet(viewsets.ModelViewSet):
    queryset = MonthlyBidGoal.objects.all().order_by('year', 'month')
    serializer_class = MonthlyBidGoalSerializer
    permission_classes = [IsAuthenticated, CanEditRFQ]
    pagination_class = None

    @action(detail=False, methods=['get'])
    def current_year(self, request):
        """Return goals for current year, auto-creating missing months at $2M."""
        from django.utils import timezone
        year = timezone.now().year
        goals = []
        for month in range(1, 13):
            obj, _ = MonthlyBidGoal.objects.get_or_create(
                year=year, month=month,
                defaults={'goal': 2000000}
            )
            goals.append(obj)
        return Response(MonthlyBidGoalSerializer(goals, many=True).data)
