from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.dialects.postgresql import ARRAY

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

class Task(db.Model):
    __tablename__ = 'tasks'  # Explicitly set table name
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    quadrant = db.Column(db.String(20), nullable=False)  # UI, UN, NI, NN
    completed = db.Column(db.Boolean, default=False)
    due_date = db.Column(db.DateTime, nullable=True)
    reminder_set = db.Column(db.Boolean, default=False)
    tags = db.Column(ARRAY(db.String), default=list)  # New field for tags
