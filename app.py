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

[rest of the existing app.py content remains unchanged]
