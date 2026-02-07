"""
Reminder Agent - Sends daily reminders and motivational messages
Responsibilities:
- Send daily study reminders
- Notify about upcoming exams
- Send motivational messages
- Remind about incomplete tasks
"""

import json
import boto3
from datetime import datetime, timedelta
from decimal import Decimal

# Initialize AWS services
dynamodb = boto3.resource('dynamodb')
sns = boto3.client('sns')
ses = boto3.client('ses')
study_plans_table = dynamodb.Table('StudyPlans')
exams_table = dynamodb.Table('Exams')
users_table = dynamodb.Table('Users')

# Configuration
import os
REMINDER_TOPIC_ARN = os.environ.get('REMINDER_TOPIC_ARN', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'noreply@studyplanner.com')

def lambda_handler(event, context):
    """
    Main Lambda handler for Reminder Agent
    Triggered by: EventBridge daily at 8:00 AM
    """
    try:
        # Get all active users
        users = get_all_users()
        
        reminders_sent = 0
        for user in users:
            user_id = user['user_id']
            email = user.get('email')
            
            # Get today's tasks
            today_tasks = get_today_tasks(user_id)
            
            # Get upcoming exams (within 7 days)
            upcoming_exams = get_upcoming_exams(user_id, days=7)
            
            # Send reminder if there are tasks or exams
            if today_tasks or upcoming_exams:
                send_daily_reminder(user_id, email, today_tasks, upcoming_exams)
                reminders_sent += 1
        
        return success_response({
            'message': f'Sent {reminders_sent} daily reminders',
            'users_notified': reminders_sent
        })
        
    except Exception as e:
        print(f"Error in Reminder Agent: {str(e)}")
        return error_response(500, str(e))


def get_all_users():
    """Get all registered users"""
    response = users_table.scan()
    return response.get('Items', [])


def get_today_tasks(user_id):
    """Get today's study tasks for a user"""
    today = datetime.now().strftime('%Y-%m-%d')
    
    response = study_plans_table.query(
        KeyConditionExpression='user_id = :uid',
        FilterExpression='study_date = :today AND is_completed = :false',
        ExpressionAttributeValues={
            ':uid': user_id,
            ':today': today,
            ':false': False
        }
    )
    
    return response.get('Items', [])


def get_upcoming_exams(user_id, days=7):
    """Get exams within next N days"""
    today = datetime.now().date()
    future_date = today + timedelta(days=days)
    
    response = exams_table.query(
        KeyConditionExpression='user_id = :uid',
        FilterExpression='exam_date BETWEEN :start AND :end',
        ExpressionAttributeValues={
            ':uid': user_id,
            ':start': today.strftime('%Y-%m-%d'),
            ':end': future_date.strftime('%Y-%m-%d')
        }
    )
    
    return response.get('Items', [])


def send_daily_reminder(user_id, email, tasks, exams):
    """
    Send daily reminder via SNS or SES
    Uses SNS for simple notifications, SES for formatted emails
    """
    # Build reminder message
    message = build_reminder_message(tasks, exams)
    
    # Try SES first (better formatting), fallback to SNS
    if email and is_ses_available():
        send_via_ses(email, message)
    elif REMINDER_TOPIC_ARN:
        send_via_sns(user_id, message)
    else:
        print(f"No notification method configured for user {user_id}")


def build_reminder_message(tasks, exams):
    """Build formatted reminder message"""
    message_parts = []
    
    # Header
    message_parts.append("📚 Good Morning! Here's your study plan for today:\n")
    
    # Today's tasks
    if tasks:
        message_parts.append(f"\n✅ Today's Tasks ({len(tasks)}):")
        total_hours = sum(float(task['planned_hours']) for task in tasks)
        
        for task in tasks:
            hours = float(task['planned_hours'])
            hours_str = f"{int(hours)}h {int((hours % 1) * 60)}m" if hours % 1 else f"{int(hours)}h"
            message_parts.append(f"  • {task['subject_name']} - {task['topic']} ({hours_str})")
        
        message_parts.append(f"\n  Total study time: {format_hours(total_hours)}")
    else:
        message_parts.append("\n✅ No tasks scheduled for today. Great job staying ahead!")
    
    # Upcoming exams
    if exams:
        message_parts.append(f"\n\n📅 Upcoming Exams:")
        for exam in sorted(exams, key=lambda e: e['exam_date']):
            exam_date = datetime.strptime(exam['exam_date'], '%Y-%m-%d')
            days_until = (exam_date.date() - datetime.now().date()).days
            
            if days_until == 0:
                urgency = "🔴 TODAY!"
            elif days_until <= 3:
                urgency = f"🟡 in {days_until} days"
            else:
                urgency = f"🟢 in {days_until} days"
            
            message_parts.append(f"  • {exam['exam_name']} - {urgency}")
    
    # Motivational quote
    message_parts.append("\n\n💪 " + get_motivational_quote())
    
    return "\n".join(message_parts)


def format_hours(hours):
    """Format hours as '2h 30m'"""
    h = int(hours)
    m = int((hours % 1) * 60)
    if m > 0:
        return f"{h}h {m}m"
    return f"{h}h"


def get_motivational_quote():
    """Return a random motivational quote"""
    quotes = [
        "Success is the sum of small efforts repeated day in and day out.",
        "The expert in anything was once a beginner.",
        "Study while others are sleeping; work while others are loafing.",
        "Your future is created by what you do today, not tomorrow.",
        "Don't watch the clock; do what it does. Keep going.",
        "The only way to do great work is to love what you do.",
        "Believe you can and you're halfway there.",
        "Small progress is still progress. Keep going!"
    ]
    import random
    return random.choice(quotes)


def send_via_ses(email, message):
    """Send email via Amazon SES"""
    try:
        ses.send_email(
            Source=SENDER_EMAIL,
            Destination={'ToAddresses': [email]},
            Message={
                'Subject': {'Data': '📚 Your Daily Study Reminder'},
                'Body': {'Text': {'Data': message}}
            }
        )
        print(f"Reminder sent via SES to {email}")
    except Exception as e:
        print(f"SES send failed: {str(e)}")


def send_via_sns(user_id, message):
    """Send notification via Amazon SNS"""
    try:
        sns.publish(
            TopicArn=REMINDER_TOPIC_ARN,
            Subject='Daily Study Reminder',
            Message=message,
            MessageAttributes={
                'user_id': {'DataType': 'String', 'StringValue': user_id},
                'notification_type': {'DataType': 'String', 'StringValue': 'daily_reminder'}
            }
        )
        print(f"Reminder sent via SNS for user {user_id}")
    except Exception as e:
        print(f"SNS send failed: {str(e)}")


def is_ses_available():
    """Check if SES is configured and verified"""
    try:
        ses.get_send_quota()
        return True
    except:
        return False


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
