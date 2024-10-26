import os
from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)
app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY") or "eisenhower_matrix_key"
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
db.init_app(app)

from models import Task

@app.route('/')
def index():
    tasks = Task.query.all()
    return render_template('index.html', tasks=tasks)

@app.route('/tasks', methods=['GET'])
def get_tasks():
    tasks = Task.query.all()
    return jsonify([{
        'id': task.id,
        'title': task.title,
        'quadrant': task.quadrant,
        'completed': task.completed
    } for task in tasks])

@app.route('/tasks', methods=['POST'])
def create_task():
    data = request.json
    task = Task(
        title=data['title'],
        quadrant=data['quadrant'],
        completed=False
    )
    db.session.add(task)
    db.session.commit()
    return jsonify({"id": task.id, "title": task.title, "quadrant": task.quadrant})

@app.route('/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    task = Task.query.get_or_404(task_id)
    data = request.json
    task.quadrant = data.get('quadrant', task.quadrant)
    task.completed = data.get('completed', task.completed)
    db.session.commit()
    return jsonify({"success": True})

def add_sample_tasks():
    sample_tasks = [
        {"title": "Complete project deadline", "quadrant": "UI"},
        {"title": "Prepare presentation", "quadrant": "UI"},
        {"title": "Learn new programming language", "quadrant": "UN"},
        {"title": "Exercise routine", "quadrant": "UN"},
        {"title": "Reply to emails", "quadrant": "NI"},
        {"title": "Team meeting", "quadrant": "NI"},
        {"title": "Browse social media", "quadrant": "NN"},
        {"title": "Organize desk", "quadrant": "NN"}
    ]
    
    # Only add sample tasks if there are no tasks in the database
    if Task.query.count() == 0:
        for task_data in sample_tasks:
            task = Task(
                title=task_data["title"],
                quadrant=task_data["quadrant"],
                completed=False
            )
            db.session.add(task)
        db.session.commit()

with app.app_context():
    db.create_all()
    add_sample_tasks()
