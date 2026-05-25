from rest_framework import viewsets, filters
from .models import BidEnquiry
from .serializers import BidEnquirySerializer

class BidEnquiryViewSet(viewsets.ModelViewSet):
    queryset = BidEnquiry.objects.all()
    serializer_class = BidEnquirySerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['quote_no', 'project_name', 'location', 'project_comments', 'estimator_followup_notes']
    ordering_fields = ['quote_no', 'bid_due_date', 'total_tonnage', 'bid_amount', 'created_at']

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
