import pytest
import requests
import pyotp

# Teste die Registrierung
# @pytest.mark.parametrize("email, password", [
#     ("testuser1@example.com", "Podui%$39d8&8/)"),
#     ("testuser2@example.com", "Podui%$39d8&8/)")
# ])
# def test_registration(email, password):
#     url = 'http://localhost:5000/register'
#     headers = {'Content-Type': 'application/json'}
#     data = {'email': email, 'password': password}

#     response = requests.post(url, json=data, headers=headers)
#     assert response.status_code == 200
#     assert response.json()['success'] is True
#     assert 'qrCodeUrl' in response.json()
#     assert 'secret' in response.json()

def test_login():
    """Testet den Login mit MFA-Unterstützung."""
    mfa_secret = "54PTNWRPMZHHUKD7NO4OCL5CPDK4AU7S"

    url = 'http://localhost:5000/login'
    headers = {'Content-Type': 'application/json'}
    data = {'email': 'testuser1@example.com', 'password': 'Podui%$39d8&8/)'}

    response = requests.post(url, json=data, headers=headers)
    print("Login:", response.status_code, response.json())

    # Falls MFA erforderlich ist, generiere den richtigen Code
    if response.json().get("mfaRequired"):
        totp = pyotp.TOTP(mfa_secret)  # TOTP-Instanz mit bekanntem Secret erzeugen
        mfa_code = totp.now()  # Aktuellen 6-stelligen Code generieren

        # Login erneut mit MFA-Code senden
        data["mfaCode"] = mfa_code
        response = requests.post(url, json=data, headers=headers)
        print("Login mit MFA:", response.status_code, response.json())

    # Test-Assertions
    assert response.status_code == 200, f"Fehler: {response.json()}"
    assert response.json().get("success") is True, f"Fehler: {response.json()}"
    assert "token" in response.json(), "Kein Token erhalten!"

def login_and_get_token():
    url = 'http://localhost:5000/login'
    headers = {'Content-Type': 'application/json'}
    data = {
        'email': 'testuser1@example.com',
        'password': 'Podui%$39d8&8/)'  # Dein Passwort
    }

    response = requests.post(url, json=data, headers=headers)
    
    if response.status_code == 200 and response.json().get("success"):
        token = response.json().get("token")
        print(f"Access Token: {token}")
        return token
    else:
        print(f"Fehler beim Login: {response.status_code}, {response.json()}")
        return None

# Teste das Hinzufügen einer Transaktion
def test_add_transaction():
    # Holen des Access Tokens
    token = login_and_get_token()
    if not token:
        print("Kein Token erhalten, Test wird abgebrochen!")
        return

    url = 'http://localhost:5000/api/transactions'
    headers = {'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}
    data = {
        'type': 'expense',
        'amount': 100.0,
        'category': 'Food',
        'date': '2025-02-04'
    }

    response = requests.post(url, json=data, headers=headers)
    print("Transaktion Hinzufügen:", response.status_code, response.json())
    assert response.status_code == 201
    assert 'id' in response.json()

# Teste das Abrufen von Transaktionen
def test_get_transactions():
    # Holen des Access Tokens
    token = login_and_get_token()
    if not token:
        print("Kein Token erhalten, Test wird abgebrochen!")
        return

    url = 'http://localhost:5000/api/transactions'
    headers = {'Authorization': f'Bearer {token}'}

    response = requests.get(url, headers=headers)
    print("Transaktionen Abrufen:", response.status_code, response.json())
    
    assert response.status_code == 200
    assert isinstance(response.json(), list)
