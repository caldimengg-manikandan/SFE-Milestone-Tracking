from rest_framework import viewsets
from django.db.models import Q
from .models import Project, StructuralScheduleItem
from .serializers import ProjectSerializer, StructuralScheduleItemSerializer

class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    pagination_class = None
    search_fields = ['name', 'code', 'client']
    filterset_fields = ['status']

    def get_queryset(self):
        queryset = Project.objects.all()
        won_rfq = self.request.query_params.get('won_rfq')
        if won_rfq == 'true':
            from apps.rfq.models import RFQMaster
            won_rfqs = RFQMaster.objects.filter(won_lost='Won')
            
            # Sync missing projects dynamically
            existing_codes = set(Project.objects.values_list('code', flat=True))
            for rfq in won_rfqs:
                code = str(rfq.sfe_job_no) if rfq.sfe_job_no else rfq.quote_no
                if not code:
                    continue
                if code not in existing_codes:
                    avg_struct_fab = float(rfq.struct_fab_hours or 0)
                    avg_misc_fab = float(rfq.misc_fab_hours or 0)
                    avg_struct_erect = float(rfq.struct_erect_hours or 0)
                    avg_misc_erect = float(rfq.misc_erect_hours or 0)
                    total_manhours = avg_struct_fab + avg_misc_fab + avg_struct_erect + avg_misc_erect
                    
                    Project.objects.create(
                        code=code,
                        name=rfq.project_name or '',
                        customer_name=rfq.customer.name if rfq.customer else '',
                        project_manager_name=rfq.primary_estimator.full_name if rfq.primary_estimator else '',
                        total_ton=rfq.total_tonnage or rfq.ton_steel or 0,
                        total_manhours=total_manhours,
                        erection_date=rfq.contract_executed_date or rfq.awarded_job_date,
                        status='Yet to Start'
                    )
                    existing_codes.add(code)
            
            # Refetch projects to include newly synced ones
            won_quotes = list(won_rfqs.values_list('quote_no', flat=True))
            won_job_nos = [str(job_no) for job_no in won_rfqs.values_list('sfe_job_no', flat=True) if job_no is not None]
            won_names = list(won_rfqs.values_list('project_name', flat=True))
            queryset = Project.objects.filter(
                Q(code__in=won_quotes) |
                Q(code__in=won_job_nos) |
                Q(name__in=won_names)
            )
        return queryset

from django.db.models.functions import Length

class StructuralScheduleItemViewSet(viewsets.ModelViewSet):
    serializer_class = StructuralScheduleItemSerializer
    filterset_fields = ['project']

    def get_queryset(self):
        # Sort by length of seq_no first, then alphabetically — gives numeric order: 1,2,...,9,10,11
        return StructuralScheduleItem.objects.annotate(
            seq_len=Length('seq_no')
        ).order_by('project', 'seq_len', 'seq_no')

from .models import Customer, Detailer
from .serializers import CustomerSerializer, DetailerSerializer

class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    search_fields = ['name', 'code']
    filterset_fields = ['category', 'country']

class DetailerViewSet(viewsets.ModelViewSet):
    queryset = Detailer.objects.all()
    serializer_class = DetailerSerializer
    search_fields = ['name', 'code']
