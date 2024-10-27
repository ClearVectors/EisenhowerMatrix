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
                task.category_rel.name if task.category_rel else '',
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
        work_category = Category.query.filter_by(name='Work').first()
        health_category = Category.query.filter_by(name='Health').first()
        learning_category = Category.query.filter_by(name='Learning').first()
        
        tasks = [
            {
                'title': 'Health Checkup',
                'description': 'Annual medical examination',
                'category_id': health_category.id if health_category else None,
                'due_date': datetime.now() + timedelta(days=1),
                'quadrant': 'urgent-important'
            },
            {
                'title': 'Learn React Basics',
                'description': 'Complete React fundamentals course',
                'category_id': learning_category.id if learning_category else None,
                'due_date': datetime.now() + timedelta(days=4),
                'quadrant': 'not-urgent-important'
            },
            {
                'title': 'Team Lunch',
                'description': 'Coordinate team lunch meetup',
                'category_id': work_category.id if work_category else None,
                'due_date': datetime.now() + timedelta(days=2),
                'quadrant': 'urgent-not-important'
            },
            {
                'title': 'Medical Appointment Analysis',
                'description': 'Annual health checkup',
                'category_id': health_category.id if health_category else None,
                'due_date': datetime.now() + timedelta(days=9),
                'quadrant': 'not-urgent-not-important'
            }
        ]
        
        for task_data in tasks:
            task = Task()
            task.title = task_data['title']
            task.description = task_data['description']
            task.category_id = task_data['category_id']
            task.due_date = task_data['due_date']
            task.quadrant = task_data['quadrant']
            db.session.add(task)
        
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        raise

def _get_categories():
    try:
        categories = Category.query.all()
        return jsonify([{
            'id': category.id,
            'name': category.name,
            'color': category.color,
            'icon': category.icon,
            'task_count': len(category.tasks)
        } for category in categories])
    except Exception as e:
        return jsonify({'error': 'Failed to fetch categories'}), 500

@app.route('/categories', methods=['GET'])
def get_categories():
    return with_retry(_get_categories)()

def _create_category():
    try:
        data = request.get_json()
        if not data or not data.get('name') or not data.get('color'):
            return jsonify({'error': 'Name and color are required'}), 400

        category = Category(
            name=data['name'],
            color=data['color'],
            icon=data.get('icon', 'bi-tag')
        )
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

@app.route('/categories', methods=['POST'])
def create_category():
    return with_retry(_create_category)()

def _update_category(category_id):
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

@app.route('/categories/<int:category_id>', methods=['PUT'])
def update_category(category_id):
    return with_retry(_update_category)(category_id)

def _delete_category(category_id):
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

@app.route('/categories/<int:category_id>', methods=['DELETE'])
def delete_category(category_id):
    return with_retry(_delete_category)(category_id)

def _get_index_data():
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

@app.route('/')
def index():
    return with_retry(_get_index_data)()

def _get_tasks():
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
        task.category_id = data.get('category_id')
        task.due_date = datetime.fromisoformat(data['due_date'])
        task.quadrant = data['quadrant']
        
        db.session.add(task)
        db.session.commit()
        
        return jsonify({
            'id': task.id,
            'title': task.title,
            'description': task.description,
            'category': task.category_rel.name if task.category_rel else None,
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
            if 'category_id' in data:
                task.category_id = data['category_id']
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
            'category': task.category_rel.name if task.category_rel else None,
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

def _init_default_categories():
    default_categories = [
        {'name': 'Work', 'color': '#EF4444', 'icon': 'bi-briefcase'},
        {'name': 'Personal', 'color': '#3B82F6', 'icon': 'bi-person'},
        {'name': 'Health', 'color': '#22C55E', 'icon': 'bi-heart-pulse'},
        {'name': 'Learning', 'color': '#8B5CF6', 'icon': 'bi-book'},
        {'name': 'Shopping', 'color': '#F97316', 'icon': 'bi-cart'}
    ]
    
    for cat_data in default_categories:
        if not Category.query.filter_by(name=cat_data['name']).first():
            category = Category(**cat_data)
            db.session.add(category)
    
    db.session.commit()

with app.app_context():
    db.create_all()
    _init_default_categories()
    if Task.query.count() == 0:
        with_retry(_add_sample_tasks)()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
