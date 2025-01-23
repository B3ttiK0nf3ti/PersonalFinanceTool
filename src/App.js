import React, { useState } from "react";
import {
  Container,
  TextField,
  Button,
  Grid,
  Paper,
  Typography,
  Box,
  Snackbar,
  Alert,
} from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import axios from "axios";
import QRCode from "react-qr-code";

// Passwortvalidierung
const passwordValidation = (password) => {
  const regex =
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return regex.test(password);
};

const AuthForm = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    mfaCode: "",
  });
  const [message, setMessage] = useState("");
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState(""); // QR-Code URL, die hier vorbereitet wird

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSnackbarClose = () => {
    setOpenSnackbar(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Formular abgesendet!");
    setMessage("");

    // Passwort validieren
    if (!passwordValidation(formData.password)) {
      setMessage("Das Passwort ist zu schwach!");
      return;
    }

    try {
      // API-Request für Anmeldung oder Registrierung
      const url = isRegistering
        ? "http://127.0.0.1:5000/register"
        : "http://127.0.0.1:5000/login";

      // API-Request mit Passwort und MFA-Code
      const response = await axios.post(url, {
        email: formData.email,
        password: formData.password,
        mfaCode: formData.mfaCode, // MFA-Code wird immer mitgesendet
      });

      // Debugging-Ausgabe der Serverantwort
      console.log("Antwort vom Server:", response.data);

      // Serverantwort analysieren
      if (response.data.success) {
        if (isRegistering && response.data.qrCodeUrl) {
          setQrCodeUrl(response.data.qrCodeUrl); // QR-Code wird nur bei Registrierung gespeichert
        } else if (response.data.mfaRequired) {
          setSnackbarMessage(
            "MFA erforderlich. Bitte geben Sie Ihren MFA-Code ein."
          );
          setOpenSnackbar(true);
        } else {
          localStorage.setItem("authToken", response.data.token);
          onLogin(true); // Authentifizierung erfolgreich, weiter zum Dashboard
        }
      } else {
        setSnackbarMessage(response.data.message || "Unbekannter Fehler");
        setOpenSnackbar(true);
      }
    } catch (error) {
      console.log("Fehler beim API-Aufruf:", error.response?.data || error);
      setSnackbarMessage(error.response?.data?.message || "Fehler aufgetreten");
      setOpenSnackbar(true);
    }
  };

  return (
    <Container maxWidth="xs" style={{ marginTop: "100px" }}>
      <Paper style={{ padding: "20px" }}>
        <Typography variant="h5" align="center" gutterBottom>
          {isRegistering ? "Registrierung" : "Anmeldung"}
        </Typography>
        <form onSubmit={handleSubmit}>
          <Box mb={2}>
            <TextField
              fullWidth
              label="E-Mail"
              variant="outlined"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </Box>
          <Box mb={2}>
            <TextField
              fullWidth
              label="Passwort"
              variant="outlined"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            {message && <Typography color="error">{message}</Typography>}
          </Box>

          {(!isRegistering || qrCodeUrl) && (
            <Box mb={2}>
              <TextField
                fullWidth
                label="MFA-Code"
                variant="outlined"
                name="mfaCode"
                type="text"
                value={formData.mfaCode}
                onChange={handleChange}
                required
              />
            </Box>
          )}

          <Button type="submit" variant="contained" color="primary" fullWidth>
            {isRegistering ? "Registrieren" : "Anmelden"}
          </Button>
        </form>

        {/* QR-Code anzeigen, falls erforderlich */}
        {isRegistering && qrCodeUrl && (
          <Box mt={2} align="center">
            <Typography variant="h6">
              Scanne den QR-Code mit deiner Authenticator-App
            </Typography>
            <QRCode value={qrCodeUrl} />
          </Box>
        )}

        <Box mt={2}>
          <Button
            fullWidth
            color="secondary"
            onClick={() => setIsRegistering(!isRegistering)}
          >
            {isRegistering
              ? "Bereits ein Konto? Anmelden"
              : "Kein Konto? Registrieren"}
          </Button>
        </Box>
      </Paper>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={
            snackbarMessage.includes("erfolgreich") ? "success" : "error"
          }
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Zustand der Authentifizierung
  const [transaction, setTransaction] = useState({
    type: "",
    amount: "",
    category: "",
  });
  const [transactions, setTransactions] = useState([]);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const budget = 500;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTransaction({ ...transaction, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!transaction.type || !transaction.amount || !transaction.category) {
      alert("Bitte alle Felder ausfüllen!");
      return;
    }

    if (parseFloat(transaction.amount) > budget) {
      setOpenSnackbar(true);
    }

    setTransactions([...transactions, transaction]);
    setTransaction({ type: "", amount: "", category: "" });
  };

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false);
  };

  return (
    <>
      {!isAuthenticated ? (
        <AuthForm onLogin={setIsAuthenticated} />
      ) : (
        <Container maxWidth="sm" style={{ marginTop: "50px" }}>
          <Paper style={{ padding: "20px" }}>
            <Typography variant="h4" align="center" gutterBottom>
              Finanzübersicht
            </Typography>
            <form onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Typ (Einnahme/Ausgabe)"
                    variant="outlined"
                    name="type"
                    value={transaction.type}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Betrag"
                    variant="outlined"
                    name="amount"
                    type="number"
                    value={transaction.amount}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Kategorie"
                    variant="outlined"
                    name="category"
                    value={transaction.category}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    fullWidth
                  >
                    Hinzufügen
                  </Button>
                </Grid>
              </Grid>
            </form>
          </Paper>

          <Box marginTop={4}>
            <Typography variant="h6" gutterBottom>
              Transaktionen:
            </Typography>
            <Paper style={{ padding: "10px" }}>
              {transactions.length > 0 ? (
                transactions.map((trans, index) => (
                  <Box key={index} marginBottom={2}>
                    <Typography variant="body1">
                      {trans.type} - {trans.amount} EUR - {trans.category}
                    </Typography>
                  </Box>
                ))
              ) : (
                <Typography variant="body2" color="textSecondary">
                  Keine Transaktionen vorhanden.
                </Typography>
              )}
            </Paper>
          </Box>
        </Container>
      )}
    </>
  );
};

export default App;
