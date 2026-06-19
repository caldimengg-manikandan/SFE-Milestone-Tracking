"""
Dashboard API views — 5 endpoints matching Excel dashboard sheets.
Rewritten using Django ORM & Python logic to support SQLite fallback.
"""
import re
import datetime
from dateutil.relativedelta import relativedelta
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.rfq.models import RFQMaster, MonthlyBidGoal


def safe_float(val):
    if val is None:
        return None
    try:
        f = float(val)
        return None if f != f else round(f, 4)
    except (TypeError, ValueError):
        return None


def get_months():
    return [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ]


class BidPerformanceDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        current_year = timezone.now().year
        months = get_months()
        
        rows_map = {}
        for y in range(current_year - 4, current_year + 1):
            for i, m in enumerate(months, start=1):
                rows_map[(y, i)] = {
                    'month': m, 'mo_num': i, 'year': y,
                    'total_bids': 0, 'total_bid_amount': 0.0,
                    'won_count': 0, 'won_amount': 0.0,
                    'win_ratio_count_pct': None, 'win_ratio_dollar_pct': None,
                }
                
        bids = RFQMaster.objects.filter(deleted_at__isnull=True)
        for bid in bids:
            q = bid.quote_no or ''
            
            # 1. Submitted Bids Logic
            if bid.quote_date and bid.decision_to_bid in ('Yes', 'Bid'):
                is_first_bid = False
                if re.search(r'^\d{2}-\d{2}-\d+[^R]', q):
                    is_first_bid = True
                elif 'R' not in q:
                    is_first_bid = True
                    
                if is_first_bid:
                    y, m = bid.quote_date.year, bid.quote_date.month
                    if (y, m) in rows_map:
                        rows_map[(y, m)]['total_bids'] += 1
                        rows_map[(y, m)]['total_bid_amount'] += safe_float(bid.bid_amount) or 0.0

            # 2. Won Bids Logic
            if bid.won_lost == 'Won' and bid.awarded_job_date:
                if not re.search(r'\d{2}-\d{2}-\d+R', q):
                    wy, wm = bid.awarded_job_date.year, bid.awarded_job_date.month
                    if (wy, wm) in rows_map:
                        rows_map[(wy, wm)]['won_count'] += 1
                        rows_map[(wy, wm)]['won_amount'] += safe_float(bid.awarded_amount) or safe_float(bid.bid_amount) or 0.0

        for key, row in rows_map.items():
            if row['total_bids'] > 0:
                row['win_ratio_count_pct'] = safe_float(row['won_count'] / row['total_bids'] * 100)
            if row['total_bid_amount'] > 0:
                row['win_ratio_dollar_pct'] = safe_float(row['won_amount'] / row['total_bid_amount'] * 100)

        rows = [rows_map[k] for k in sorted(rows_map.keys())]
        return Response({'data': rows, 'current_year': current_year})


class DollarDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        current_year = timezone.now().year
        months = get_months()
        
        rows_map = {}
        for y in range(current_year - 4, current_year + 1):
            for i, m in enumerate(months, start=1):
                rows_map[(y, i)] = {
                    'month': m, 'mo_num': i, 'year': y,
                    'monthly_goal': 2000000.0,
                    'amount_bid': 0.0,
                    'amount_awarded': 0.0,
                    'quoted_profit_awarded': 0.0,
                }
                
        # Apply configured goals — auto-creating missing months so they all have IDs in the DB
        for y in range(current_year - 4, current_year + 1):
            for i in range(1, 13):
                g, _ = MonthlyBidGoal.objects.get_or_create(
                    year=y, month=i,
                    defaults={'goal': 2000000}
                )
                if (y, i) in rows_map:
                    rows_map[(y, i)]['monthly_goal'] = safe_float(g.goal)
                    rows_map[(y, i)]['id'] = g.id

        bids = RFQMaster.objects.filter(deleted_at__isnull=True)
        for bid in bids:
            if bid.quote_date:
                y, m = bid.quote_date.year, bid.quote_date.month
                if (y, m) in rows_map:
                    rows_map[(y, m)]['amount_bid'] += safe_float(bid.bid_amount) or 0.0
                    
            if bid.won_lost == 'Won' and bid.awarded_job_date:
                wy, wm = bid.awarded_job_date.year, bid.awarded_job_date.month
                if (wy, wm) in rows_map:
                    rows_map[(wy, wm)]['amount_awarded'] += safe_float(bid.awarded_amount) or safe_float(bid.bid_amount) or 0.0
                    rows_map[(wy, wm)]['quoted_profit_awarded'] += safe_float(bid.quoted_profit) or 0.0

        rows = [rows_map[k] for k in sorted(rows_map.keys())]
        return Response({'data': rows, 'current_year': current_year})


class JobAnalyticsDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        current_year = timezone.now().year
        months = get_months()
        
        rows_map = {}
        for y in range(current_year - 4, current_year + 1):
            for i, m in enumerate(months, start=1):
                rows_map[(y, i)] = {
                    'month': m, 'mo_num': i, 'year': y,
                    'sum_cost_ton': 0.0, 'count_ton': 0,
                    'sum_cost_sqft': 0.0, 'count_sqft': 0,
                }
                
        bids = RFQMaster.objects.filter(deleted_at__isnull=True, won_lost='Won', awarded_job_date__isnull=False)
        for bid in bids:
            y, m = bid.awarded_job_date.year, bid.awarded_job_date.month
            if (y, m) not in rows_map:
                continue
                
            ps = safe_float(bid.price_structure)
            if ps is not None:
                ts = safe_float(bid.ton_steel)
                if ts and ts > 0:
                    rows_map[(y, m)]['sum_cost_ton'] += (ps / ts)
                    rows_map[(y, m)]['count_ton'] += 1
                    
                sq = safe_float(bid.sq_ft_structural)
                if sq and sq > 0:
                    rows_map[(y, m)]['sum_cost_sqft'] += (ps / sq)
                    rows_map[(y, m)]['count_sqft'] += 1

        rows = []
        for k in sorted(rows_map.keys()):
            r = rows_map[k]
            avg_ton = safe_float(r['sum_cost_ton'] / r['count_ton']) if r['count_ton'] > 0 else None
            avg_sqft = safe_float(r['sum_cost_sqft'] / r['count_sqft']) if r['count_sqft'] > 0 else None
            rows.append({
                'month': r['month'],
                'mo_num': r['mo_num'],
                'year': r['year'],
                'avg_cost_per_ton': avg_ton,
                'avg_cost_per_sqft': avg_sqft,
            })
            
        return Response({'data': rows, 'current_year': current_year})


class SalesCycleDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = RFQMaster.objects.filter(
            deleted_at__isnull=True,
            won_lost='Won',
            sfe_job_no__isnull=False
        )
        year = request.query_params.get('year')
        if year:
            qs = qs.filter(awarded_job_date__year=int(year))
            
        qs = qs.order_by('sfe_job_no')
        
        rows = []
        for bid in qs:
            qd = bid.quote_date
            ad = bid.awarded_job_date
            cd = bid.contract_executed_date
            fd = bid.fabrication_start_date
            
            rows.append({
                'sfe_job_no': bid.sfe_job_no,
                'quote_no': bid.quote_no,
                'project_name': bid.project_name,
                'customer_id': bid.customer_id,
                'date_of_first_quote': qd,
                'awarded_job_date': ad,
                'contract_executed_date': cd,
                'fabrication_start_date': fd,
                'days_quote_to_awarded': (ad - qd).days if ad and qd else None,
                'days_quote_to_contract': (cd - qd).days if cd and qd else None,
                'days_quote_to_fab_start': (fd - qd).days if fd and qd else None,
                'days_awarded_to_fab': (fd - ad).days if fd and ad else None,
                'bid_amount': safe_float(bid.bid_amount),
                'awarded_amount': safe_float(bid.awarded_amount) or safe_float(bid.bid_amount),
            })
            
        return Response({'data': rows})


class BidEstimationSummaryView(APIView):
    """
    Groups RFQ records by the year prefix embedded in quote_no (format: YY-MM-SEQ).
    Returns per-year counts: total_quoted, total_won, total_lost, total_pending
    and the total awarded/bid amount for won quotes.
    Used to drive the Bid & Estimation Dashboard year-over-year bar chart.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        import re as _re
        current_year_2d = timezone.now().year % 100  # e.g. 26 for 2026

        # Build a dict keyed by 2-digit year (int)
        year_data = {}

        bids = RFQMaster.objects.filter(deleted_at__isnull=True)
        for bid in bids:
            q = bid.quote_no or ''
            m = _re.match(r'^(\d{2})-', q)
            if not m:
                continue
            yy = int(m.group(1))  # e.g. 26
            full_year = 2000 + yy  # e.g. 2026

            if yy not in year_data:
                year_data[yy] = {
                    'year_prefix': yy,
                    'year': full_year,
                    'total_quoted': 0,
                    'total_won': 0,
                    'total_lost': 0,
                    'total_pending': 0,
                    'total_won_amount': 0.0,
                    'total_bid_amount': 0.0,
                }

            year_data[yy]['total_quoted'] += 1
            year_data[yy]['total_bid_amount'] += safe_float(bid.bid_amount) or 0.0

            wl = bid.won_lost or 'Pending'
            if wl == 'Won':
                year_data[yy]['total_won'] += 1
                year_data[yy]['total_won_amount'] += (
                    safe_float(bid.awarded_amount) or safe_float(bid.bid_amount) or 0.0
                )
            elif wl == 'Lost':
                year_data[yy]['total_lost'] += 1
            else:
                year_data[yy]['total_pending'] += 1

        # Sort by year ascending
        rows = [year_data[yy] for yy in sorted(year_data.keys())]

        # Overall summary stats
        all_bids = list(bids)
        total_all  = len(all_bids)
        total_won  = sum(1 for b in all_bids if b.won_lost == 'Won')
        total_lost = sum(1 for b in all_bids if b.won_lost == 'Lost')
        total_pend = sum(1 for b in all_bids if b.won_lost not in ('Won', 'Lost'))

        # Current year stats (by quote_no prefix)
        cy_row = year_data.get(current_year_2d, {})
        current_year_won = cy_row.get('total_won', 0)
        current_year_won_amount = cy_row.get('total_won_amount', 0.0)

        return Response({
            'data': rows,
            'summary': {
                'total': total_all,
                'total_won': total_won,
                'total_lost': total_lost,
                'total_pending': total_pend,
                'current_year': 2000 + current_year_2d,
                'current_year_won': current_year_won,
                'current_year_won_amount': round(current_year_won_amount, 2),
            }
        })


class FutureCapacityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Generate 18 months starting from current month
        today = timezone.now().date()
        start_month = today.replace(day=1)
        
        months_series = []
        for i in range(18):
            months_series.append(start_month + relativedelta(months=i))
            
        rows_map = {
            cm: {
                'cap_month': str(cm),
                'offset': i,
                'struct_fab_potential': 0.0,
                'struct_fab_confirmed': 0.0,
                'misc_fab_potential': 0.0,
                'misc_fab_confirmed': 0.0,
                'struct_erect_potential': 0.0,
                'struct_erect_confirmed': 0.0,
                'misc_erect_potential': 0.0,
                'misc_erect_confirmed': 0.0,
            }
            for i, cm in enumerate(months_series)
        }
        
        bids = RFQMaster.objects.filter(deleted_at__isnull=True).exclude(won_lost='Lost')
        for bid in bids:
            won = (bid.won_lost == 'Won')
            
            # Struct Fab
            if bid.struct_fab_start_month and bid.struct_fab_duration_months and bid.struct_fab_duration_months > 0:
                hours_per_month = safe_float(bid.struct_fab_hours) or 0.0
                hours_per_month /= bid.struct_fab_duration_months
                for i in range(bid.struct_fab_duration_months):
                    m = (bid.struct_fab_start_month + relativedelta(months=i)).replace(day=1)
                    if m in rows_map:
                        if won:
                            rows_map[m]['struct_fab_confirmed'] += hours_per_month
                        else:
                            rows_map[m]['struct_fab_potential'] += hours_per_month

            # Misc Fab
            if bid.misc_fab_start_month and bid.misc_fab_duration_months and bid.misc_fab_duration_months > 0:
                hours_per_month = safe_float(bid.misc_fab_hours) or 0.0
                hours_per_month /= bid.misc_fab_duration_months
                for i in range(bid.misc_fab_duration_months):
                    m = (bid.misc_fab_start_month + relativedelta(months=i)).replace(day=1)
                    if m in rows_map:
                        if won:
                            rows_map[m]['misc_fab_confirmed'] += hours_per_month
                        else:
                            rows_map[m]['misc_fab_potential'] += hours_per_month

            # Struct Erect
            if bid.struct_erect_start_month and bid.struct_erect_duration_months and bid.struct_erect_duration_months > 0:
                hours_per_month = safe_float(bid.struct_erect_hours) or 0.0
                hours_per_month /= bid.struct_erect_duration_months
                for i in range(bid.struct_erect_duration_months):
                    m = (bid.struct_erect_start_month + relativedelta(months=i)).replace(day=1)
                    if m in rows_map:
                        if won:
                            rows_map[m]['struct_erect_confirmed'] += hours_per_month
                        else:
                            rows_map[m]['struct_erect_potential'] += hours_per_month

            # Misc Erect
            if bid.misc_erect_start_month and bid.misc_erect_duration_months and bid.misc_erect_duration_months > 0:
                hours_per_month = safe_float(bid.misc_erect_hours) or 0.0
                hours_per_month /= bid.misc_erect_duration_months
                for i in range(bid.misc_erect_duration_months):
                    m = (bid.misc_erect_start_month + relativedelta(months=i)).replace(day=1)
                    if m in rows_map:
                        if won:
                            rows_map[m]['misc_erect_confirmed'] += hours_per_month
                        else:
                            rows_map[m]['misc_erect_potential'] += hours_per_month
                            
        rows = [rows_map[cm] for cm in months_series]
        return Response({'data': rows})
