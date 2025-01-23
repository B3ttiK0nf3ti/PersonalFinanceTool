import base64
import logging
import pyotp
from flask import Flask, request, jsonify, send_file, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import bcrypt
from logging import FileHandler
import qrcode
from io import BytesIO
from flask_jwt_extended import JWTManager, create_access_token


# Flask-App initialisieren
app = Flask(__name__)

app.config["JWT_SECRET_KEY"] = "dein_geheimes_schluessel"
jwt = JWTManager(app)

# Log-Level und Dateipfad für Fehlerlogs
app.logger.setLevel(logging.DEBUG)
file_handler = FileHandler('app_errors.log')
app.logger.addHandler(file_handler)

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
    secret = totp.secret  # Dies ist der geheime Schlüssel, den der Benutzer mit einer Authenticator-App scannt

    # Speichern in der Datenbank
    new_user = User(email=email, password=hashed_password, secret=secret)
    db.session.add(new_user)
    db.session.commit()

    # Generiere den QR-Code URI
    uri = totp.provisioning_uri(name=email, issuer_name="MyApp")

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
        "qrCodeUrl": f"data:image/png;base64,{img_base64}"  # Geben wir das Base64-Bild zurück
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
                token = create_access_token(identity=user.email)
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
    

if __name__ == '__main__':
    # Flask-Server starten
    app.run(debug=True)
