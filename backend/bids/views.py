from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import BidEnquiry, Holiday
from .serializers import BidEnquirySerializer, HolidaySerializer

from django.core.mail import send_mail
from django.conf import settings


class HolidayViewSet(viewsets.ModelViewSet):
    """CRUD for company holidays, filterable by timezone and year."""
    queryset = Holiday.objects.all()
    serializer_class = HolidaySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering = ['date']
    pagination_class = None

    def get_queryset(self):
        qs = Holiday.objects.all()
        timezone = self.request.query_params.get('timezone')
        year = self.request.query_params.get('year')
        if timezone:
            qs = qs.filter(timezone=timezone)
        if year:
            qs = qs.filter(date__year=year)
        return qs


class BidEnquiryViewSet(viewsets.ModelViewSet):
    queryset = BidEnquiry.objects.all()
    serializer_class = BidEnquirySerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['quote_no', 'project_name', 'location', 'project_comments', 'estimator_followup_notes']
    ordering_fields = ['quote_no', 'bid_due_date', 'total_tonnage', 'bid_amount', 'created_at']

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        email_sent = self._send_scope_email(instance)
        data = serializer.data
        data['email_sent'] = email_sent
        return Response(data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        email_sent = self._send_scope_email(instance)
        data = serializer.data
        data['email_sent'] = email_sent
        return Response(data)

    def _send_scope_email(self, instance):
        if not instance.scope_of_work:
            return False
            
        subject = f"Bid Information: {instance.quote_no} - {instance.project_name}"
        message = f"Bid Enquiry Details:\n\nQuote No: {instance.quote_no}\nProject Name: {instance.project_name}\nScope of Work: {instance.scope_of_work}\n\nPlease check the system for more details."
        
        detailing_emails = 'namrutha@caldimengg.in'
        fabrication_emails = 'divya@caldimengg.in'
        erection_emails = 'divya@caldimengg.in'
        try:
            from apps.rfq.models import SystemSetting
            detailing_emails = SystemSetting.objects.get(key='rfq_detailing_emails').value
        except Exception:
            pass
        try:
            from apps.rfq.models import SystemSetting
            fabrication_emails = SystemSetting.objects.get(key='rfq_fabrication_emails').value
        except Exception:
            pass
        try:
            from apps.rfq.models import SystemSetting
            erection_emails = SystemSetting.objects.get(key='rfq_erection_emails').value
        except Exception:
            pass

        recipients = []
        scopes = [s.strip().lower() for s in instance.scope_of_work.split(',') if s.strip()]
        
        def add_recipients(email_str):
            for e in email_str.split(','):
                e = e.strip()
                if e:
                    recipients.append(e)

        if 'detailing' in scopes and detailing_emails:
            add_recipients(detailing_emails)
        if 'fabrication' in scopes and fabrication_emails:
            add_recipients(fabrication_emails)
        if 'erection' in scopes and erection_emails:
            add_recipients(erection_emails)
            
        recipients = list(set(recipients))
        
        if recipients:
            try:
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    recipients,
                    fail_silently=False,
                )
                return True
            except Exception as e:
                print(f"Failed to send email to {recipients}: {e}")
                return False
        return False

    def get_queryset(self):
        queryset = BidEnquiry.objects.all()
        
        # Manual query parameters filtering
        customer = self.request.query_params.get('customer_name')
        if customer:
            queryset = queryset.filter(customer_name_id=customer)
            
        estimator = self.request.query_params.get('primary_estimator')
        if estimator:
            queryset = queryset.filter(primary_estimator_id=estimator)
            
        won_lost = self.request.query_params.get('won_lost')
        if won_lost:
            queryset = queryset.filter(won_lost=won_lost)
            
        decision = self.request.query_params.get('decision_to_bid')
        if decision:
            queryset = queryset.filter(decision_to_bid=decision)
            
        return queryset
