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
            
        import datetime
        import re
        
        subject = f"Project Details: {instance.quote_no} - {instance.project_name}"
        
        # Determine estimator details
        estimator_name = "Estimator"
        estimator_phone = "717-464-0330"
        estimator_email = "estimator@steelfabenterprises.com"
        
        if instance.primary_estimator:
            emp = instance.primary_estimator
            estimator_name = emp.name
            estimator_phone = emp.phone or "717-464-0330"
            estimator_email = emp.email or "estimator@steelfabenterprises.com"
            
            # Map Andy Smith if name matches
            if 'andy' in emp.name.lower() or 'smith' in emp.name.lower():
                estimator_name = 'Andy Smith'
                estimator_phone = '717-464-0330 x223'
                estimator_email = 'asmith@steelfabenterprises.com'
                
        # Determine bid type
        is_rebid = False
        quote_no_str = str(instance.quote_no) if instance.quote_no else ''
        if re.search(r'\d{2}-\d{2}-\d+R', quote_no_str):
            is_rebid = True

        due_date_str = f"{instance.bid_due_date.strftime('%B')} {instance.bid_due_date.day}, {instance.bid_due_date.year}" if instance.bid_due_date else "N/A"
        
        # Calculate deadline: 3 days before bid due date, adjusting weekends to previous Friday
        deadline_date = instance.bid_due_date - datetime.timedelta(days=3) if instance.bid_due_date else None
        if deadline_date:
            if deadline_date.weekday() == 5:    # Saturday
                deadline_date -= datetime.timedelta(days=1)
            elif deadline_date.weekday() == 6:  # Sunday
                deadline_date -= datetime.timedelta(days=2)
        deadline_str = f"{deadline_date.strftime('%B')} {deadline_date.day}, {deadline_date.year}" if deadline_date else "N/A"

        from django.utils.html import escape
        
        esc_project_name = escape(instance.project_name)
        esc_location = escape(instance.location or 'N/A')
        esc_scope = escape(instance.scope_of_work or 'project')
        esc_comments = escape(instance.project_comments.strip()) if instance.project_comments else ''

        # 1. Plain text body
        message = f"Good Morning –\n\n"
        message += f"Please see the link below for the {instance.project_name} project located in {instance.location or 'N/A'} "
        message += f"for your review in providing an updated Model and IFC files for the {instance.scope_of_work or 'project'}. "
        
        if instance.project_comments:
            message += f"{instance.project_comments.strip()} "
            
        if is_rebid:
            message += f"This project previously bid and is out for best and final offer bidding on {due_date_str}, "
        else:
            message += f"This project is out for bidding on {due_date_str}, "
            
        message += f"if you could review and forward your updated files to estimator@steelfabenterprises.com by {deadline_str} would be greatly appreciated.\n\n"
        
        link_url = f"https://caldimproducts.com/rfq/data-entry?quote_no={instance.quote_no}"
        message += f"{link_url}\n\n"
        message += "As a reminder, we will need Detailing Quote for the Structural & Miscellaneous and Engineering as well.\n\n"
        message += f"Should you have any questions or need any additional information, please contact {estimator_name} at {estimator_phone} or {estimator_email}. Thanks for your help!\n"

        # 2. HTML body
        html_message = f"Good Morning –<br/><br/>"
        html_message += f"Please see the link below for <b>the {esc_project_name} project</b> located in <b>{esc_location}</b> "
        html_message += f"for your review in providing an updated Model and IFC files for the <b><u>{esc_scope}</u></b>. "
        
        if esc_comments:
            html_message += f"{esc_comments} "
            
        if is_rebid:
            html_message += f"This project previously bid and is out for best and final offer bidding on <b>{due_date_str}</b>, "
        else:
            html_message += f"This project is out for bidding on <b>{due_date_str}</b>, "
            
        html_message += f"if you could review and forward your updated files to <a href=\"mailto:estimator@steelfabenterprises.com\">estimator@steelfabenterprises.com</a> by <b>{deadline_str}</b> would be greatly appreciated.<br/><br/>"
        
        html_message += f'<a href="{link_url}">{link_url}</a><br/><br/>'
        html_message += "<b><i>As a reminder, we will need Detailing Quote for the Structural & Miscellaneous and Engineering as well.</i></b><br/><br/>"
        
        # Link email contacts inside HTML
        esc_estimator_name = escape(estimator_name)
        esc_estimator_phone = escape(estimator_phone)
        esc_estimator_email = escape(estimator_email)
        html_message += f"Should you have any questions or need any additional information, please contact {esc_estimator_name} at {esc_estimator_phone} or <b><u><a href=\"mailto:{esc_estimator_email}\">{esc_estimator_email}</a></u></b>. Thanks for your help!<br/>"
        
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
                    html_message=html_message,
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
