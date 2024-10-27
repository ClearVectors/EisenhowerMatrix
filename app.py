from flask import Flask, render_template, jsonify, request, make_response
from datetime import datetime, timedelta
import os
from models import db, Task
from io import StringIO
import csv
import time
from sqlalchemy.exc import SQLAlchemyError

app = Flask(__name__)

# Database configuration with proper SSL and connection pooling
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ['DATABASE_URL']
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_pre_ping': True,
    'pool_recycle': 300,
    'connect_args': {'sslmode': 'require'}
}

db.init_app(app)

def with_retry(func, max_retries=3):
    """Decorator to add retry logic to database operations"""
    def wrapper(*args, **kwargs):
        retry_count = 0
        while retry_count < max_retries:
            try:
                return func(*args, **kwargs)
            except SQLAlchemyError as e:
                db.session.rollback()
                retry_count += 1
                if retry_count == max_retries:
                    raise
                time.sleep(1)  # Wait before retrying
    return wrapper

def _export_tasks():
    try:
        si = StringIO()
        writer = csv.writer(si)
        writer.writerow(['Title', 'Description', 'Category', 'Due Date', 'Quadrant', 'Completed'])
        tasks = Task.query.all()
        for task in tasks:
            writer.writerow([
                task.title,
                task.description,
                task.category,
                task.due_date.strftime('%Y-%m-%d'),
                task.quadrant,
                'Yes' if task.completed else 'No'
            ])
        output = si.getvalue()
        si.close()
        response = make_response(output)
        response.headers['Content-Disposition'] = 'attachment; filename=eisenhower_tasks.csv'
        response.headers['Content-type'] = 'text/csv'
        return response
    except Exception as e:
        return jsonify({'error': 'Failed to export tasks'}), 500

@app.route('/tasks/export', methods=['GET'])
def export_tasks():
    return with_retry(_export_tasks)()

def _add_sample_tasks():
    try:
        Task.query.delete()
        tasks = [
            {
                'title': 'Health Checkup',
                'description': 'Annual medical examination',
                'category': 'Health',
                'due_date': datetime.now() + timedelta(days=1),
                'quadrant': 'urgent-important'
            },
            {
                'title': 'Learn React Basics',
                'description': 'Complete React fundamentals course',
                'category': 'Learning',
                'due_date': datetime.now() + timedelta(days=4),
                'quadrant': 'not-urgent-important'
            },
            {
                'title': 'Team Lunch',
                'description': 'Coordinate team lunch meetup',
                'category': 'Work',
                'due_date': datetime.now() + timedelta(days=2),
                'quadrant': 'urgent-not-important'
            },
            {
                'title': 'Medical Appointment Analysis',
                'description': 'Annual health checkup',
                'category': 'Health',
                'due_date': datetime.now() + timedelta(days=9),
                'quadrant': 'not-urgent-not-important'
            }
        ]
        
        for task_data in tasks:
            task = Task()
            task.title = task_data['title']
            task.description = task_data['description']
            task.category = task_data['category']
            task.due_date = task_data['due_date']
            task.quadrant = task_data['quadrant']
            db.session.add(task)
        
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        raise

def add_sample_tasks():
    return with_retry(_add_sample_tasks)()

def _get_index_data():
    try:
        now = datetime.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)
        week_end = today_start + timedelta(days=7)

        # Get overdue tasks (due before today)
        overdue_count = Task.query.filter(
            Task.due_date < today_start,
            Task.completed == False
        ).count()

        # Get tasks due today (due between start and end of today)
        due_today_count = Task.query.filter(
            Task.due_date >= today_start,
            Task.due_date < today_end,
            Task.completed == False
        ).count()

        # Get tasks due this week (due between tomorrow and next 7 days)
        due_this_week_count = Task.query.filter(
            Task.due_date >= today_end,
            Task.due_date < week_end,
            Task.completed == False
        ).count()

        return render_template('index.html',
                           overdue_count=overdue_count,
                           due_today_count=due_today_count,
                           due_this_week_count=due_this_week_count)
    except Exception as e:
        return jsonify({'error': 'Failed to load dashboard'}), 500

@app.route('/')
def index():
    return with_retry(_get_index_data)()

def _get_tasks():
    try:
        filter_type = request.args.get('filter', 'all')
        query = Task.query

        if filter_type == 'overdue':
            query = query.filter(Task.due_date < datetime.now(), Task.completed == False)
        elif filter_type == 'today':
            query = query.filter(
                Task.due_date >= datetime.now(),
                Task.due_date < datetime.now() + timedelta(days=1),
                Task.completed == False
            )
        elif filter_type == 'week':
            query = query.filter(
                Task.due_date >= datetime.now() + timedelta(days=1),
                Task.due_date < datetime.now() + timedelta(days=7),
                Task.completed == False
            )

        tasks = query.all()
        return jsonify([{
            'id': task.id,
            'title': task.title,
            'description': task.description,
            'category': task.category,
            'due_date': task.due_date.isoformat(),
            'quadrant': task.quadrant,
            'completed': task.completed
        } for task in tasks])
    except Exception as e:
        return jsonify({'error': 'Failed to fetch tasks'}), 500

@app.route('/tasks', methods=['GET'])
def get_tasks():
    return with_retry(_get_tasks)()

def _create_task():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        task = Task()
        task.title = data['title']
        task.description = data.get('description', '')
        task.category = data['category']
        task.due_date = datetime.fromisoformat(data['due_date'])
        task.quadrant = data['quadrant']
        
        db.session.add(task)
        db.session.commit()
        
        return jsonify({
            'id': task.id,
            'title': task.title,
            'description': task.description,
            'category': task.category,
            'due_date': task.due_date.isoformat(),
            'quadrant': task.quadrant,
            'completed': task.completed
        }), 201
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': 'Database connection error. Please try again.'}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/tasks', methods=['POST'])
def create_task():
    return with_retry(_create_task)()

def _update_task(task_id):
    try:
        task = Task.query.get_or_404(task_id)
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        if 'completed' in data:
            task.completed = data['completed']
        else:
            if 'title' in data:
                task.title = data['title'].strip()
            if 'description' in data:
                task.description = data.get('description', '').strip()
            if 'category' in data:
                task.category = data['category']
            if 'quadrant' in data:
                task.quadrant = data['quadrant']
            if 'due_date' in data:
                try:
                    task.due_date = datetime.fromisoformat(data['due_date'])
                except ValueError:
                    return jsonify({'error': 'Invalid date format'}), 400

        db.session.commit()
        
        return jsonify({
            'id': task.id,
            'title': task.title,
            'description': task.description,
            'category': task.category,
            'due_date': task.due_date.isoformat(),
            'quadrant': task.quadrant,
            'completed': task.completed,
            'message': 'Task updated successfully'
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    return with_retry(_update_task)(task_id)

def _delete_task(task_id):
    try:
        task = Task.query.get_or_404(task_id)
        db.session.delete(task)
        db.session.commit()
        return jsonify({'message': 'Task deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    return with_retry(_delete_task)(task_id)

with app.app_context():
    db.create_all()
    if Task.query.count() == 0:
        add_sample_tasks()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
