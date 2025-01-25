import React, { useState, useEffect } from "react";
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
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  IconButton,
  InputAdornment,
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
import Chart from "chart.js/auto";
import axios from "axios";
import QRCode from "react-qr-code";
import Autocomplete from "@mui/lab/Autocomplete";
import DeleteIcon from "@mui/icons-material/Delete";
import FilterListIcon from "@mui/icons-material/FilterList";
import { Bar } from "react-chartjs-2";

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
          localStorage.setItem("accessToken", response.data.token);
          localStorage.setItem("userEmail", formData.email); // E-Mail korrekt speichern
          onLogin(formData.email); // E-Mail als Argument übergeben
          console.log("E-Mail beim Absenden:", formData.email); // Debugging-Ausgabe
          console.log(
            "Gespeichertes Token:",
            localStorage.getItem("accessToken")
          );
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
  const [transaction, setTransaction] = useState({
    type: "",
    amount: "",
    category: "",
    date: "",
  });
  const [transactions, setTransactions] = useState([]);
  const [filterCategory, setFilterCategory] = useState(""); // Filter für Kategorien
  const [filterPeriod, setFilterPeriod] = useState(""); // Filter für Zeitraum (7 Tage, z.B.)
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  const totalIncome = transactions
    .filter((trans) => trans.type === "Einnahme")
    .reduce((sum, trans) => sum + parseFloat(trans.amount), 0);

  const totalExpenses = transactions
    .filter((trans) => trans.type === "Ausgabe")
    .reduce((sum, trans) => sum + parseFloat(trans.amount), 0);

  const totalBalance = totalIncome - totalExpenses;

  // Kategorien für Einnahmen und Ausgaben
  const incomeCategories = [
    "Lohn/ Gehalt",
    "Einkünfte aus selbstständiger Tätigkeit – Unternehmerlohn",
    "Förderungen",
    "Rente/ Pension",
    "Staatliche Förderungen",
    "Geldgeschenke",
    "Dividenden/ Zinsen",
    "Sonstige Einnahmen",
  ];

  const expenseCategories = [
    "Wohnen",
    "Leben",
    "Gesundheit und Fürsorge",
    "Hobbys, Freizeit und Sport",
    "Mobilität",
    "Beruf/ Bildung",
    "Tierhaltung",
    "Weitere Ausgabenarten",
    "Versicherungen und Steuern",
    "Kredite und Finanzierung",
    "Sonstiges",
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTransaction({ ...transaction, [name]: value });
  };

  const handleTransactionSubmit = async (e) => {
    e.preventDefault();

    // Prüfen, ob alle Felder ausgefüllt sind
    if (!transaction.type || !transaction.amount || !transaction.category) {
      alert("Bitte alle Felder ausfüllen!");
      return;
    }

    // Zugriffstoken aus dem lokalen Speicher abrufen
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      alert("Sie müssen angemeldet sein, um eine Transaktion hinzuzufügen.");
      return;
    }

    console.log("Gespeicherter Token:", accessToken);
    console.log("Gesendete Transaktionsdaten:", {
      type: transaction.type,
      amount: transaction.amount,
      category: transaction.category,
      date: transaction.date,
      description: transaction.description || "",
    });

    try {
      // API-Aufruf zum Speichern der Transaktion in der Datenbank
      const response = await fetch("http://127.0.0.1:5000/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`, // Token für Authentifizierung
        },
        body: JSON.stringify({
          type: transaction.type,
          amount: transaction.amount,
          category: transaction.category,
          date: transaction.date,
          description: transaction.description || "", // Beschreibung optional
        }),
      });

      console.log("Antwortstatus:", response.status);

      if (!response.ok) {
        const responseData = await response.json();
        console.log("Fehler bei der Antwort:", responseData); // Detaillierte Fehlerausgabe
        throw new Error(
          responseData.error || "Fehler beim Speichern der Transaktion."
        );
      }

      const responseData = await response.json();
      console.log("Serverantwort:", responseData);

      // Erfolgreiches Hinzufügen
      setTransactions([...transactions, responseData]); // Hinzufügen zur Liste
      setTransaction({
        type: "",
        amount: "",
        category: "",
        date: "",
        description: "",
      });
    } catch (error) {
      console.error("Fehler beim API-Aufruf:", error);
      alert(
        "Beim Speichern der Transaktion ist ein Fehler aufgetreten: " +
          error.message
      );
    }
  };

  const fetchTransactions = async () => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      console.error("Kein Zugriffstoken gefunden!");
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:5000/api/transactions`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // Logge die Antwort vor der Verarbeitung
      const textResponse = await response.text(); // Antwort als Text lesen
      console.log("Antwort vom Server:", textResponse);

      // Überprüfe, ob die Antwort JSON ist, bevor du versuchst, sie zu parsen
      if (response.ok) {
        try {
          const data = JSON.parse(textResponse); // Manuelles Parsen
          console.log("Transaktionen:", data);
          setTransactions(data); // Alle Transaktionen setzen
        } catch (e) {
          console.error("Fehler beim Parsen der JSON-Antwort:", e);
        }
      } else {
        console.error("Fehler beim Abrufen der Transaktionen:", textResponse);
      }
    } catch (error) {
      console.error("Fehler:", error);
    }
  };

  // Aufruf der Funktion beim Laden der Seite
  useEffect(() => {
    fetchTransactions();
  }, []);

  const filteredTransactions = transactions.filter((trans) => {
    const now = Date.now();
    const withinPeriod = filterPeriod
      ? new Date(trans.date).getTime() >=
        now - parseInt(filterPeriod) * 24 * 60 * 60 * 1000
      : true;

    const byCategory =
      filterCategory && filterCategory !== "Alle"
        ? trans.category === filterCategory
        : true;

    console.log(
      `Transaktion ${trans.id}: Zeitraum-Filter -> ${withinPeriod}, Kategorie-Filter -> ${byCategory}`
    );

    return withinPeriod && byCategory;
  });

  console.log("Gefilterte Transaktionen:", filteredTransactions);

  const resetFilters = () => {
    setFilterCategory(""); // Zurücksetzen der Kategorie
    setFilterPeriod(""); // Zurücksetzen des Zeitraums
  };

  // Chart-Daten vorbereiten
  const chartData = {
    labels: ["Einnahmen", "Ausgaben"],
    datasets: [
      {
        label: "Betrag in EUR",
        data: [totalIncome, totalExpenses],
        backgroundColor: ["#4CAF50", "#FF5733"],
        borderColor: ["#4CAF50", "#FF5733"],
        borderWidth: 1,
      },
    ],
  };
  // Chart Optionen
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const handleDeleteTransaction = async (transactionId) => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) return;

    try {
      const response = await fetch(
        `http://127.0.0.1:5000/api/transactions/${transactionId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (response.ok) {
        // Transaktion lokal entfernen
        setTransactions(
          transactions.filter((trans) => trans.id !== transactionId)
        );
      } else {
        console.error("Fehler beim Löschen der Transaktion.");
        alert("Fehler beim Löschen der Transaktion.");
      }
    } catch (error) {
      console.error("Fehler:", error);
      alert("Fehler beim Löschen der Transaktion.");
    }
  };

  const [user, setUser] = useState(localStorage.getItem("userEmail")); // E-Mail-Adresse aus localStorage holen

  const handleLogin = (email) => {
    console.log("E-Mail in handleLogin:", email); // Debugging-Ausgabe
    setUser(email); // E-Mail in den State setzen
    localStorage.setItem("userEmail", email); // E-Mail im localStorage speichern

    // Rufe fetchTransactions direkt nach dem Login auf
    fetchTransactions(); // Transaktionen nach dem Login abrufen
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userEmail");
    setUser(null); // E-Mail zurücksetzen
  };

  if (!user) {
    return <AuthForm onLogin={handleLogin} />; // Zeige AuthForm an, wenn nicht eingeloggt
  }

  return (
    <Container maxWidth="sm" style={{ marginTop: "50px" }}>
      <Paper style={{ padding: "20px" }}>
        <Typography variant="h4" align="center" gutterBottom>
          Finanzübersicht
        </Typography>

        {/* Transaktionseingabe */}
        <form onSubmit={handleTransactionSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="h6" align="center" gutterBottom>
                Wählen Sie den Transaktionstyp:
              </Typography>
              <Grid container justifyContent="center" spacing={2}>
                <Grid item>
                  <Button
                    variant="outlined"
                    color={
                      transaction.type === "Einnahme" ? "primary" : "default"
                    }
                    onClick={() =>
                      setTransaction({ ...transaction, type: "Einnahme" })
                    }
                  >
                    Einnahme
                  </Button>
                </Grid>
                <Grid item>
                  <Button
                    variant="outlined"
                    color={
                      transaction.type === "Ausgabe" ? "primary" : "default"
                    }
                    onClick={() =>
                      setTransaction({ ...transaction, type: "Ausgabe" })
                    }
                  >
                    Ausgabe
                  </Button>
                </Grid>
              </Grid>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Datum"
                variant="outlined"
                name="date"
                type="date"
                value={transaction.date}
                onChange={handleChange}
                InputLabelProps={{
                  shrink: true,
                }}
                required
              />
            </Grid>

            {/* Betrag Eingabe */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Betrag"
                variant="outlined"
                name="amount"
                type="number"
                value={transaction.amount}
                onChange={handleChange}
                InputLabelProps={{
                  shrink: true,
                }}
                required
              />
            </Grid>

            {/* Dropdown für die Kategorien, abhängig vom Transaktionstyp */}
            <Grid item xs={12}>
              <Autocomplete
                fullWidth
                value={transaction.category}
                onChange={(event, newValue) =>
                  setTransaction({ ...transaction, category: newValue })
                }
                options={
                  transaction.type === "Einnahme"
                    ? [...incomeCategories, "Sonstige"]
                    : [...expenseCategories, "Sonstige"]
                }
                renderInput={(params) => (
                  <TextField {...params} label="Kategorie" required />
                )}
                InputLabelProps={{
                  shrink: true,
                }}
                required
              />
            </Grid>

            {/* Hinzufügen Button */}
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

        {/* Filtersymbol hinzufügen */}
        <Box mb={3}>
          <IconButton
            onClick={() => setIsFilterVisible(!isFilterVisible)}
            color="primary"
          >
            <FilterListIcon />
          </IconButton>
        </Box>

        {/* Filter-Bereich */}
        {isFilterVisible && (
          <Box mb={3} p={2} bgcolor="#f1f1f1" borderRadius={2}>
            <Grid container spacing={2} direction="column">
              {/* Zeitraum-Filter */}
              <Grid item>
                <FormControl fullWidth>
                  <InputLabel>Zeitraum</InputLabel>
                  <Select
                    value={filterPeriod}
                    onChange={(e) => setFilterPeriod(e.target.value)}
                    label="Zeitraum"
                  >
                    <MenuItem value="7">Letzte 7 Tage</MenuItem>
                    <MenuItem value="30">Letzte 30 Tage</MenuItem>
                    <MenuItem value="365">Letztes Jahr</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Kategorien-Filter */}
              <Grid item>
                <Autocomplete
                  fullWidth
                  value={filterCategory}
                  onChange={(event, newValue) => setFilterCategory(newValue)}
                  options={[...incomeCategories, ...expenseCategories, "Alle"]}
                  renderInput={(params) => (
                    <TextField {...params} label="Kategorie" />
                  )}
                />
              </Grid>
            </Grid>

            {/* Filter anwenden und zurücksetzen Buttons horizontal ausgerichtet */}
            <Box display="flex" justifyContent="space-between" mt={2}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => setIsFilterVisible(false)} // Filter ausblenden, nach dem Anwenden
              >
                Filter anwenden
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={resetFilters}
              >
                Filter zurücksetzen
              </Button>
            </Box>
          </Box>
        )}
      </Paper>

      <Box marginTop={4}>
        <Typography variant="h6" gutterBottom>
          Transaktionen:
        </Typography>
        <Paper style={{ padding: "10px" }}>
          {filteredTransactions.length > 0 ? (
            filteredTransactions.map((trans) => {
              console.log("Transaktion:", trans);
              console.log("Gefilterte Transaktionen:", filteredTransactions);
              const isIncome = trans.type === "Einnahme";
              return (
                <Box
                  key={trans.id}
                  marginBottom={2}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography
                    variant="body1"
                    style={{
                      color: isIncome ? "#4CAF50" : "#FF5733",
                      padding: "5px",
                      borderRadius: "4px",
                    }}
                  >
                    {trans.type} - {trans.amount} EUR - {trans.category}
                  </Typography>
                  <IconButton
                    color="secondary"
                    onClick={() => handleDeleteTransaction(trans.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              );
            })
          ) : (
            <Typography variant="body2" color="textSecondary">
              Keine Transaktionen vorhanden.
            </Typography>
          )}
        </Paper>
      </Box>

      {/* Diagramm */}
      <Box marginTop={4}>
        <Typography variant="h6" align="center" gutterBottom>
          Finanzübersicht Diagramm
        </Typography>
        <Bar data={chartData} options={chartOptions} />
      </Box>

      {/* Bilanz-Anzeige */}
      <Box marginTop={4}>
        <Typography variant="h6" align="center" gutterBottom>
          Bilanz
        </Typography>
        <Box display="flex" justifyContent="space-between" padding={2}>
          <Typography variant="body1">Gesamte Einnahmen:</Typography>
          <Typography variant="body1" style={{ color: "#4CAF50" }}>
            {totalIncome} EUR
          </Typography>
        </Box>
        <Box display="flex" justifyContent="space-between" padding={2}>
          <Typography variant="body1">Gesamte Ausgaben:</Typography>
          <Typography variant="body1" style={{ color: "#FF5733" }}>
            {totalExpenses} EUR
          </Typography>
        </Box>
        <Box display="flex" justifyContent="space-between" padding={2}>
          <Typography variant="body1">Bilanz:</Typography>
          <Typography
            variant="body1"
            style={{
              color: totalBalance >= 0 ? "#4CAF50" : "#FF5733",
              fontWeight: "bold",
            }}
          >
            {totalBalance} EUR
          </Typography>
        </Box>
      </Box>

      {/* Benutzer angezeigt, wenn eingeloggt */}
      <Box marginBottom={2}>
        <Typography variant="h6" align="center">
          Angemeldet als: {user}.
        </Typography>
      </Box>

      <Box marginBottom={5}>
        {user && (
          <Box marginTop={4}>
            <Button
              variant="contained"
              color="secondary"
              fullWidth
              onClick={handleLogout}
            >
              Abmelden
            </Button>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default App;
