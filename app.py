from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

# Konfiguration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Finanzmodell für Einnahmen & Ausgaben
class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(10))  # "income" oder "expense"
    category = db.Column(db.String(50))
    amount = db.Column(db.Float, nullable=False)
    date = db.Column(db.String(10))
    description = db.Column(db.String(200))

# Datenbank erstellen
with app.app_context():
    db.create_all()

# Endpunkt: Transaktionen erfassen
@app.route('/transactions', methods=['POST'])
def add_transaction():
    data = request.json
    new_transaction = Transaction(
        type=data['type'],
        category=data['category'],
        amount=data['amount'],
        date=data['date'],
        description=data.get('description', '')
    )
    db.session.add(new_transaction)
    db.session.commit()
    return jsonify({"message": "Transaction added successfully!"}), 201

# Endpunkt: Alle Transaktionen abrufen
@app.route('/transactions', methods=['GET'])
def get_transactions():
    transactions = Transaction.query.all()
    result = [
        {"id": t.id, "type": t.type, "category": t.category, "amount": t.amount, "date": t.date, "description": t.description}
        for t in transactions
    ]
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True)
