from flask import Flask, render_template, jsonify, request, make_response
from datetime import datetime, timedelta
import os
from models import db, Task, Category
from io import StringIO
import csv
import time
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import or_, and_, desc, asc

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
        
        categories = Category.query.all()
        return render_template('index.html',
                           overdue_count=overdue_count,
                           due_today_count=due_today_count,
                           due_this_week_count=due_this_week_count,
                           categories=categories)
    except Exception as e:
        return jsonify({'error': 'Failed to load dashboard'}), 500

@app.route('/tasks', methods=['GET'])
def get_tasks():
    try:
        # Get filter parameters
        filter_type = request.args.get('filter', 'all')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        categories = request.args.getlist('categories')
        show_completed = request.args.get('show_completed', 'false').lower() == 'true'
        sort_by = request.args.get('sort_by', 'due_date')
        sort_order = request.args.get('sort_order', 'asc')

        # Start with base query
        query = Task.query

        # Apply filters
        if not show_completed:
            query = query.filter(Task.completed == False)

        if date_from:
            try:
                from_date = datetime.fromisoformat(date_from)
                query = query.filter(Task.due_date >= from_date)
            except ValueError:
                pass

        if date_to:
            try:
                to_date = datetime.fromisoformat(date_to)
                query = query.filter(Task.due_date <= to_date)
            except ValueError:
                pass

        if categories:
            query = query.filter(Task.category_id.in_([int(c) for c in categories]))

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

        # Apply sorting
        if sort_by == 'due_date':
            query = query.order_by(desc(Task.due_date) if sort_order == 'desc' else asc(Task.due_date))
        elif sort_by == 'title':
            query = query.order_by(desc(Task.title) if sort_order == 'desc' else asc(Task.title))
        elif sort_by == 'category':
            query = query.join(Category).order_by(
                desc(Category.name) if sort_order == 'desc' else asc(Category.name)
            )

        tasks = query.all()
        return jsonify([{
            'id': task.id,
            'title': task.title,
            'description': task.description,
            'category_id': task.category_id,
            'category': {
                'id': task.category_rel.id,
                'name': task.category_rel.name,
                'color': task.category_rel.color,
                'icon': task.category_rel.icon
            } if task.category_rel else None,
            'due_date': task.due_date.isoformat(),
            'quadrant': task.quadrant,
            'completed': task.completed
        } for task in tasks])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/tasks', methods=['POST'])
def create_task():
    try:
        data = request.get_json()
        task = Task()
        task.title = data['title']
        task.description = data.get('description', '')
        task.category_id = data.get('category_id')
        task.due_date = datetime.fromisoformat(data['due_date'])
        task.quadrant = data['quadrant']
        
        db.session.add(task)
        db.session.commit()
        
        return jsonify({
            'id': task.id,
            'title': task.title,
            'description': task.description,
            'category_id': task.category_id,
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
        
        if 'title' in data:
            task.title = data['title']
        if 'description' in data:
            task.description = data['description']
        if 'category_id' in data:
            task.category_id = data['category_id']
        if 'due_date' in data:
            task.due_date = datetime.fromisoformat(data['due_date'])
        if 'quadrant' in data:
            task.quadrant = data['quadrant']
        if 'completed' in data:
            task.completed = data['completed']

        db.session.commit()
        return jsonify({
            'id': task.id,
            'title': task.title,
            'description': task.description,
            'category_id': task.category_id,
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
            'id': category.id,
            'name': category.name,
            'color': category.color,
            'icon': category.icon
        } for category in categories])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/categories', methods=['POST'])
def create_category():
    try:
        data = request.get_json()
        if not data or not data.get('name') or not data.get('color'):
            return jsonify({'error': 'Name and color are required'}), 400

        category = Category()
        category.name = data['name']
        category.color = data['color']
        category.icon = data.get('icon', 'bi-tag')
        
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
        if 'unique constraint' in str(e).lower():
            return jsonify({'error': 'Category name already exists'}), 400
        return jsonify({'error': 'Database error occurred'}), 500

@app.route('/categories/<int:category_id>', methods=['PUT'])
def update_category(category_id):
    try:
        category = Category.query.get_or_404(category_id)
        data = request.get_json()
        
        if 'name' in data:
            category.name = data['name']
        if 'color' in data:
            category.color = data['color']
        if 'icon' in data:
            category.icon = data['icon']

        db.session.commit()
        return jsonify({
            'id': category.id,
            'name': category.name,
            'color': category.color,
            'icon': category.icon
        })
    except SQLAlchemyError as e:
        db.session.rollback()
        if 'unique constraint' in str(e).lower():
            return jsonify({'error': 'Category name already exists'}), 400
        return jsonify({'error': 'Database error occurred'}), 500

@app.route('/categories/<int:category_id>', methods=['DELETE'])
def delete_category(category_id):
    try:
        category = Category.query.get_or_404(category_id)
        if len(category.tasks) > 0:
            return jsonify({
                'error': 'Category cannot be deleted because it has associated tasks',
                'task_count': len(category.tasks)
            }), 400
        
        db.session.delete(category)
        db.session.commit()
        return jsonify({'message': 'Category deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

def init_default_categories():
    default_categories = [
        {'name': 'Work', 'color': '#EF4444', 'icon': 'bi-briefcase'},
        {'name': 'Personal', 'color': '#3B82F6', 'icon': 'bi-person'},
        {'name': 'Health', 'color': '#22C55E', 'icon': 'bi-heart-pulse'},
        {'name': 'Learning', 'color': '#8B5CF6', 'icon': 'bi-book'},
        {'name': 'Shopping', 'color': '#F97316', 'icon': 'bi-cart'}
    ]
    
    try:
        for cat_data in default_categories:
            if not Category.query.filter_by(name=cat_data['name']).first():
                category = Category()
                category.name = cat_data['name']
                category.color = cat_data['color']
                category.icon = cat_data['icon']
                db.session.add(category)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Error initializing default categories: {e}")

with app.app_context():
    db.create_all()
    init_default_categories()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
