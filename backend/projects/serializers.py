from rest_framework import serializers
from .models import Project, StructuralScheduleItem

class StructuralScheduleItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = StructuralScheduleItem
        fields = [
            'id', 'project', 'seq_no', 'tons', 'item_description', 'category',
            'scheduled_ofa_date', 'actual_ofa_date', 'scheduled_bfa_date', 'actual_bfa_date',
            'scheduled_field_measure_date', 'rts_date', 'actual_rts_date', 'ship_date', 'actual_ship_date', 'shop_lead_time_weeks',
            'scheduled_erection_date', 'budget_shop_hours', 'budget_field_hours',
            'actual_shop_hours', 'actual_field_hours', 'detailer_vendor',
            'dwg_status', 'tracking_status', 'notes', 'fabrication_details', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProjectSerializer(serializers.ModelSerializer):
    structural_schedules = StructuralScheduleItemSerializer(many=True, read_only=True)
    awarded_job_no_date = serializers.SerializerMethodField()
    
    class Meta:
        model = Project
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_awarded_job_no_date(self, obj):
        from bids.models import BidEnquiry
        try:
            bid = BidEnquiry.objects.filter(project_name__iexact=obj.name).first()
            if bid:
                return bid.awarded_job_no_date
        except Exception:
            pass
        return None

from .models import Customer, CustomerContact, Detailer, DetailerContact

class CustomerContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerContact
        fields = ['id', 'person', 'email', 'phone']

class CustomerSerializer(serializers.ModelSerializer):
    contacts = CustomerContactSerializer(many=True, required=False)

    class Meta:
        model = Customer
        fields = ['id', 'name', 'code', 'category', 'country', 'contacts', 'created_at', 'updated_at']

    def create(self, validated_data):
        contacts_data = validated_data.pop('contacts', [])
        customer = Customer.objects.create(**validated_data)
        for contact_data in contacts_data:
            CustomerContact.objects.create(customer=customer, **contact_data)
        return customer

    def update(self, instance, validated_data):
        contacts_data = validated_data.pop('contacts', None)
        instance.name = validated_data.get('name', instance.name)
        instance.code = validated_data.get('code', instance.code)
        instance.category = validated_data.get('category', instance.category)
        instance.country = validated_data.get('country', instance.country)
        instance.save()

        if contacts_data is not None:
            instance.contacts.all().delete()
            for contact_data in contacts_data:
                CustomerContact.objects.create(customer=instance, **contact_data)
                
        return instance

class DetailerContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = DetailerContact
        fields = ['id', 'person', 'email', 'phone']

class DetailerSerializer(serializers.ModelSerializer):
    contacts = DetailerContactSerializer(many=True, required=False)

    class Meta:
        model = Detailer
        fields = ['id', 'name', 'code', 'contacts', 'created_at', 'updated_at']

    def create(self, validated_data):
        contacts_data = validated_data.pop('contacts', [])
        detailer = Detailer.objects.create(**validated_data)
        for contact_data in contacts_data:
            DetailerContact.objects.create(detailer=detailer, **contact_data)
        return detailer

    def update(self, instance, validated_data):
        contacts_data = validated_data.pop('contacts', None)
        instance.name = validated_data.get('name', instance.name)
        instance.code = validated_data.get('code', instance.code)
        instance.save()

        if contacts_data is not None:
            instance.contacts.all().delete()
            for contact_data in contacts_data:
                DetailerContact.objects.create(detailer=instance, **contact_data)
                
        return instance
