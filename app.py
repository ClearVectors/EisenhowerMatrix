import os
from flask import Flask, render_template, request, jsonify
from datetime import datetime
from models import db, Task

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
    tasks = Task.query.all()
    return jsonify([{
        'id': task.id,
        'title': task.title,
        'quadrant': task.quadrant,
        'completed': task.completed,
        'due_date': task.due_date.isoformat() if task.due_date else None,
        'reminder_set': task.reminder_set
    } for task in tasks])

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
            completed=False,
            due_date=due_date,
            reminder_set=data.get('reminder_set', False)
        )
        db.session.add(task)
        db.session.commit()
        
        return jsonify({
            "id": task.id,
            "title": task.title,
            "quadrant": task.quadrant,
            "completed": task.completed,
            "due_date": task.due_date.isoformat() if task.due_date else None,
            "reminder_set": task.reminder_set
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
        if 'quadrant' in data:
            task.quadrant = data['quadrant']
        if 'completed' in data:
            task.completed = data['completed']
        if 'due_date' in data:
            task.due_date = datetime.fromisoformat(data['due_date']) if data['due_date'] else None
        if 'reminder_set' in data:
            task.reminder_set = data['reminder_set']
        
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def add_sample_tasks():
    if Task.query.count() == 0:
        sample_tasks = [
            {
                "title": "Complete project deadline",
                "quadrant": "UI",
                "due_date": datetime.now().replace(hour=23, minute=59),
                "reminder_set": True
            },
            {
                "title": "Prepare presentation",
                "quadrant": "UI",
                "due_date": datetime.now().replace(hour=14, minute=30),
                "reminder_set": True
            },
            {
                "title": "Learn new programming language",
                "quadrant": "UN",
                "due_date": None,
                "reminder_set": False
            },
            {
                "title": "Exercise routine",
                "quadrant": "UN",
                "due_date": None,
                "reminder_set": False
            },
            {
                "title": "Reply to emails",
                "quadrant": "NI",
                "due_date": None,
                "reminder_set": False
            },
            {
                "title": "Team meeting",
                "quadrant": "NI",
                "due_date": None,
                "reminder_set": False
            }
        ]
        
        for task_data in sample_tasks:
            task = Task(**task_data)
            db.session.add(task)
        db.session.commit()

with app.app_context():
    db.drop_all()  # Drop all existing tables
    db.create_all()  # Create tables with new schema
    add_sample_tasks()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
