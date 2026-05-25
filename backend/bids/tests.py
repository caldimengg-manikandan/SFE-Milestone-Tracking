from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from projects.models import Customer
from employees.models import Employee
from bids.models import BidEnquiry, calculate_end_month

User = get_user_model()


class BidEnquiryModelTest(TestCase):
    def setUp(self):
        self.customer = Customer.objects.create(name="Acme Corp", code="ACM")
        self.estimator = Employee.objects.create(
            emp_id="EMP001",
            name="John Doe",
            department="Estimating",
            designation="Senior Estimator",
            email="john.doe@sfe.com"
        )

    def test_end_month_calculations(self):
        # Basic months without years
        self.assertEqual(calculate_end_month("January", 1), "January")
        self.assertEqual(calculate_end_month("January", 3), "March")
        self.assertEqual(calculate_end_month("December", 2), "January")
        
        # Months with 4-digit years
        self.assertEqual(calculate_end_month("May 2026", 1), "May 2026")
        self.assertEqual(calculate_end_month("May 2026", 3), "July 2026")
        self.assertEqual(calculate_end_month("November 2026", 4), "February 2027")
        
        # Months with 2-digit apostrophe/hyphen years
        self.assertEqual(calculate_end_month("May-26", 3), "July '26")
        self.assertEqual(calculate_end_month("Nov-26", 5), "March '27")
        
        # Case insensitive and abbreviations
        self.assertEqual(calculate_end_month("jan 2026", 12), "December 2026")
        self.assertEqual(calculate_end_month("Dec 2026", 2), "January 2027")

        # Fallbacks
        self.assertEqual(calculate_end_month("InvalidMonth", 5), "InvalidMonth")
        self.assertEqual(calculate_end_month("", 5), "")

    def test_model_calculations_on_save(self):
        bid = BidEnquiry.objects.create(
            quote_no="Q-2026-001",
            project_name="Commercial Tower",
            customer_name=self.customer,
            primary_estimator=self.estimator,
            
            # Inputs
            price_structure=150000.00,
            price_struc_erection=50000.00,
            price_misc=10000.00,
            price_misc_erection=5000.00,
            bid_amount=215000.00,
            quoted_profit=25000.00,
            ton_steel=100.00,
            ton_joist=20.00,
            main_structural_pcs=500,
            sqft_structural=25000.00,
            
            struct_fab_hours=1200.00,
            struct_fab_start_month="May 2026",
            struct_fab_duration=3,
            
            misc_fab_hours=400.00,
            misc_fab_start_month="Jun 2026",
            misc_fab_duration=2,
            
            struct_erect_hours=800.00,
            struct_erect_start_month="Jul 2026",
            struct_erect_duration=4,
            
            misc_erect_hours=200.00,
            misc_erect_start_month="Aug 2026",
            misc_erect_duration=1
        )

        # 1. Total Tonnage = ton_steel (100) + ton_joist (20) = 120
        self.assertEqual(bid.total_tonnage, 120.00)

        # 2. Structural Pieces / Ton (Without Jst) = main_structural_pcs (500) / ton_steel (100) = 5.0
        self.assertEqual(bid.struct_pcs_per_ton, 5.0)

        # 3. Structural Cost / Ton = price_structure (150000) / ton_steel (100) = 1500.0
        self.assertEqual(bid.struct_cost_per_ton, 1500.0)

        # 4. Structural Tonnage / Sq. ft (Without Jst) = ton_steel (100) / sqft_structural (25000) = 0.004
        self.assertEqual(bid.struct_ton_per_sqft_no_joist, 0.004)

        # 5. Structural Tonnage / Sq. ft (With joist) = total_tonnage (120) / sqft_structural (25000) = 0.0048
        self.assertEqual(bid.struct_ton_per_sqft_with_joist, 0.0048)

        # 6. Structural Cost / Sq. ft = price_structure (150000) / sqft_structural (25000) = 6.0
        self.assertEqual(bid.struct_cost_per_sqft, 6.0)

        # 7. Structural Erection Cost / Sq. ft = price_struc_erection (50000) / sqft_structural (25000) = 2.0
        self.assertEqual(bid.struct_erect_cost_per_sqft, 2.0)

        # 8. Structural Erection Cost / Ton = price_struc_erection (50000) / total_tonnage (120) = 416.67
        self.assertAlmostEqual(float(bid.struct_erect_cost_per_ton), 416.66666667, places=2)

        # 9. Monthly Hours and End Months
        # Struct Fab: 1200 hours / 3 months = 400.0 avg hours/month
        self.assertEqual(bid.struct_fab_end_month, "July 2026")
        self.assertEqual(bid.avg_monthly_struct_fab_hours, 400.0)

        # Misc Fab: 400 hours / 2 months = 200.0 avg hours/month
        self.assertEqual(bid.misc_fab_end_month, "July 2026")
        self.assertEqual(bid.avg_monthly_misc_fab_hours, 200.0)

        # Struct Erect: 800 hours / 4 months = 200.0 avg hours/month
        self.assertEqual(bid.struct_erect_end_month, "October 2026")
        self.assertEqual(bid.avg_monthly_struct_erect_hours, 200.0)

        # Misc Erect: 200 hours / 1 month = 200.0 avg hours/month
        self.assertEqual(bid.misc_erect_end_month, "August 2026")
        self.assertEqual(bid.avg_monthly_misc_erect_hours, 200.0)


class BidEnquiryAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testestimator', email='test@sfe.com', password='password123')
        self.client.force_authenticate(user=self.user)
        self.customer1 = Customer.objects.create(name="Apex Builders", code="APX")
        self.customer2 = Customer.objects.create(name="Zenith Corp", code="ZEN")
        
        self.estimator1 = Employee.objects.create(
            emp_id="E01", name="Alice Smith", department="Bids", designation="Estimator", email="alice@sfe.com"
        )
        self.estimator2 = Employee.objects.create(
            emp_id="E02", name="Bob Jones", department="Bids", designation="Estimator", email="bob@sfe.com"
        )

        self.bid1 = BidEnquiry.objects.create(
            quote_no="Q-101",
            project_name="Project Alpha",
            customer_name=self.customer1,
            primary_estimator=self.estimator1,
            decision_to_bid="Bid",
            won_lost="Won",
            ton_steel=50,
            price_structure=60000
        )
        self.bid2 = BidEnquiry.objects.create(
            quote_no="Q-102",
            project_name="Project Beta",
            customer_name=self.customer2,
            primary_estimator=self.estimator2,
            decision_to_bid="No Bid",
            won_lost="Lost"
        )

        self.list_url = reverse('bid-enquiries-list')

    def test_get_bids_list(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 2)

    def test_filter_by_customer(self):
        response = self.client.get(self.list_url, {'customer_name': self.customer1.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['quote_no'], "Q-101")

    def test_filter_by_estimator(self):
        response = self.client.get(self.list_url, {'primary_estimator': self.estimator2.id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['quote_no'], "Q-102")

    def test_filter_by_won_lost(self):
        response = self.client.get(self.list_url, {'won_lost': 'Won'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['quote_no'], "Q-101")

    def test_filter_by_decision(self):
        response = self.client.get(self.list_url, {'decision_to_bid': 'No Bid'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['quote_no'], "Q-102")

    def test_create_bid_enquiry(self):
        data = {
            "quote_no": "Q-103",
            "project_name": "Project Gamma",
            "customer_name": self.customer1.id,
            "primary_estimator": self.estimator1.id,
            "ton_steel": 10.0,
            "ton_joist": 5.0,
            "price_structure": 30000.00,
            "sqft_structural": 5000.0
        }
        response = self.client.post(self.list_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify db record creation and calculations
        bid = BidEnquiry.objects.get(quote_no="Q-103")
        self.assertEqual(bid.total_tonnage, 15.0)
        self.assertEqual(bid.struct_cost_per_ton, 3000.0)
        self.assertEqual(bid.struct_cost_per_sqft, 6.0)

    def test_update_bid_enquiry(self):
        detail_url = reverse('bid-enquiries-detail', args=[self.bid1.id])
        data = {
            "quote_no": "Q-101",
            "project_name": "Project Alpha Renovated",
            "ton_steel": 80.0,  # update structural tonnage from 50 to 80
            "price_structure": 96000.00
        }
        response = self.client.put(detail_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.bid1.refresh_from_db()
        self.assertEqual(self.bid1.project_name, "Project Alpha Renovated")
        self.assertEqual(self.bid1.ton_steel, 80.0)
        # Check calculation updated accordingly: 96000 / 80 = 1200
        self.assertEqual(self.bid1.struct_cost_per_ton, 1200.0)

    def test_delete_bid_enquiry(self):
        detail_url = reverse('bid-enquiries-detail', args=[self.bid2.id])
        response = self.client.delete(detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(BidEnquiry.objects.filter(quote_no="Q-102").exists())

