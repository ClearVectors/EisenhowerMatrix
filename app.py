from flask import Flask, render_template, jsonify, request
from datetime import datetime, timedelta
import os
from models import db, Task

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ['DATABASE_URL']
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

def add_sample_tasks():
    # Clear existing tasks
    Task.query.delete()
    
    # Sample tasks data
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
        task = Task(
            title=task_data['title'],
            description=task_data['description'],
            category=task_data['category'],
            due_date=task_data['due_date'],
            quadrant=task_data['quadrant']
        )
        db.session.add(task)
    
    db.session.commit()

@app.route('/')
def index():
    overdue_count = Task.query.filter(Task.due_date < datetime.now(), Task.completed == False).count()
    due_today_count = Task.query.filter(
        Task.due_date >= datetime.now(),
        Task.due_date < datetime.now() + timedelta(days=1),
        Task.completed == False
    ).count()
    due_this_week_count = Task.query.filter(
        Task.due_date >= datetime.now() + timedelta(days=1),
        Task.due_date < datetime.now() + timedelta(days=7),
        Task.completed == False
    ).count()
    
    return render_template('index.html',
                         overdue_count=overdue_count,
                         due_today_count=due_today_count,
                         due_this_week_count=due_this_week_count)

@app.route('/tasks', methods=['GET'])
def get_tasks():
    tasks = Task.query.all()
    return jsonify([{
        'id': task.id,
        'title': task.title,
        'description': task.description,
        'category': task.category,
        'due_date': task.due_date.isoformat(),
        'quadrant': task.quadrant,
        'completed': task.completed
    } for task in tasks])

@app.route('/tasks', methods=['POST'])
def create_task():
    data = request.json
    task = Task(
        title=data['title'],
        description=data.get('description', ''),
        category=data['category'],
        due_date=datetime.fromisoformat(data['due_date']),
        quadrant=data['quadrant']
    )
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
    })

@app.route('/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    task = Task.query.get_or_404(task_id)
    data = request.json
    if 'completed' in data:
        task.completed = data['completed']
    if 'quadrant' in data:
        task.quadrant = data['quadrant']
    db.session.commit()
    return jsonify({
        'id': task.id,
        'title': task.title,
        'description': task.description,
        'category': task.category,
        'due_date': task.due_date.isoformat(),
        'quadrant': task.quadrant,
        'completed': task.completed
    })

@app.route('/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()
    return jsonify({'result': True})

with app.app_context():
    db.create_all()
    # Add sample tasks if none exist
    if Task.query.count() == 0:
        add_sample_tasks()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
