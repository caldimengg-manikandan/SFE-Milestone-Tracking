from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import models
from django.db.models import Count, Sum
from employees.models import Employee
from projects.models import Project
from milestones.models import Milestone
from production.models import ProductionPriorityItem, ProductionItem
from django.utils import timezone
from datetime import timedelta

class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # 1. Basic Stats
        total_employees = Employee.objects.count()
        active_projects = Project.objects.filter(status='In Progress').count()
        
        # For active jobs, let's count ProductionPriorityItems that are not complete
        active_jobs = ProductionPriorityItem.objects.filter(is_complete=False).count()
        
        # Efficiency rate - for now, let's calculate based on completed vs total priority items
        total_jobs = ProductionPriorityItem.objects.count()
        completed_jobs = ProductionPriorityItem.objects.filter(is_complete=True).count()
        efficiency_rate = (completed_jobs / total_jobs * 100) if total_jobs > 0 else 0

        # 2. Production Throughput (Monthly trends for last 7 months)
        # We'll use complete_run_date from ProductionPriorityItem, fallback to updated_at
        area_data = []
        now = timezone.now()
        for i in range(6, -1, -1):
            # Calculate start and end of the month
            target_date = now - timedelta(days=i*30)
            month = target_date.month
            year = target_date.year
            month_name = target_date.strftime('%b')
            
            count = ProductionPriorityItem.objects.filter(
                is_complete=True
            ).filter(
                models.Q(complete_run_date__month=month, complete_run_date__year=year) |
                models.Q(complete_run_date__isnull=True, updated_at__month=month, updated_at__year=year)
            ).count()
            
            project_count = Project.objects.filter(created_at__month=month, created_at__year=year).count()
            
            area_data.append({
                'month': month_name,
                'jobs': count,
                'projects': project_count
            })

        # 3. Inventory Status (Using Project statuses for now as requested by UI)
        project_stats = Project.objects.values('status').annotate(count=Count('id'))
        pie_data = []
        colors = {
            'Completed': '#10b981',
            'In Progress': '#f59e0b',
            'Planning': '#6366f1',
            'On Hold': '#ef4444',
            'Delayed': '#6b7280'
        }
        
        # Map Planning to Pending for UI consistency if needed
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

        # 4. Section Performance (Example using ProductionPriority module types)
        bar_data = []
        modules = ['PLATE', 'ANGLE', 'STRUCTURAL']
        for module in modules:
            completed = ProductionPriorityItem.objects.filter(priority__module_type=module, is_complete=True).count()
            pending = ProductionPriorityItem.objects.filter(priority__module_type=module, is_complete=False).count()
            bar_data.append({
                'name': module.capitalize(),
                'completed': completed,
                'pending': pending
            })

        # 5. Recent Activities
        # We can use Milestones or Projects or just the latest ProductionPriorityItems
        recent_activities = []
        latest_items = ProductionPriorityItem.objects.order_by('-updated_at')[:4]
        for item in latest_items:
            recent_activities.append({
                'id': item.id,
                'action': f"Job #{item.job_number} {'Completed' if item.is_complete else 'Updated'}",
                'project': f"Seq: {item.sequence_number}",
                'user': 'System', # Or get from audit log if available
                'time': 'Recently', # We can format this properly
                'type': 'success' if item.is_complete else 'info'
            })

        return Response({
            'stats': [
                {'label': 'Total Employees', 'value': str(total_employees), 'change': '+0', 'up': True},
                {'label': 'Active Projects', 'value': str(active_projects), 'change': '+0', 'up': True},
                {'label': 'Active Jobs', 'value': str(active_jobs), 'change': '+0', 'up': True},
                {'label': 'Efficiency Rate', 'value': f"{int(efficiency_rate)}%", 'change': '+0', 'up': True},
            ],
            'areaData': area_data,
            'pieData': pie_data,
            'barData': bar_data,
            'recentActivities': recent_activities
        })
