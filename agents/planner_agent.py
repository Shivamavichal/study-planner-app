"""
Planner Agent - Creates and optimizes study plans
Responsibilities:
- Generate study schedules based on exams and available time
- Prioritize subjects based on exam proximity
- Balance workload across days
- Ensure minimum study time per subject
"""

import json
import boto3
from datetime import datetime, timedelta
from decimal import Decimal

# Initialize AWS services
dynamodb = boto3.resource('dynamodb')
study_plans_table = dynamodb.Table('StudyPlans')
subjects_table = dynamodb.Table('Subjects')
exams_table = dynamodb.Table('Exams')

def lambda_handler(event, context):
    """
    Main Lambda handler for Planner Agent
    Triggered by: API Gateway POST /study-plans/generate
    """
    try:
        # Parse request
        body = json.loads(event.get('body', '{}'))
        user_id = event['requestContext']['authorizer']['user_id']
        
        # Extract parameters
        daily_hours = float(body.get('daily_study_hours', 4))
        start_date = datetime.strptime(body['start_date'], '%Y-%m-%d')
        end_date = datetime.strptime(body['end_date'], '%Y-%m-%d')
        
        # Get user's subjects and exams
        subjects = get_user_subjects(user_id)
        exams = get_user_exams(user_id)
        
        if not subjects:
            return error_response(400, "No subjects found. Please add subjects first.")
        
        # Generate optimized study plan
        study_plan = generate_study_plan(
            user_id=user_id,
            subjects=subjects,
            exams=exams,
            daily_hours=daily_hours,
            start_date=start_date,
            end_date=end_date
        )
        
        # Save to DynamoDB
        save_study_plan(study_plan)
        
        return success_response({
            'message': f'Generated {len(study_plan)} study sessions',
            'study_plan': study_plan
        })
        
    except Exception as e:
        print(f"Error in Planner Agent: {str(e)}")
        return error_response(500, str(e))


def get_user_subjects(user_id):
    """Fetch all subjects for a user"""
    response = subjects_table.query(
        KeyConditionExpression='user_id = :uid',
        ExpressionAttributeValues={':uid': user_id}
    )
    return response.get('Items', [])


def get_user_exams(user_id):
    """Fetch all exams for a user"""
    response = exams_table.query(
        KeyConditionExpression='user_id = :uid',
        ExpressionAttributeValues={':uid': user_id}
    )
    return response.get('Items', [])


def generate_study_plan(user_id, subjects, exams, daily_hours, start_date, end_date):
    """
    Core AI Logic: Generate optimized study schedule
    Algorithm:
    1. Calculate priority for each subject based on exam dates
    2. Allocate time proportionally to priority
    3. Ensure minimum 30 minutes per subject
    4. Distribute across available days
    """
    MIN_HOURS_PER_SUBJECT = 0.5  # 30 minutes
    study_plan = []
    current_date = start_date
    plan_id = 1
    
    while current_date <= end_date:
        # Skip weekends (optional)
        if current_date.weekday() < 5:  # Monday = 0, Friday = 4
            
            # Calculate subject priorities for this day
            priorities = calculate_priorities(subjects, exams, current_date)
            
            # Allocate study time based on priorities
            allocations = allocate_time(priorities, daily_hours, MIN_HOURS_PER_SUBJECT)
            
            # Create study sessions
            for allocation in allocations:
                study_plan.append({
                    'plan_id': f"{user_id}#{current_date.strftime('%Y-%m-%d')}#{plan_id}",
                    'user_id': user_id,
                    'subject_id': allocation['subject_id'],
                    'subject_name': allocation['subject_name'],
                    'study_date': current_date.strftime('%Y-%m-%d'),
                    'planned_hours': Decimal(str(allocation['hours'])),
                    'topic': allocation['topic'],
                    'description': allocation['description'],
                    'is_completed': False,
                    'priority': allocation['priority'],
                    'created_at': datetime.now().isoformat()
                })
                plan_id += 1
        
        current_date += timedelta(days=1)
    
    return study_plan


def calculate_priorities(subjects, exams, current_date):
    """
    Calculate priority score for each subject
    Higher priority = closer exam date
    """
    priorities = []
    
    for subject in subjects:
        # Find exams for this subject
        subject_exams = [e for e in exams if e['subject_id'] == subject['subject_id']]
        
        if not subject_exams:
            # No exam - default priority
            priorities.append({
                'subject_id': subject['subject_id'],
                'subject_name': subject['name'],
                'priority': 1,
                'days_until_exam': 999
            })
            continue
        
        # Find closest exam
        closest_exam = min(
            subject_exams,
            key=lambda e: abs((datetime.strptime(e['exam_date'], '%Y-%m-%d') - current_date).days)
        )
        
        exam_date = datetime.strptime(closest_exam['exam_date'], '%Y-%m-%d')
        days_until = (exam_date - current_date).days
        
        # Priority scoring:
        # <= 7 days: priority 3 (urgent)
        # <= 14 days: priority 2 (important)
        # > 14 days: priority 1 (normal)
        if days_until <= 7:
            priority = 3
        elif days_until <= 14:
            priority = 2
        else:
            priority = 1
        
        priorities.append({
            'subject_id': subject['subject_id'],
            'subject_name': subject['name'],
            'priority': priority,
            'days_until_exam': days_until,
            'exam_name': closest_exam['exam_name']
        })
    
    return priorities


def allocate_time(priorities, total_hours, min_hours):
    """
    Allocate study time based on priorities
    Ensures each subject gets minimum time
    """
    allocations = []
    total_priority = sum(p['priority'] for p in priorities)
    remaining_hours = total_hours
    
    for i, priority_info in enumerate(priorities):
        # Last subject gets remaining time
        if i == len(priorities) - 1:
            hours = max(min_hours, remaining_hours)
        else:
            # Allocate proportionally to priority
            hours = (total_hours * priority_info['priority']) / total_priority
            hours = max(min_hours, hours)
            hours = round(hours * 4) / 4  # Round to nearest 15 minutes
        
        remaining_hours -= hours
        
        # Generate topic and description
        if priority_info['days_until_exam'] <= 7:
            topic = f"Exam Prep: {priority_info.get('exam_name', 'Upcoming Exam')}"
            description = f"Focus on exam preparation ({priority_info['days_until_exam']} days remaining)"
        else:
            topic = f"Study Session: {priority_info['subject_name']}"
            description = "Regular study session"
        
        allocations.append({
            'subject_id': priority_info['subject_id'],
            'subject_name': priority_info['subject_name'],
            'hours': hours,
            'priority': priority_info['priority'],
            'topic': topic,
            'description': description
        })
    
    return allocations


def save_study_plan(study_plan):
    """Save study plan to DynamoDB"""
    with study_plans_table.batch_writer() as batch:
        for plan in study_plan:
            batch.put_item(Item=plan)


def success_response(data):
    """Standard success response"""
    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        'body': json.dumps(data)
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
