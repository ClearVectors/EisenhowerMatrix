from app import db

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    quadrant = db.Column(db.String(20), nullable=False)  # UI, UN, NI, NN
    completed = db.Column(db.Boolean, default=False)
