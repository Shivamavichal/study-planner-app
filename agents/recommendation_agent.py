"""
Recommendation Agent - Suggests optimal study actions
Responsibilities:
- Analyze user's progress and patterns
- Recommend which subject to study next
- Suggest catch-up plans for missed tasks
- Provide personalized study tips
"""

import json
import boto3
from datetime import datetime, timedelta
from collections import defaultdict
from decimal import Decimal

# Initialize AWS services
dynamodb = boto3.resource('dynamodb')
study_plans_table = dynamodb.Table('StudyPlans')
progress_table = dynamodb.Table('Progress')
exams_table = dynamodb.Table('Exams')
subjects_table = dynamodb.Table('Subjects')

def lambda_handler(event, context):
    """
    Main Lambda handler for Recommendation Agent
    Triggered by:
    1. API Gateway GET /recommendations
    2. Progress Agent (when user falls behind)
    """
    try:
        # Get user ID
        if 'requestContext' in event:
            user_id = event['requestContext']['authorizer']['user_id']
        else:
            # Triggered by another agent
            body = json.loads(event.get('body', '{}'))
            user_id = body['user_id']
        
        # Generate recommendations
        recommendations = generate_recommendations(user_id)
        
        return success_response(recommendations)
        
    except Exception as e:
        print(f"Error in Recommendation Agent: {str(e)}")
        return error_response(500, str(e))


def generate_recommendations(user_id):
    """
    Generate personalized recommendations using AI logic
    """
    # Gather user data
    progress_data = analyze_progress_patterns(user_id)
    upcoming_exams = get_urgent_exams(user_id)
    weak_subjects = identify_weak_subjects(user_id)
    missed_tasks = get_missed_tasks(user_id)
    
    recommendations = {
        'next_action': determine_next_action(progress_data, upcoming_exams, missed_tasks),
        'priority_subjects': prioritize_subjects(weak_subjects, upcoming_exams),
        'study_tips': generate_study_tips(progress_data),
        'catch_up_plan': create_catch_up_plan(missed_tasks) if missed_tasks else None,
        'motivation_level': calculate_motivation_level(progress_data),
        'generated_at': datetime.now().isoformat()
    }
    
    return recommendations


def analyze_progress_patterns(user_id):
    """Analyze user's study patterns and consistency"""
    # Get last 14 days of progress
    two_weeks_ago = (datetime.now() - timedelta(days=14)).strftime('%Y-%m-%d')
    today = datetime.now().strftime('%Y-%m-%d')
    
    response = study_plans_table.query(
        KeyConditionExpression='user_id = :uid',
        FilterExpression='study_date BETWEEN :start AND :end',
        ExpressionAttributeValues={
            ':uid': user_id,
            ':start': two_weeks_ago,
            ':end': today
        }
    )
    
    tasks = response.get('Items', [])
    
    if not tasks:
        return {
            'total_tasks': 0,
            'completed': 0,
            'completion_rate': 0,
            'consistency_score': 0,
            'average_daily_hours': 0
        }
    
    completed = [t for t in tasks if t.get('is_completed', False)]
    completion_rate = len(completed) / len(tasks) * 100 if tasks else 0
    
    # Calculate consistency (how many days studied)
    study_days = set(t['study_date'] for t in completed)
    consistency_score = len(study_days) / 14 * 100
    
    # Average daily hours
    total_hours = sum(float(t['planned_hours']) for t in completed)
    avg_hours = total_hours / len(study_days) if study_days else 0
    
    return {
        'total_tasks': len(tasks),
        'completed': len(completed),
        'completion_rate': round(completion_rate, 1),
        'consistency_score': round(consistency_score, 1),
        'average_daily_hours': round(avg_hours, 1),
        'study_days': len(study_days)
    }


def get_urgent_exams(user_id, days=7):
    """Get exams within next N days"""
    today = datetime.now().date()
    future = today + timedelta(days=days)
    
    response = exams_table.query(
        KeyConditionExpression='user_id = :uid',
        FilterExpression='exam_date BETWEEN :start AND :end',
        ExpressionAttributeValues={
            ':uid': user_id,
            ':start': today.strftime('%Y-%m-%d'),
            ':end': future.strftime('%Y-%m-%d')
        }
    )
    
    return response.get('Items', [])


def identify_weak_subjects(user_id):
    """Identify subjects with low completion rates"""
    # Get all completed tasks
    response = progress_table.query(
        KeyConditionExpression='user_id = :uid',
        ExpressionAttributeValues={':uid': user_id}
    )
    
    progress_records = response.get('Items', [])
    
    # Count completions per subject
    subject_stats = defaultdict(lambda: {'completed': 0, 'total': 0})
    
    # Get all planned tasks
    plans_response = study_plans_table.query(
        KeyConditionExpression='user_id = :uid',
        ExpressionAttributeValues={':uid': user_id}
    )
    
    for plan in plans_response.get('Items', []):
        subject_id = plan['subject_id']
        subject_stats[subject_id]['total'] += 1
        if plan.get('is_completed', False):
            subject_stats[subject_id]['completed'] += 1
    
    # Calculate completion rates
    weak_subjects = []
    for subject_id, stats in subject_stats.items():
        if stats['total'] > 0:
            rate = stats['completed'] / stats['total'] * 100
            if rate < 60:  # Less than 60% completion
                weak_subjects.append({
                    'subject_id': subject_id,
                    'completion_rate': round(rate, 1),
                    'completed': stats['completed'],
                    'total': stats['total']
                })
    
    return sorted(weak_subjects, key=lambda x: x['completion_rate'])


def get_missed_tasks(user_id):
    """Get overdue incomplete tasks"""
    today = datetime.now().date()
    
    response = study_plans_table.query(
        KeyConditionExpression='user_id = :uid',
        FilterExpression='is_completed = :false AND study_date < :today',
        ExpressionAttributeValues={
            ':uid': user_id,
            ':false': False,
            ':today': today.strftime('%Y-%m-%d')
        }
    )
    
    return response.get('Items', [])


def determine_next_action(progress_data, upcoming_exams, missed_tasks):
    """Determine the most important next action"""
    # Priority 1: Exam today or tomorrow
    urgent_exams = [e for e in upcoming_exams 
                    if (datetime.strptime(e['exam_date'], '%Y-%m-%d').date() - datetime.now().date()).days <= 1]
    
    if urgent_exams:
        exam = urgent_exams[0]
        return {
            'action': 'urgent_exam_prep',
            'title': f"🔴 Urgent: Prepare for {exam['exam_name']}",
            'description': f"Exam is on {exam['exam_date']}. Focus all efforts here!",
            'priority': 'critical'
        }
    
    # Priority 2: Catch up on missed tasks
    if len(missed_tasks) > 3:
        return {
            'action': 'catch_up',
            'title': f"⚠️ Catch up on {len(missed_tasks)} missed tasks",
            'description': "You're falling behind. Let's get back on track!",
            'priority': 'high'
        }
    
    # Priority 3: Upcoming exam within week
    if upcoming_exams:
        exam = upcoming_exams[0]
        days_until = (datetime.strptime(exam['exam_date'], '%Y-%m-%d').date() - datetime.now().date()).days
        return {
            'action': 'exam_preparation',
            'title': f"📚 Prepare for {exam['exam_name']}",
            'description': f"Exam in {days_until} days. Start reviewing now.",
            'priority': 'medium'
        }
    
    # Priority 4: Regular study
    if progress_data['completion_rate'] >= 70:
        return {
            'action': 'continue_routine',
            'title': "✅ Keep up the great work!",
            'description': f"You're doing well with {progress_data['completion_rate']}% completion rate.",
            'priority': 'low'
        }
    else:
        return {
            'action': 'improve_consistency',
            'title': "📈 Improve your study consistency",
            'description': "Try to complete at least one task daily.",
            'priority': 'medium'
        }


def prioritize_subjects(weak_subjects, upcoming_exams):
    """Prioritize which subjects need attention"""
    priorities = []
    
    # Add subjects with upcoming exams
    for exam in upcoming_exams[:3]:  # Top 3 urgent exams
        days_until = (datetime.strptime(exam['exam_date'], '%Y-%m-%d').date() - datetime.now().date()).days
        priorities.append({
            'subject_id': exam['subject_id'],
            'reason': f"Exam in {days_until} days",
            'urgency': 'high' if days_until <= 3 else 'medium'
        })
    
    # Add weak subjects
    for subject in weak_subjects[:2]:  # Top 2 weak subjects
        priorities.append({
            'subject_id': subject['subject_id'],
            'reason': f"Low completion rate ({subject['completion_rate']}%)",
            'urgency': 'medium'
        })
    
    return priorities


def generate_study_tips(progress_data):
    """Generate personalized study tips"""
    tips = []
    
    # Tip based on completion rate
    if progress_data['completion_rate'] < 50:
        tips.append({
            'category': 'consistency',
            'tip': "Start with just 30 minutes daily. Small consistent efforts beat occasional marathons."
        })
    
    # Tip based on consistency
    if progress_data['consistency_score'] < 50:
        tips.append({
            'category': 'habit',
            'tip': "Study at the same time each day to build a strong habit."
        })
    
    # Tip based on study hours
    if progress_data['average_daily_hours'] < 2:
        tips.append({
            'category': 'time_management',
            'tip': "Try the Pomodoro Technique: 25 minutes focused study, 5 minutes break."
        })
    
    # General tips
    tips.append({
        'category': 'technique',
        'tip': "Active recall is more effective than re-reading. Test yourself regularly."
    })
    
    return tips


def create_catch_up_plan(missed_tasks):
    """Create a plan to catch up on missed tasks"""
    if not missed_tasks:
        return None
    
    # Sort by date (oldest first)
    sorted_tasks = sorted(missed_tasks, key=lambda t: t['study_date'])
    
    # Group by subject
    by_subject = defaultdict(list)
    for task in sorted_tasks:
        by_subject[task['subject_id']].append(task)
    
    plan = {
        'total_missed': len(missed_tasks),
        'subjects_affected': len(by_subject),
        'recommended_schedule': []
    }
    
    # Suggest spreading catch-up over next 3 days
    days_to_catch_up = min(3, len(sorted_tasks))
    tasks_per_day = len(sorted_tasks) // days_to_catch_up
    
    for day in range(days_to_catch_up):
        start_idx = day * tasks_per_day
        end_idx = start_idx + tasks_per_day if day < days_to_catch_up - 1 else len(sorted_tasks)
        day_tasks = sorted_tasks[start_idx:end_idx]
        
        plan['recommended_schedule'].append({
            'day': day + 1,
            'date': (datetime.now() + timedelta(days=day)).strftime('%Y-%m-%d'),
            'tasks': len(day_tasks),
            'total_hours': sum(float(t['planned_hours']) for t in day_tasks)
        })
    
    return plan


def calculate_motivation_level(progress_data):
    """Calculate user's motivation level based on patterns"""
    score = 0
    
    # Completion rate contribution (0-40 points)
    score += progress_data['completion_rate'] * 0.4
    
    # Consistency contribution (0-40 points)
    score += progress_data['consistency_score'] * 0.4
    
    # Recent activity (0-20 points)
    if progress_data['study_days'] >= 5:
        score += 20
    elif progress_data['study_days'] >= 3:
        score += 10
    
    # Determine level
    if score >= 80:
        return {'level': 'high', 'emoji': '🔥', 'message': 'You\'re on fire!'}
    elif score >= 60:
        return {'level': 'good', 'emoji': '👍', 'message': 'Keep it up!'}
    elif score >= 40:
        return {'level': 'moderate', 'emoji': '💪', 'message': 'You can do better!'}
    else:
        return {'level': 'low', 'emoji': '🌱', 'message': 'Let\'s get started!'}


def success_response(data):
    """Standard success response"""
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(data, default=str)
    }


def error_response(status_code, message):
    """Standard error response"""
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps({'error': message})
    }
