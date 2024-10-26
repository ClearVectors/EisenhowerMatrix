import os
from flask import Flask, render_template, request, jsonify, send_file
from datetime import datetime, timedelta
from models import db, Task
import csv
from io import StringIO

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "eisenhower_matrix_key"
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}

db.init_app(app)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/tasks', methods=['GET'])
def get_tasks():
    search_query = request.args.get('search', '').lower()
    filter_type = request.args.get('filter', 'all')
    tag_filter = request.args.get('tag')

    # Start with base query
    query = Task.query

    # Apply search filter if provided
    if search_query:
        query = query.filter(Task.title.ilike(f'%{search_query}%'))

    # Apply tag filter if provided
    if tag_filter:
        query = query.filter(Task.tags.contains([tag_filter]))

    # Apply status filter
    if filter_type == 'completed':
        query = query.filter_by(completed=True)
    elif filter_type == 'active':
        query = query.filter_by(completed=False)
    elif filter_type == 'due-soon':
        now = datetime.now()
        soon = now + timedelta(hours=24)  # Tasks due within 24 hours
        query = query.filter(
            Task.due_date.isnot(None),
            Task.due_date >= now,
            Task.due_date <= soon,
            Task.completed == False
        )

    tasks = query.all()
    return jsonify([{
        'id': task.id,
        'title': task.title,
        'quadrant': task.quadrant,
        'completed': task.completed,
        'due_date': task.due_date.isoformat() if task.due_date else None,
        'reminder_set': task.reminder_set,
        'tags': task.tags or []
    } for task in tasks])

@app.route('/tasks/export', methods=['GET'])
def export_tasks():
    # Get tasks with current filters
    search_query = request.args.get('search', '').lower()
    filter_type = request.args.get('filter', 'all')
    tag_filter = request.args.get('tag')

    query = Task.query

    if search_query:
        query = query.filter(Task.title.ilike(f'%{search_query}%'))
    if tag_filter:
        query = query.filter(Task.tags.contains([tag_filter]))
    if filter_type == 'completed':
        query = query.filter_by(completed=True)
    elif filter_type == 'active':
        query = query.filter_by(completed=False)
    elif filter_type == 'due-soon':
        now = datetime.now()
        soon = now + timedelta(hours=24)
        query = query.filter(
            Task.due_date.isnot(None),
            Task.due_date >= now,
            Task.due_date <= soon,
            Task.completed == False
        )

    tasks = query.all()

    # Create CSV in memory
    si = StringIO()
    cw = csv.writer(si)
    
    # Write headers
    cw.writerow(['Title', 'Quadrant', 'Status', 'Due Date', 'Reminder Set', 'Tags'])
    
    # Write task data
    for task in tasks:
        cw.writerow([
            task.title,
            task.quadrant,
            'Completed' if task.completed else 'Active',
            task.due_date.isoformat() if task.due_date else '',
            'Yes' if task.reminder_set else 'No',
            ', '.join(task.tags) if task.tags else ''
        ])
    
    output = si.getvalue()
    si.close()
    
    # Create response
    return output, 200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': f'attachment; filename=tasks_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
    }

@app.route('/tasks', methods=['POST'])
def create_task():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    try:
        due_date = None
        if data.get('due_date'):
            due_date = datetime.fromisoformat(data['due_date'])
        
        task = Task(
            title=data['title'],
            quadrant=data['quadrant'],
            due_date=due_date,
            reminder_set=data.get('reminder_set', False),
            tags=data.get('tags', [])
        )
        db.session.add(task)
        db.session.commit()
        
        return jsonify({
            "id": task.id,
            "title": task.title,
            "quadrant": task.quadrant,
            "completed": task.completed,
            "due_date": task.due_date.isoformat() if task.due_date else None,
            "reminder_set": task.reminder_set,
            "tags": task.tags or []
        })
    except KeyError as e:
        return jsonify({"error": f"Missing required field: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    task = Task.query.get_or_404(task_id)
    data = request.get_json()
    
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    try:
        if 'title' in data:
            task.title = data['title']
        if 'quadrant' in data:
            task.quadrant = data['quadrant']
        if 'completed' in data:
            task.completed = data['completed']
        if 'due_date' in data:
            task.due_date = datetime.fromisoformat(data['due_date']) if data['due_date'] else None
        if 'reminder_set' in data:
            task.reminder_set = data['reminder_set']
        if 'tags' in data:
            task.tags = data['tags']
        
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    try:
        db.session.delete(task)
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def add_sample_tasks():
    if Task.query.count() == 0:
        tomorrow = datetime.now() + timedelta(days=1)
        next_week = datetime.now() + timedelta(days=7)
        
        sample_tasks = [
            {
                "title": "Complete project deadline",
                "quadrant": "UI",
                "due_date": datetime.now().replace(hour=23, minute=59),
                "reminder_set": True,
                "tags": ["work", "project"]
            },
            {
                "title": "Submit tax documents",
                "quadrant": "UI",
                "due_date": tomorrow.replace(hour=17, minute=0),
                "reminder_set": True,
                "tags": ["finance", "documents"]
            },
            {
                "title": "Learn new programming language",
                "quadrant": "UN",
                "due_date": None,
                "reminder_set": False,
                "tags": ["learning", "tech"]
            },
            {
                "title": "Reply to emails",
                "quadrant": "NI",
                "due_date": datetime.now().replace(hour=16, minute=30),
                "reminder_set": True,
                "tags": ["work", "communication"]
            },
            {
                "title": "Organize digital photos",
                "quadrant": "NN",
                "due_date": None,
                "reminder_set": False,
                "tags": ["personal", "organization"]
            }
        ]
        
        for task_data in sample_tasks:
            new_task = Task(
                title=task_data["title"],
                quadrant=task_data["quadrant"],
                due_date=task_data["due_date"],
                reminder_set=task_data["reminder_set"],
                tags=task_data["tags"]
            )
            db.session.add(new_task)
        db.session.commit()

with app.app_context():
    db.drop_all()  # Drop all existing tables
    db.create_all()  # Create tables with new schema
    add_sample_tasks()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
