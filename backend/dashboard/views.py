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

        # 2. Gantt Chart Data (Production Throughput)
        projects = Project.objects.all().order_by('start_date')
        gantt_tasks = []
        months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        
        if projects.exists():
            for p in projects:
                if p.start_date and p.end_date:
                    # Calculate start month index and duration
                    start_month = p.start_date.month - 1
                    duration = (p.end_date.year - p.start_date.year) * 12 + (p.end_date.month - p.start_date.month) + 1
                    
                    gantt_tasks.append({
                        'id': p.id,
                        'name': p.name,
                        'startMonth': start_month,
                        'duration': max(1, duration),
                        'color': colors.get(p.status, '#94a3b8'),
                        'priority': 'High' if p.total_ton > 100 else 'Medium'
                    })
        else:
            # PROFESSIONAL MOCK DATA FOR DEMONSTRATION (Gantt only)
            gantt_tasks = [
                {'name': 'Commercial Hub Structure', 'startMonth': 0, 'duration': 3, 'color': '#f59e0b', 'priority': 'High'},
                {'name': 'Industrial Warehouse Exp', 'startMonth': 3, 'duration': 4, 'color': '#6366f1', 'priority': 'Medium'},
                {'name': 'Residential Tower B', 'startMonth': 7, 'duration': 3, 'color': '#10b981', 'priority': 'High'},
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

        # 4. Section Performance
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
        recent_activities = []
        latest_items = ProductionPriorityItem.objects.order_by('-updated_at')[:4]
        for item in latest_items:
            recent_activities.append({
                'id': item.id,
                'action': f"Job #{item.job_number} {'Completed' if item.is_complete else 'Updated'}",
                'project': f"Seq: {item.sequence_number}",
                'user': 'System',
                'time': item.updated_at.strftime('%H:%M %p'),
                'type': 'success' if item.is_complete else 'info'
            })

        return Response({
            'stats': [
                {'label': 'Total Employees', 'value': str(total_employees), 'change': '+0%', 'up': True},
                {'label': 'Active Projects', 'value': str(active_projects), 'change': '+0', 'up': True},
                {'label': 'Active Jobs', 'value': str(active_jobs), 'change': '+0%', 'up': True},
                {'label': 'Efficiency Rate', 'value': f"{int(efficiency_rate)}%", 'change': '+0%', 'up': True},
            ],
            'ganttData': {
                'tasks': gantt_tasks,
                'months': months
            },
            'pieData': pie_data,
            'barData': bar_data,
            'recentActivities': recent_activities
        })
