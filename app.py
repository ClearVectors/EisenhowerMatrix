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
        task = Task()
        task.title = task_data['title']
        task.description = task_data['description']
        task.category = task_data['category']
        task.due_date = task_data['due_date']
        task.quadrant = task_data['quadrant']
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
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        required_fields = ['title', 'category', 'due_date', 'quadrant']
        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            return jsonify({'error': f'Missing required fields: {", ".join(missing_fields)}'}), 400

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

    except ValueError as e:
        db.session.rollback()
        return jsonify({'error': 'Invalid date format'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    try:
        task = Task.query.get_or_404(task_id)
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        if 'completed' in data:
            task.completed = data['completed']
        else:
            # Validate required fields for task update
            if 'title' not in data or not data['title'].strip():
                return jsonify({'error': 'Title is required'}), 400
            if 'quadrant' not in data:
                return jsonify({'error': 'Quadrant is required'}), 400
            if 'category' not in data:
                return jsonify({'error': 'Category is required'}), 400

            task.title = data['title'].strip()
            task.description = data.get('description', '').strip()
            task.category = data['category']
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

@app.route('/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    try:
        task = Task.query.get_or_404(task_id)
        db.session.delete(task)
        db.session.commit()
        return jsonify({'message': 'Task deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

with app.app_context():
    db.create_all()
    # Add sample tasks if none exist
    if Task.query.count() == 0:
        add_sample_tasks()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
