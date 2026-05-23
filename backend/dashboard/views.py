from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count
from employees.models import Employee
from projects.models import Project, StructuralScheduleItem
from production.models import ProductionPriorityItem, ProductionItem, ProductionSchedule, Capacity
from django.utils import timezone
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
        year = request.query_params.get('year')
        schedules = ProductionSchedule.objects.all()
        if year:
            schedules = schedules.filter(start_date__year=year)
        schedules = schedules.order_by('start_date')
        gantt_tasks = []
        months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        color_palette = ['#f59e0b', '#6366f1', '#10b981', '#ef4444', '#8b5cf6', '#14b8a6']

        if schedules.exists():
            for idx, schedule in enumerate(schedules):
                if schedule.start_date and schedule.end_date:
                    start_month = schedule.start_date.month - 1
                    duration = (schedule.end_date.year - schedule.start_date.year) * 12 + (schedule.end_date.month - schedule.start_date.month) + 1
                    items_data = []
                    for item in schedule.items.all():
                        ofa_date = None
                        erection_date = None
                        start_date = None
                        end_date = None
                        shop_lead_time_weeks = 0
                        project_name = item.job_number
                        try:
                            project = Project.objects.filter(code=item.job_number).first()
                            if project:
                                project_name = project.name
                        except:
                            pass
                        try:
                            # Link to StructuralScheduleItem via job_number (code) and sequence_number
                            struct_item = StructuralScheduleItem.objects.filter(
                                project__code=item.job_number, 
                                seq_no=item.sequence_number
                            ).first()
                            if struct_item:
                                ofa_date = struct_item.scheduled_ofa_date.isoformat() if struct_item.scheduled_ofa_date else None
                                erection_date = struct_item.scheduled_erection_date.isoformat() if struct_item.scheduled_erection_date else None
                                shop_lead_time_weeks = struct_item.shop_lead_time_weeks
                                if struct_item.rts_date:
                                    start_date = struct_item.rts_date.isoformat()
                                    end_date = (struct_item.rts_date + timedelta(days=struct_item.shop_lead_time_weeks * 7)).isoformat()
                                else:
                                    start_date = ofa_date
                                    end_date = erection_date
                        except:
                            pass

                        if not start_date:
                            start_date = item.rts_date.isoformat() if item.rts_date else ofa_date
                        if not end_date:
                            end_date = item.ship_date.isoformat() if item.ship_date else erection_date

                        items_data.append({
                            'job_number': item.job_number,
                            'project_name': project_name,
                            'sequence_number': item.sequence_number,
                            'weight': str(item.weight) if item.weight else '0.00',
                            'quantity': item.quantity,
                            'ofa_date': ofa_date,
                            'erection_date': erection_date,
                            'rts_date': item.rts_date.isoformat() if item.rts_date else None,
                            'ship_date': item.ship_date.isoformat() if item.ship_date else None,
                            'start_date': start_date,
                            'end_date': end_date,
                            'shop_lead_time_weeks': shop_lead_time_weeks,
                            'notes': item.notes,
                        })

                    gantt_tasks.append({
                        'id': schedule.id,
                        'name': schedule.schedule_number,
                        'startDate': schedule.start_date.isoformat() if schedule.start_date else None,
                        'endDate': schedule.end_date.isoformat() if schedule.end_date else None,
                        'startMonth': start_month,
                        'duration': max(1, duration),
                        'color': color_palette[idx % len(color_palette)],
                        'priority': 'High' if schedule.items.count() > 5 else 'Medium',
                        'items': items_data
                    })
            if len(gantt_tasks) < 3:
                extras = [
                    {'name': 'Skyline', 'startMonth': 0, 'duration': 2, 'startDate': f"{year}-01-01", 'endDate': f"{year}-02-28", 'color': '#f59e0b', 'priority': 'High'},
                    {'name': 'Metroline', 'startMonth': 4, 'duration': 2, 'startDate': f"{year}-05-01", 'endDate': f"{year}-06-30", 'color': '#6366f1', 'priority': 'Medium'},
                    {'name': 'Harbor Link', 'startMonth': 6, 'duration': 3, 'startDate': f"{year}-07-01", 'endDate': f"{year}-09-30", 'color': '#10b981', 'priority': 'High'},
                ]
                for extra in extras[:max(0, 3 - len(gantt_tasks))]:
                    gantt_tasks.append(extra)
        else:
            # Try using projects if no production schedules exist
            project_timelines = Project.objects.filter(erection_date__isnull=False)
            if year:
                project_timelines = project_timelines.filter(erection_date__year=year)
            project_timelines = project_timelines.order_by('created_at')
            if project_timelines.exists():
                for idx, project in enumerate(project_timelines):
                    # Try to get overall range from schedules
                    struct_schedules = project.structural_schedules.all()
                    start_date = None
                    end_date = None
                    
                    if struct_schedules.exists():
                        ofa_dates = [s.scheduled_ofa_date for s in struct_schedules if s.scheduled_ofa_date]
                        erection_dates = [s.scheduled_erection_date for s in struct_schedules if s.scheduled_erection_date]
                        if ofa_dates:
                            start_date = min(ofa_dates)
                        if erection_dates:
                            end_date = max(erection_dates)

                    # Fallbacks if no schedules or dates
                    if not start_date:
                        start_date = project.created_at.date()
                    if not end_date:
                        end_date = project.erection_date or start_date

                    if start_date and end_date:
                        start_month = start_date.month - 1
                        duration = (end_date.year - start_date.year) * 12 + (end_date.month - start_date.month) + 1
                        gantt_tasks.append({
                            'id': project.id,
                            'name': project.name,
                            'startDate': start_date.isoformat() if start_date else None,
                            'endDate': end_date.isoformat() if end_date else None,
                            'startMonth': start_month,
                            'duration': max(1, duration),
                            'color': color_palette[idx % len(color_palette)],
                            'priority': 'High' if project.total_ton > 100 else 'Medium'
                        })
                if len(gantt_tasks) < 3:
                    gantt_tasks.extend([
                        {'name': 'Skyline', 'startMonth': 0, 'duration': 2, 'startDate': f"{year}-01-01", 'endDate': f"{year}-02-28", 'color': '#f59e0b', 'priority': 'High'},
                        {'name': 'Metroline', 'startMonth': 4, 'duration': 2, 'startDate': f"{year}-05-01", 'endDate': f"{year}-06-30", 'color': '#6366f1', 'priority': 'Medium'},
                    ][:max(0, 3 - len(gantt_tasks))])
            else:
                gantt_tasks = [
                    {'name': 'Commercial Hub Structure', 'startMonth': 0, 'duration': 3, 'startDate': f"{year}-01-01", 'endDate': f"{year}-03-31", 'color': '#f59e0b', 'priority': 'High'},
                    {'name': 'Industrial Warehouse Exp', 'startMonth': 3, 'duration': 4, 'startDate': f"{year}-04-01", 'endDate': f"{year}-07-31", 'color': '#6366f1', 'priority': 'Medium'},
                    {'name': 'Residential Tower B', 'startMonth': 7, 'duration': 3, 'startDate': f"{year}-08-01", 'endDate': f"{year}-10-31", 'color': '#10b981', 'priority': 'High'},
                ]

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

        # 4. Shop Capacity Loading
        from django.db.models import Sum, Q
        
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

        bar_data = []
        for shop in ['shop1', 'shop2', 'shop3']:
            # Sum daily capacity rate for this shop and multiply by 30
            cap_sum = Capacity.objects.filter(shop__iexact=shop).aggregate(total=Sum('rate_per_day'))['total'] or 0
            capacity_month = float(cap_sum) * 30
            
            # Sum tons of all sequences of projects assigned to this shop distributed pro-rata by week start dates
            sequences = StructuralScheduleItem.objects.filter(project__shop_name__iexact=shop)
            allocated = 0.0
            for seq in sequences:
                tons = float(seq.tons or 0)
                lead_weeks = int(seq.shop_lead_time_weeks or 0)
                
                if seq.rts_date:
                    if lead_weeks > 0:
                        weekly_load = tons / lead_weeks
                        for w in range(lead_weeks):
                            week_start = seq.rts_date + timedelta(days=w * 7)
                            if week_start.year == cap_year and week_start.month == cap_month:
                                allocated += weekly_load
                    else:
                        # Lead weeks is 0, falls entirely in RTS Date month
                        if seq.rts_date.year == cap_year and seq.rts_date.month == cap_month:
                            allocated += tons
                else:
                    # Fallback to scheduled_erection_date
                    if seq.scheduled_erection_date and seq.scheduled_erection_date.year == cap_year and seq.scheduled_erection_date.month == cap_month:
                        allocated += tons
            
            remaining = capacity_month - allocated
            
            bar_data.append({
                'name': shop.capitalize(),
                'capacity': round(capacity_month, 2),
                'allocated': round(allocated, 2),
                'remaining': round(remaining, 2)
            })

        if sum(item['capacity'] for item in bar_data) == 0:
            bar_data = [
                {'name': 'Shop1', 'capacity': 450.0, 'allocated': 320.0, 'remaining': 130.0},
                {'name': 'Shop2', 'capacity': 300.0, 'allocated': 150.0, 'remaining': 150.0},
                {'name': 'Shop3', 'capacity': 600.0, 'allocated': 620.0, 'remaining': -20.0},
            ]

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
        yet_to_complete = Project.objects.filter(status='Yet to Complete').count()
        completed = Project.objects.filter(status='Completed').count()

        # Fetch active announcements
        from django.utils.timezone import localdate
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
                'priority': priority
            })

        return Response({
            'stats': [
                {'label': 'Total Projects', 'value': str(total_projects), 'change': '+0', 'up': True},
                {'label': 'In Progress', 'value': str(in_progress), 'change': '+0', 'up': True},
                {'label': 'Yet to Complete', 'value': str(yet_to_complete), 'change': '+0', 'up': True},
                {'label': 'Completed', 'value': str(completed), 'change': '+0', 'up': True},
            ],
            'ganttData': {
                'tasks': gantt_tasks,
                'months': months
            },
            'pieData': pie_data,
            'barData': bar_data,
            'recentActivities': recent_activities,
            'announcements': announcements_list
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
