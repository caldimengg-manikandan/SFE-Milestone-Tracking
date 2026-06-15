from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count  # type: ignore
from employees.models import Employee
from projects.models import Project, StructuralScheduleItem
from production.models import ProductionPriorityItem, ProductionItem, ProductionSchedule, Capacity
from django.utils import timezone  # type: ignore
from datetime import timedelta
from .models import Announcement

colors = {
    'Planning': '#fbbf24',
    'In Progress': '#2563eb',
    'Completed': '#10b981',
    'Delayed': '#ef4444',
    'On Hold': '#64748b',
    'PLATE': '#f59e0b',
    'ANGLE': '#6366f1',
    'STRUCTURAL': '#10b981',
}

class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # 1. Basic Stats
        total_projects = Project.objects.count()
        active_projects = Project.objects.filter(status='In Progress').count()
        
        # Efficiency rate - for now, let's calculate based on completed vs total priority items
        total_jobs = ProductionPriorityItem.objects.count()
        completed_jobs = ProductionPriorityItem.objects.filter(is_complete=True).count()
        efficiency_rate = (completed_jobs / total_jobs * 100) if total_jobs > 0 else 0

        # 2. Gantt Chart Data (Production Throughput)
        year = request.query_params.get('year') or '2026'
        gantt_tasks = []
        months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

        COLOR_PALETTE = ['#f59e0b', '#6366f1', '#10b981', '#ef4444', '#8b5cf6', '#14b8a6', '#ec4899', '#3b82f6']
        
        schedules = ProductionSchedule.objects.all().order_by('schedule_number')
        for idx, schedule in enumerate(schedules):
            start_date = schedule.start_date
            end_date = schedule.end_date
            
            # Find boundaries from items if start_date or end_date is null
            if not start_date or not end_date:
                item_dates = []
                for item in schedule.items.all():
                    if item.rts_date:
                        item_dates.append(item.rts_date)
                    if item.ship_date:
                        item_dates.append(item.ship_date)
                if item_dates:
                    if not start_date:
                        start_date = min(item_dates)
                    if not end_date:
                        end_date = max(item_dates)
            
            # Fallback if still null
            if not start_date:
                try:
                    start_date = timezone.now().date()
                except:
                    import datetime
                    start_date = datetime.date.today()
            if not end_date:
                end_date = start_date + timedelta(days=90)
                
            start_month = start_date.month - 1
            duration = max(1, (end_date.year - start_date.year) * 12 + end_date.month - start_date.month + 1)
            
            color = COLOR_PALETTE[idx % len(COLOR_PALETTE)]
            
            schedule_items = []
            for item in schedule.items.all():
                ofa_date = None
                erection_date = None
                item_start = None
                item_end = None
                plant_lead_time_weeks = 0
                project_name = item.job_number
                
                try:
                    project = Project.objects.filter(code=item.job_number).first()
                    if project:
                        project_name = project.name
                except:
                    pass
                    
                rts_date = None
                try:
                    struct_item = StructuralScheduleItem.objects.filter(
                        project__code=item.job_number, 
                        seq_no=item.sequence_number
                    ).first()
                    if struct_item:
                        plant_lead_time_weeks = struct_item.shop_lead_time_weeks or 0
                        if struct_item.rts_date:
                            rts_date = struct_item.rts_date
                except:
                    pass

                # If no struct_item or no struct_item.rts_date, fall back to production item rts_date
                if not rts_date:
                    rts_date = item.rts_date

                # Only if we have a valid RTS date, calculate start and end dates
                if rts_date:
                    item_start = rts_date.isoformat()
                    # Exp. completion is rts_date + lead_time_weeks * 7
                    lead_weeks = plant_lead_time_weeks if plant_lead_time_weeks > 0 else 1
                    item_end = (rts_date + timedelta(days=lead_weeks * 7)).isoformat()
                else:
                    item_start = None
                    item_end = None

                schedule_items.append({
                    'job_number': item.job_number,
                    'project_name': project_name,
                    'sequence_number': item.sequence_number,
                    'weight': str(item.weight) if item.weight else '0.00',
                    'quantity': item.quantity,
                    'ofa_date': None,
                    'erection_date': None,
                    'rts_date': rts_date.isoformat() if rts_date else None,
                    'ship_date': item.ship_date.isoformat() if item.ship_date else None,
                    'start_date': item_start,
                    'end_date': item_end,
                    'plant_lead_time_weeks': plant_lead_time_weeks,
                    'notes': item.notes,
                })

            gantt_tasks.append({
                'id': schedule.id,
                'name': schedule.schedule_number,
                'startDate': start_date.isoformat(),
                'endDate': end_date.isoformat(),
                'startMonth': start_month,
                'duration': duration,
                'color': color,
                'priority': 'High',
                'items': schedule_items
            })

        # 3. Inventory Status (Using Project statuses)
        project_stats = Project.objects.values('status').annotate(count=Count('id'))
        pie_data = []
        
        status_map = {
            'Planning': 'Pending',
            'In Progress': 'In Progress',
            'Completed': 'Completed',
            'On Hold': 'On Hold',
            'Delayed': 'Delayed'
        }

        for stat in project_stats:
            ui_status = status_map.get(stat['status'], stat['status'])
            pie_data.append({
                'name': ui_status,
                'value': stat['count'],
                'color': colors.get(stat['status'], '#94a3b8')
            })

        if not pie_data:
            pie_data = [
                {'name': 'Pending', 'value': 2, 'color': colors['Planning']},
                {'name': 'In Progress', 'value': 3, 'color': colors['In Progress']},
                {'name': 'Completed', 'value': 1, 'color': colors['Completed']},
            ]

        # 4. plant Capacity Loading
        from django.db.models import Sum, Q  # type: ignore
        
        cap_month_param = request.query_params.get('capacity_month')
        cap_year_param = request.query_params.get('capacity_year')
        
        # Default to current month and year
        if not cap_month_param or not cap_year_param:
            now = timezone.now()
            if not cap_month_param:
                cap_month_param = now.month
            if not cap_year_param:
                cap_year_param = now.year
                
        try:
            cap_month = int(cap_month_param)
            cap_year = int(cap_year_param)
        except (ValueError, TypeError):
            now = timezone.now()
            cap_month = now.month
            cap_year = now.year

        from production.models import Manpower
        from apps.rfq.models import RFQMaster

        months_names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        months_short = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        
        won_rfqs = RFQMaster.objects.filter(won_lost='Won', deleted_at__isnull=True)
        tonnage_year = request.query_params.get('tonnage_year') or year
        try:
            t_year = int(tonnage_year)
        except Exception:
            t_year = 2026

        include_saturdays = request.query_params.get('include_saturdays') == 'true'
        saturdays_month = request.query_params.get('saturdays_month', 'All')
        include_sundays = request.query_params.get('include_sundays') == 'true'
        sundays_month = request.query_params.get('sundays_month', 'All')

        import datetime
        year_start = datetime.date(t_year, 1, 1)
        year_end = datetime.date(t_year, 12, 31)

        schedules_for_tonnage = ProductionSchedule.objects.filter(
            start_date__isnull=False,
            end_date__isnull=False,
            start_date__lte=year_end,
            end_date__gte=year_start
        )
        # Calculate dynamic tonnage capacity from the Capacity configuration module
        total_monthly_capacity = sum(float(c.rate_per_month or 0) for c in Capacity.objects.all())
        if total_monthly_capacity <= 0:
            total_monthly_capacity = 33500.0  # Fallback default
            
        manpower_entries = Manpower.objects.all()

        def is_schedule_active_in_month(start_month_date, duration_months, target_month_idx):
            if not start_month_date or not duration_months or duration_months < 1:
                return False
            start_month_idx = start_month_date.month - 1  # 0-indexed month
            active_indices = [(start_month_idx + i) % 12 for i in range(int(duration_months))]
            return target_month_idx in active_indices

        bar_data = []
        for idx, (m_name, m_short) in enumerate(zip(months_names, months_short)):
            # 1. Available Manhours for this month
            m_manpower = manpower_entries.filter(month__iexact=m_name)
            available_hours = 0.0
            for item in m_manpower:
                mh = float(item.manhours) if item.manhours is not None else 8.0
                ot = float(item.overtime) if item.overtime is not None else 0.0
                available_hours += (mh + ot) * 20.0
                
            # 2. Required Manhours breakdown for this month
            struct_fab = 0.0
            misc_fab = 0.0
            struct_erect = 0.0
            misc_erect = 0.0
            
            for r in won_rfqs:
                # Phase 1: Struct Fab
                if is_schedule_active_in_month(r.struct_fab_start_month, r.struct_fab_duration_months, idx):
                    hrs = float(r.struct_fab_hours or 0)
                    dur = float(r.struct_fab_duration_months or 0)
                    struct_fab += hrs / dur if dur > 0 else hrs
                # Phase 2: Misc Fab
                if is_schedule_active_in_month(r.misc_fab_start_month, r.misc_fab_duration_months, idx):
                    hrs = float(r.misc_fab_hours or 0)
                    dur = float(r.misc_fab_duration_months or 0)
                    misc_fab += hrs / dur if dur > 0 else hrs
                # Phase 3: Struct Erect
                if is_schedule_active_in_month(r.struct_erect_start_month, r.struct_erect_duration_months, idx):
                    hrs = float(r.struct_erect_hours or 0)
                    dur = float(r.struct_erect_duration_months or 0)
                    struct_erect += hrs / dur if dur > 0 else hrs
                # Phase 4: Misc Erect
                if is_schedule_active_in_month(r.misc_erect_start_month, r.misc_erect_duration_months, idx):
                    hrs = float(r.misc_erect_hours or 0)
                    dur = float(r.misc_erect_duration_months or 0)
                    misc_erect += hrs / dur if dur > 0 else hrs

            required_hours = struct_fab + misc_fab + struct_erect + misc_erect
            remaining = available_hours - required_hours
            
            # Tonnage by month based on ProductionSchedule items' RTS dates
            struct_ton = 0.0
            joist_ton = 0.0
            for schedule in schedules_for_tonnage:
                for item in schedule.items.all():
                    # Resolve RTS date and category from ProductionItem and StructuralScheduleItem
                    struct_item = StructuralScheduleItem.objects.filter(
                        project__code=item.job_number,
                        seq_no=item.sequence_number
                    ).first()
                    
                    item_rts = item.rts_date
                    if not item_rts and struct_item:
                        item_rts = struct_item.actual_rts_date or struct_item.rts_date
                    
                    if item_rts and item_rts.year == t_year and item_rts.month == (idx + 1):
                        is_joist = False
                        if struct_item and struct_item.category and 'joist' in struct_item.category.lower():
                            is_joist = True
                        
                        item_w = float(item.weight or 0)
                        if is_joist:
                            joist_ton += item_w
                        else:
                            struct_ton += item_w
            
            # Calculate dynamic tonnage capacity for this specific month from Capacity configuration module
            import calendar
            import datetime
            days_in_month = calendar.monthrange(t_year, idx + 1)[1]
            
            # Check if Saturdays/Sundays should be included as working days for this month
            sats_months_list = [x.strip().lower() for x in saturdays_month.split(',') if x.strip()]
            suns_months_list = [x.strip().lower() for x in sundays_month.split(',') if x.strip()]

            include_sats_for_this_month = include_saturdays and (
                'all' in sats_months_list or 
                m_name.lower() in sats_months_list or 
                m_short.lower() in sats_months_list
            )
            include_suns_for_this_month = include_sundays and (
                'all' in suns_months_list or 
                m_name.lower() in suns_months_list or 
                m_short.lower() in suns_months_list
            )
            
            working_days_in_month = 0
            for day in range(1, days_in_month + 1):
                day_of_week = datetime.date(t_year, idx + 1, day).weekday()
                if day_of_week == 5: # Saturday
                    if include_sats_for_this_month:
                        working_days_in_month += 1
                elif day_of_week == 6: # Sunday
                    if include_suns_for_this_month:
                        working_days_in_month += 1
                else: # Mon-Fri
                    working_days_in_month += 1

            month_capacity = 0.0
            for c in Capacity.objects.all():
                c_months = [m.strip().lower() for m in (getattr(c, 'months', '') or '').split(',') if m.strip()]
                if not c_months or m_name.lower() in c_months:
                    day_cap = float(c.capacity_per_day or c.rate_per_day or 0)
                    month_capacity += day_cap * working_days_in_month


            bar_data.append({
                'name': m_short,
                'capacity': round(available_hours, 2),
                'allocated': round(required_hours, 2),
                'remaining': round(remaining, 2),
                'struct_fab': round(struct_fab, 2),
                'misc_fab': round(misc_fab, 2),
                'struct_erect': round(struct_erect, 2),
                'misc_erect': round(misc_erect, 2),
                'struct_ton': round(struct_ton, 2),
                'joist_ton': round(joist_ton, 2),
                'total_ton': round(struct_ton + joist_ton, 2),
                'tonnage_capacity': round(month_capacity, 2)
            })

        # Calculate totals for Tonnage Loading Summary from RFQ Master for the selected year
        year_prefix = str(t_year)[-2:]
        rfqs_for_year = RFQMaster.objects.filter(
            won_lost='Won',
            deleted_at__isnull=True,
            quote_no__startswith=year_prefix
        )
        total_won_structural_tonnage = sum(float(r.ton_steel or 0) for r in rfqs_for_year)
        total_won_joist_tonnage = sum(float(r.ton_joist or 0) for r in rfqs_for_year)
        total_won_tonnage = total_won_structural_tonnage + total_won_joist_tonnage


        # 5. Recent Activities (Recent Projects)
        recent_activities = []
        latest_projects = Project.objects.order_by('-created_at')[:6]
        for proj in latest_projects:
            recent_activities.append({
                'id': proj.id,
                'action': f"Project: {proj.name}",
                'project': f"Code: {proj.code}",
                'user': 'Admin',
                'time': proj.created_at.strftime('%b %d, %I:%M %p') if proj.created_at.date() < timezone.now().date() else proj.created_at.strftime('%I:%M %p'),
                'type': 'success'
            })

        if not recent_activities:
            recent_activities = [
                {'id': 1, 'action': 'Job #A104 Completed', 'project': 'Seq: 12', 'user': 'System', 'time': '10:56 AM', 'type': 'success'},
                {'id': 2, 'action': 'Job #B210 Started', 'project': 'Seq: 07', 'user': 'System', 'time': '11:20 AM', 'type': 'info'},
                {'id': 3, 'action': 'Job #C335 Updated', 'project': 'Seq: 04', 'user': 'System', 'time': '12:05 PM', 'type': 'warning'},
                {'id': 4, 'action': 'Job #D420 Scheduled', 'project': 'Seq: 09', 'user': 'System', 'time': '01:15 PM', 'type': 'info'},
            ]

        in_progress = Project.objects.filter(status='In Progress').count()
        yet_to_start = Project.objects.filter(status='Yet to Start').count()
        completed = Project.objects.filter(status='Completed').count()

        # Fetch active announcements
        from django.utils.timezone import localdate  # type: ignore
        from .models import Announcement
        today = localdate()
        active_announcements = Announcement.objects.filter(
            from_date__lte=today,
            to_date__gte=today,
            is_active=True
        )
        
        announcements_list = []
        for ann in active_announcements:
            time_left = ann.to_date - today
            priority = 'high' if time_left.days <= 1 else 'medium'
            announcements_list.append({
                'id': ann.id,
                'title': ann.title,
                'message': ann.message,
                'from_date': str(ann.from_date),
                'to_date': str(ann.to_date),
                'priority': priority
            })

        return Response({
            'stats': [
                {'label': 'Total Projects', 'value': str(total_projects), 'change': '+0', 'up': True},
                {'label': 'In Progress', 'value': str(in_progress), 'change': '+0', 'up': True},
                {'label': 'Yet to Start', 'value': str(yet_to_start), 'change': '+0', 'up': True},
                {'label': 'Completed', 'value': str(completed), 'change': '+0', 'up': True},
            ],
            'ganttData': {
                'tasks': gantt_tasks,
                'months': months
            },
            'pieData': pie_data,
            'barData': bar_data,
            'recentActivities': recent_activities,
            'announcements': announcements_list,
            'total_won_tonnage': round(total_won_tonnage, 2),
            'total_won_structural_tonnage': round(total_won_structural_tonnage, 2),
            'total_won_joist_tonnage': round(total_won_joist_tonnage, 2)
        })


from rest_framework import viewsets, permissions
from .serializers import AnnouncementSerializer

class IsAdminOrManagerOrReadOnly(permissions.BasePermission):
    """Allow GET/safe methods for all authenticated users, restrict write methods to admin/manager."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return (
            request.user 
            and request.user.is_authenticated 
            and request.user.role in ['admin', 'manager']
        )

class AnnouncementViewSet(viewsets.ModelViewSet):
    queryset = Announcement.objects.all()
    serializer_class = AnnouncementSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
