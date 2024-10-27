from flask import Flask, render_template, jsonify, request, make_response
from datetime import datetime, timedelta
import os
from models import db, Task, Category
from io import StringIO
import csv
import time
from sqlalchemy.exc import SQLAlchemyError

app = Flask(__name__)

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
                time.sleep(1)
    return wrapper

@app.route('/')
def index():
    try:
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
    except Exception as e:
        return jsonify({'error': 'Failed to load dashboard'}), 500

@app.route('/tasks', methods=['GET'])
def get_tasks():
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

@app.route('/tasks/export', methods=['GET'])
def export_tasks():
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

@app.route('/tasks', methods=['POST'])
def create_task():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

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
        }), 201
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
            if 'title' in data:
                task.title = data['title'].strip()
            if 'description' in data:
                task.description = data.get('description', '').strip()
            if 'category' in data:
                task.category = data['category']
            if 'quadrant' in data:
                task.quadrant = data['quadrant']
            if 'due_date' in data:
                task.due_date = datetime.fromisoformat(data['due_date'])

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

@app.route('/categories', methods=['GET'])
def get_categories():
    try:
        categories = Category.query.all()
        return jsonify([{
            'id': cat.id,
            'name': cat.name,
            'color': cat.color,
            'icon': cat.icon
        } for cat in categories])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/categories/<int:category_id>', methods=['GET'])
def get_category(category_id):
    try:
        category = Category.query.get_or_404(category_id)
        return jsonify({
            'id': category.id,
            'name': category.name,
            'color': category.color,
            'icon': category.icon
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/categories', methods=['POST'])
def create_category():
    try:
        data = request.get_json()
        if not data or not all(k in data for k in ['name', 'color', 'icon']):
            return jsonify({'error': 'Missing required fields'}), 400

        existing_category = Category.query.filter_by(name=data['name'].strip()).first()
        if existing_category:
            return jsonify({'error': 'Category name must be unique'}), 400

        category = Category()
        category.name = data['name'].strip()
        category.color = data['color'].strip()
        category.icon = data['icon'].strip()
        
        db.session.add(category)
        db.session.commit()

        return jsonify({
            'id': category.id,
            'name': category.name,
            'color': category.color,
            'icon': category.icon
        }), 201
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/categories/<int:category_id>', methods=['PUT'])
def update_category(category_id):
    try:
        category = Category.query.get_or_404(category_id)
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        if 'name' in data:
            existing_category = Category.query.filter(
                Category.name == data['name'].strip(),
                Category.id != category_id
            ).first()
            if existing_category:
                return jsonify({'error': 'Category name must be unique'}), 400
            category.name = data['name'].strip()
            
        if 'color' in data:
            category.color = data['color'].strip()
        if 'icon' in data:
            category.icon = data['icon'].strip()

        db.session.commit()
        
        return jsonify({
            'id': category.id,
            'name': category.name,
            'color': category.color,
            'icon': category.icon,
            'message': 'Category updated successfully'
        })
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({'error': 'Database error occurred'}), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/categories/<int:category_id>', methods=['DELETE'])
def delete_category(category_id):
    try:
        category = Category.query.get_or_404(category_id)
        db.session.delete(category)
        db.session.commit()
        return jsonify({'message': 'Category deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
