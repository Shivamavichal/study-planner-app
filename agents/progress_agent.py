"""
Progress Agent - Monitors study progress and detects issues
Responsibilities:
- Track completed vs planned tasks
- Detect when user is falling behind
- Calculate completion rates
- Trigger alerts for low progress
"""

import json
import boto3
from datetime import datetime, timedelta
from decimal import Decimal

# Initialize AWS services
dynamodb = boto3.resource('dynamodb')
sns = boto3.client('sns')
study_plans_table = dynamodb.Table('StudyPlans')
progress_table = dynamodb.Table('Progress')

# SNS Topic ARN (set via environment variable)
import os
ALERT_TOPIC_ARN = os.environ.get('ALERT_TOPIC_ARN', '')

def lambda_handler(event, context):
    """
    Main Lambda handler for Progress Agent
    Triggered by:
    1. API Gateway POST /progress/complete (user completes task)
    2. EventBridge daily schedule (automated check)
    """
    try:
        # Check trigger source
        if 'source' in event and event['source'] == 'aws.events':
            # Triggered by EventBridge - check all users
            return check_all_users_progress()
        else:
            # Triggered by API - mark task complete
            return mark_task_complete(event)
            
    except Exception as e:
        print(f"Error in Progress Agent: {str(e)}")
        return error_response(500, str(e))


def mark_task_complete(event):
    """Mark a study task as completed"""
    body = json.loads(event.get('body', '{}'))
    user_id = event['requestContext']['authorizer']['user_id']
    plan_id = body['plan_id']
    
    # Get the study plan
    response = study_plans_table.get_item(Key={'plan_id': plan_id})
    plan = response.get('Item')
    
    if not plan or plan['user_id'] != user_id:
        return error_response(404, "Study plan not found")
    
    # Check if can complete (date validation)
    study_date = datetime.strptime(plan['study_date'], '%Y-%m-%d')
    if study_date > datetime.now():
        return error_response(400, f"Cannot complete future task. Available on {plan['study_date']}")
    
    # Mark as completed
    study_plans_table.update_item(
        Key={'plan_id': plan_id},
        UpdateExpression='SET is_completed = :true, completed_at = :now',
        ExpressionAttributeValues={
            ':true': True,
            ':now': datetime.now().isoformat()
        }
    )
    
    # Create progress record
    progress_id = f"{user_id}#{datetime.now().isoformat()}"
    progress_table.put_item(Item={
        'progress_id': progress_id,
        'user_id': user_id,
        'plan_id': plan_id,
        'subject_id': plan['subject_id'],
        'actual_hours': plan['planned_hours'],
        'notes': 'Task completed automatically',
        'completed_at': datetime.now().isoformat()
    })
    
    # Analyze progress and check if user is behind
    progress_analysis = analyze_user_progress(user_id)
    
    # If behind schedule, send alert
    if progress_analysis['completion_rate'] < 50:
        send_low_progress_alert(user_id, progress_analysis)
    
    return success_response({
        'message': 'Task marked as completed',
        'progress_analysis': progress_analysis
    })


def check_all_users_progress():
    """
    Daily automated check for all users
    Triggered by EventBridge at 8:00 AM
    """
    # Get all unique users from study plans
    response = study_plans_table.scan(
        ProjectionExpression='user_id',
        FilterExpression='is_completed = :false',
        ExpressionAttributeValues={':false': False}
    )
    
    users = set(item['user_id'] for item in response.get('Items', []))
    
    alerts_sent = 0
    for user_id in users:
        analysis = analyze_user_progress(user_id)
        
        # Send alert if completion rate is low
        if analysis['completion_rate'] < 60:
            send_low_progress_alert(user_id, analysis)
            alerts_sent += 1
    
    return success_response({
        'message': f'Checked {len(users)} users, sent {alerts_sent} alerts',
        'users_checked': len(users),
        'alerts_sent': alerts_sent
    })


def analyze_user_progress(user_id):
    """
    Analyze user's progress
    Returns completion rate, missed tasks, etc.
    """
    today = datetime.now().date()
    week_ago = today - timedelta(days=7)
    
    # Get all tasks from past week
    response = study_plans_table.query(
        KeyConditionExpression='user_id = :uid',
        FilterExpression='study_date BETWEEN :start AND :end',
        ExpressionAttributeValues={
            ':uid': user_id,
            ':start': week_ago.strftime('%Y-%m-%d'),
            ':end': today.strftime('%Y-%m-%d')
        }
    )
    
    tasks = response.get('Items', [])
    
    if not tasks:
        return {
            'total_tasks': 0,
            'completed_tasks': 0,
            'completion_rate': 0,
            'missed_tasks': 0,
            'status': 'no_tasks'
        }
    
    completed = sum(1 for task in tasks if task.get('is_completed', False))
    total = len(tasks)
    completion_rate = (completed / total * 100) if total > 0 else 0
    
    # Count overdue tasks
    overdue = sum(
        1 for task in tasks 
        if not task.get('is_completed', False) 
        and datetime.strptime(task['study_date'], '%Y-%m-%d').date() < today
    )
    
    # Determine status
    if completion_rate >= 80:
        status = 'excellent'
    elif completion_rate >= 60:
        status = 'good'
    elif completion_rate >= 40:
        status = 'needs_improvement'
    else:
        status = 'critical'
    
    return {
        'total_tasks': total,
        'completed_tasks': completed,
        'completion_rate': round(completion_rate, 1),
        'missed_tasks': overdue,
        'status': status,
        'period': 'last_7_days'
    }


def send_low_progress_alert(user_id, analysis):
    """Send alert notification for low progress"""
    if not ALERT_TOPIC_ARN:
        print("No SNS topic configured, skipping alert")
        return
    
    message = f"""
    📊 Study Progress Alert
    
    Your completion rate is {analysis['completion_rate']}%
    
    Summary:
    - Completed: {analysis['completed_tasks']}/{analysis['total_tasks']} tasks
    - Missed: {analysis['missed_tasks']} tasks
    - Status: {analysis['status'].upper()}
    
    💡 Recommendation: Review your schedule and catch up on missed tasks.
    
    Keep going! Consistency is key to success.
    """
    
    try:
        sns.publish(
            TopicArn=ALERT_TOPIC_ARN,
            Subject='Study Progress Alert',
            Message=message,
            MessageAttributes={
                'user_id': {'DataType': 'String', 'StringValue': user_id},
                'alert_type': {'DataType': 'String', 'StringValue': 'low_progress'}
            }
        )
        print(f"Alert sent to user {user_id}")
    except Exception as e:
        print(f"Failed to send alert: {str(e)}")


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
