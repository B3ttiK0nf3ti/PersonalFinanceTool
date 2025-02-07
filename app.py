import base64
import logging
import pyotp
from flask import Flask, make_response, request, jsonify, send_file, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import bcrypt
from logging import FileHandler
import qrcode
from io import BytesIO
from flask_jwt_extended import JWTManager, create_access_token
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
import calendar
import secrets
import smtplib
from flask_mail import Mail, Message

# Flask-App initialisieren
app = Flask(__name__)

# App Konfigurationen
app.config["MAIL_SERVER"] = "smtp.mailtrap.io"  # Mailtrap SMTP-Server
app.config["MAIL_PORT"] = 587  # Port 587 für TLS
app.config["MAIL_USERNAME"] = "3b0d4febcdb859"  # Dein Mailtrap Benutzername
app.config["MAIL_PASSWORD"] = "a79ee474e7d0b2"  # Dein Mailtrap Passwort
app.config["MAIL_USE_TLS"] = True  # TLS aktivieren
app.config["MAIL_USE_SSL"] = False  # SSL deaktivieren

mail = Mail(app)

# Dictionary zum Speichern der Reset-Tokens temporär
reset_tokens = {}

app.config["JWT_SECRET_KEY"] = "dein_geheimes_schluessel"
jwt = JWTManager(app)

# Log-Level und Dateipfad für Fehlerlogs
app.logger.setLevel(logging.DEBUG)

# Fehlerbehandlung
@app.errorhandler(500)
def internal_error(error):
    app.logger.error(f'Error 500: {error}')
    return 'Internal Server Error', 500

# Cross-Origin Resource Sharing (CORS) für alle Ursprünge aktivieren
CORS(app, resources={r"/*": {"origins": "*"}})

# Konfiguration für SQLAlchemy
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Benutzer-Modell für Registrierung und Anmeldung
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    secret = db.Column(db.String(255), nullable=True)  # Für MFA geheimen Schlüssel

# DB-Modell für Transaktionen
class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_email = db.Column(db.String(120), nullable=False)  # Benutzer-E-Mail
    type = db.Column(db.String(50), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    date = db.Column(db.String(50), nullable=False)
    description = db.Column(db.String(255), nullable=True)
    is_recurring = db.Column(db.Integer, nullable=False, default=0)  # 0 bedeutet false, 1 bedeutet true
    recurrence_type = db.Column(db.String(50), nullable=True)
    next_due_date = db.Column(db.String(50), nullable=True)

# Datenbank erstellen
with app.app_context():
    db.create_all()

# Passwortstärkeprüfung im Backend
def is_strong_password(password):
    if len(password) < 8:
        return False
    if not any(char.isdigit() for char in password):
        return False
    if not any(char.isupper() for char in password):
        return False
    if not any(char in "!@#$%^&*()_+" for char in password):
        return False
    return True

def calculate_next_due_date(start_date, recurrence_type):
    # Startdatum in datetime-Objekt umwandeln
    start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')

    if recurrence_type == 'Wöchentlich':
        # 7 Tage zu dem Startdatum hinzufügen
        next_due_date = start_date_obj + timedelta(weeks=1)
    elif recurrence_type == 'Monatlich':
        # Einen Monat zum Startdatum hinzufügen
        next_month = start_date_obj.month % 12 + 1
        next_year = start_date_obj.year + (start_date_obj.month // 12)
        day = min(start_date_obj.day, calendar.monthrange(next_year, next_month)[1])
        next_due_date = start_date_obj.replace(year=next_year, month=next_month, day=day)
    elif recurrence_type == 'Quartal':
        # Drei Monate zum Startdatum hinzufügen
        next_month = (start_date_obj.month + 3) % 12
        next_year = start_date_obj.year + ((start_date_obj.month + 3) // 12)
        day = min(start_date_obj.day, calendar.monthrange(next_year, next_month)[1])
        next_due_date = start_date_obj.replace(year=next_year, month=next_month, day=day)
    else:
        # Keine Wiederholung (oder unbekannter Typ), keine Änderung des Datums
        next_due_date = None

    if next_due_date:
        print(f"Berechnetes nächstes Fälligkeitsdatum: {next_due_date}")
    else:
        print(f"Kein nächstes Fälligkeitsdatum aufgrund des Typs: {recurrence_type}")

    return next_due_date

# Endpunkt: Benutzer registrieren
@app.route('/register', methods=['POST'])
def register():
    email = request.json.get('email')
    password = request.json.get('password')

    # Überprüfe, ob der Benutzer bereits existiert
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"success": False, "message": "E-Mail-Adresse ist bereits registriert!"})

    # Überprüfe, ob das Passwort stark genug ist
    if not is_strong_password(password):
        return jsonify({"success": False, "message": "Das Passwort muss mindestens 8 Zeichen lang sein und Zahlen, Großbuchstaben und Sonderzeichen enthalten!"})

    # Passwort hashen
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

    # Generiere einen geheimen Schlüssel für den Benutzer (für MFA)
    totp = pyotp.TOTP(pyotp.random_base32())
    secret = totp.secret

    # Speichern in der Datenbank
    new_user = User(email=email, password=hashed_password, secret=secret)
    db.session.add(new_user)
    db.session.commit()

    # Generiere den QR-Code URI
    uri = totp.provisioning_uri(name=email, issuer_name="PersonalFinanceTool")
    print("Generierte MFA-URI:", uri)  # Debugging-Ausgabe in der Konsole

    # Erzeuge den QR-Code
    img = qrcode.make(uri)

    # Speichern des QR-Codes im Speicher als Base64
    img_io = BytesIO()
    img.save(img_io, 'PNG')
    img_io.seek(0)
    img_base64 = base64.b64encode(img_io.getvalue()).decode('utf-8')

    # Rückgabe des QR-Codes als Base64-encoded Bild
    return jsonify({
        "success": True,
        "message": "Registrierung erfolgreich!",
        "qrCodeUrl": f"data:image/png;base64,{img_base64}",  # Geben wir das Base64-Bild zurück
        "secret": secret
    })

# Endpunkt: Benutzeranmeldung (QR-Code entfernen)
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")
    mfa_code = data.get("mfaCode")

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"success": False, "message": "Benutzer nicht gefunden!"}), 404

    if bcrypt.checkpw(password.encode('utf-8'), user.password):
        app.logger.debug(f"Benutzer {user.email} versucht sich einzuloggen. Secret vorhanden: {bool(user.secret)}")

        if user.secret and user.secret.strip():
            if not mfa_code:
                return jsonify({"success": False, "mfaRequired": True, "message": "MFA erforderlich"})

            if verify_mfa_code(user.secret, mfa_code):  # Hier richtige Funktion verwenden
                token = create_access_token(identity=user.email, expires_delta=False)
                return jsonify({"success": True, "token": token})
            else:
                return jsonify({"success": False, "message": "Ungültiger MFA-Code"}), 400

        token = create_access_token(identity=user.email)
        return jsonify({"success": True, "token": token})

    return jsonify({"success": False, "message": "Falsches Passwort!"}), 400


# Funktion zur MFA-Code-Verifizierung
def verify_mfa_code(secret, code):
    totp = pyotp.TOTP(secret)
    return totp.verify(code)

# Endpunkt: MFA-Code verifizieren
@app.route('/verify-mfa', methods=['POST'])
def verify_mfa():
    data = request.json
    email = data.get('email')
    mfa_code = data.get('mfaCode')

    # Benutzer in der Datenbank suchen
    user = User.query.filter_by(email=email).first()
    if not user or not user.secret:
        return jsonify({"success": False, "message": "Kein MFA für diesen Benutzer aktiviert!"})

    # MFA-Code verifizieren
    totp = pyotp.TOTP(user.secret)
    if totp.verify(mfa_code):
        app.logger.debug(f"MFA erfolgreich für Benutzer {email} verifiziert!")

        # Hier leitet man den Benutzer zum Dashboard weiter
        return jsonify({"success": True, "message": "MFA erfolgreich verifiziert!", "redirectUrl": url_for('dashboard')})
    else:
        return jsonify({"success": False, "message": "Ungültiger MFA-Code!"})
    

@app.route('/api/transactions', methods=['POST'])
@jwt_required()
def add_transaction():
    try:
        # Holen der E-Mail des Benutzers aus dem JWT
        user_email = get_jwt_identity()
        print(f"Aktueller Benutzer: {user_email}") 
        
        # Transaktionsdaten aus dem JSON extrahieren
        data = request.get_json()
        print(f"Empfangene Transaktionsdaten: {data}")
        
        # Sicherstellen, dass die erforderlichen Felder vorhanden sind
        required_fields = ['type', 'amount', 'category', 'date']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            raise ValueError(f"Fehlende erforderliche Felder: {', '.join(missing_fields)}")
        
        # Das Datum vor der Verarbeitung debuggen
        transaction_date_str = data['date'].strip() 
        print(f"Parsing Datum: {transaction_date_str}")

        # Überprüfen, ob das Datum im richtigen Format ist
        try:
            datetime.strptime(data['date'].strip(), '%Y-%m-%d')
        except ValueError:
            return jsonify({"error": "Das angegebene Datum ist ungültig. Bitte das Datum im Format 'YYYY-MM-DD' eingeben."}), 400

        # Umwandeln des Datums in einen Unix-Zeitstempel (falls vorhanden)
        next_due_date = data.get('nextDueDate', None)
        if not next_due_date and data.get('isRecurring', False):
            # Berechne das nextDueDate, wenn es nicht angegeben wurde und die Transaktion wiederkehrend ist
            next_due_date = calculate_next_due_date(data['date'], data['recurrenceType'])
            
            # Wenn next_due_date berechnet wurde, formatiere es im Format 'YYYY-MM-DD'
            if next_due_date:
                next_due_date = next_due_date.strftime('%Y-%m-%d')
        
        print(f"Berechnetes Next Due Date: {next_due_date}")

        # Sicherstellen, dass 'isRecurring' korrekt gesetzt ist (1 für Ja, 0 für Nein)
        is_recurring = 1 if data.get('isRecurring', False) else 0

        # Transaktion erstellen
        new_transaction = Transaction(
            user_email=user_email,  
            type=data['type'],
            amount=data['amount'],
            category=data['category'],
            date=data['date'],
            description=data.get('description', ""),
            is_recurring=is_recurring,  
            recurrence_type=data.get('recurrenceType', None),
            next_due_date=next_due_date  
        )

        # Transaktion in der DB speichern
        db.session.add(new_transaction)
        db.session.commit()

        # Erfolgreiche Antwort
        return jsonify({
            "id": new_transaction.id,
            "user_email": new_transaction.user_email,
            "type": new_transaction.type,
            "amount": new_transaction.amount,
            "category": new_transaction.category,
            "date": new_transaction.date,
            "description": new_transaction.description,
            "next_due_date": new_transaction.next_due_date
        }), 201  # Statuscode 201 für erfolgreiches Erstellen
        
    except Exception as e:
        print(f"Fehler beim Hinzufügen der Transaktion: {str(e)}")  
        return jsonify({"error": f"Fehler beim Speichern der Transaktion: {str(e)}"}), 500  

@app.route('/api/transactions', methods=['GET'])
@jwt_required()
def get_transactions():
    try:
        user_email = get_jwt_identity()
        print(f"Benutzer E-Mail aus JWT: {user_email}")

        transactions = Transaction.query.filter_by(user_email=user_email).all()
        
        if not transactions:
            print("Keine Transaktionen gefunden.")
            return jsonify({"message": "No transactions found"}), 404

        return jsonify([
            {
                "id": t.id,
                "type": t.type,
                "amount": t.amount,
                "category": t.category,
                "date": t.date,
                "description": t.description,
                "isRecurring": t.is_recurring,  
                "recurrenceType": t.recurrence_type
            } for t in transactions
        ])

    except Exception as e:
        print(f"Fehler: {e}")
        return jsonify({"message": "Fehler beim Abrufen der Transaktionen"}), 500


@app.route('/api/transactions/<int:transaction_id>', methods=['DELETE'])
@jwt_required()
def delete_transaction(transaction_id):
    try:
        # Holen des Benutzers aus dem JWT
        user_email = get_jwt_identity()

        # Finden der Transaktion in der DB
        transaction = Transaction.query.filter_by(id=transaction_id, user_email=user_email).first()
        if not transaction:
            return jsonify({"error": "Transaktion nicht gefunden."}), 404

        # Löschen der Transaktion
        db.session.delete(transaction)
        db.session.commit()

        return jsonify({"message": "Transaktion erfolgreich gelöscht."}), 200

    except Exception as e:
        return jsonify({"error": f"Fehler beim Löschen der Transaktion: {str(e)}"}), 500

# Passwort-Reset anfordern
@app.route('/request-password-reset', methods=['POST'])
def request_password_reset():
    data = request.json
    email = data.get("email")

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"success": False, "message": "E-Mail nicht gefunden!"}), 404

    # Erzeuge einen zufälligen Token
    token = secrets.token_hex(16)
    reset_tokens[email] = token  

    # E-Mail mit dem Token senden
    sender_email = "deineemail@example.com" 
    recipient_email = email
    subject = "Passwort zurücksetzen"
    body = f"Hier ist dein Reset-Token: {token}"

    try:
        msg = Message(subject, sender=sender_email, recipients=[recipient_email])
        msg.body = body
        mail.send(msg)
        
        return jsonify({"success": True, "message": "Reset-Token gesendet!"})
    except Exception as e:
        return jsonify({"success": False, "message": f"E-Mail konnte nicht gesendet werden: {str(e)}"}), 500

# Passwort mit Token zurücksetzen
@app.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.json
    email = data.get("email")
    token = data.get("token")
    new_password = data.get("newPassword")

    if email not in reset_tokens or reset_tokens[email] != token:
        return jsonify({"success": False, "message": "Ungültiger oder abgelaufener Token!"}), 400

    if not is_strong_password(new_password):
        return jsonify({"success": False, "message": "Schwaches Passwort!"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"success": False, "message": "Benutzer nicht gefunden!"}), 404

    # Neues Passwort hashen und speichern
    hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
    user.password = hashed_password
    db.session.commit()

    # Token entfernen, damit es nicht erneut verwendet werden kann
    del reset_tokens[email]

    return jsonify({"success": True, "message": "Passwort erfolgreich zurückgesetzt!"})

if __name__ == '__main__':
    # Flask-Server starten
    app.run(debug=True)