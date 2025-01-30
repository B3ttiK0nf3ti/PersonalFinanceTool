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
import { parseISO, format, isValid } from "date-fns"; // Importiere isValid
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
} from "@mui/material";
import { ArrowDownward, ArrowUpward } from "@mui/icons-material";

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
    date: new Date().toISOString().split("T")[0],
    amount: "",
    category: "",
    isRecurring: false,
    recurrenceType: "",
    nextDueDate: "", // Für die nächste Fälligkeit
  });
  const [transactions, setTransactions] = useState([]);
  const [filterCategory, setFilterCategory] = useState(""); // Filter für Kategorien
  const [filterPeriod, setFilterPeriod] = useState("30"); // Filter für Zeitraum
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [sortBy, setSortBy] = useState("date"); // Standardmäßig nach Datum sortieren
  const [sortOrder, setSortOrder] = useState("asc"); // Standardmäßig aufsteigend sortieren
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [inactivityTimer, setInactivityTimer] = useState(null);
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("date");

  const applyCustomFilter = () => {
    if (filterPeriod === "custom" && customStartDate && customEndDate) {
      // Logik zur Filterung der Daten basierend auf benutzerdefiniertem Zeitraum
      console.log("Filtern von:", customStartDate, "bis", customEndDate);
    } else {
      // Standardzeitraum-Filter anwenden
      console.log("Standardzeitraum-Filter:", filterPeriod);
    }
  };

  // Sortierfunktion
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const sortData = (array, comparator) => {
    const stabilizedArray = array.map((el, index) => [el, index]);
    stabilizedArray.sort((a, b) => {
      const orderComp = comparator(a[0], b[0]);
      if (orderComp !== 0) return orderComp;
      return a[1] - b[1];
    });
    return stabilizedArray.map((el) => el[0]);
  };

  // Comparator-Funktion für die Sortierung
  const comparator = (a, b) => {
    if (orderBy === "date") {
      return order === "asc"
        ? new Date(a.date) - new Date(b.date)
        : new Date(b.date) - new Date(a.date);
    } else if (orderBy === "amount") {
      return order === "asc" ? a.amount - b.amount : b.amount - a.amount;
    } else if (orderBy === "type") {
      return order === "asc"
        ? a.type.localeCompare(b.type)
        : b.type.localeCompare(a.type);
    }
  };

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

  // Daten nach Sortierung und Filter anwenden
  const sortedAndFilteredTransactions = sortData(
    filteredTransactions,
    comparator
  );

  useEffect(() => {
    // Function to logout the user
    const logout = () => {
      localStorage.removeItem("authToken");
      localStorage.removeItem("userEmail");
      setUser(null);
      alert("You have been logged out due to inactivity.");
    };

    // Reset inactivity timer on user activity
    const resetTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer); // Clear the previous timer
      const timer = setTimeout(logout, 15 * 60 * 1000); // 15 minutes in milliseconds
      setInactivityTimer(timer);
    };

    // Listen for activity events
    const activityEvents = ["mousemove", "keydown", "click", "scroll"];
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    // Cleanup listeners and timeout on component unmount
    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
      if (inactivityTimer) clearTimeout(inactivityTimer);
    };
  }, [inactivityTimer]);

  // Handle page unload to logout
  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.removeItem("authToken");
      localStorage.removeItem("userEmail");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup on component unmount
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const totalIncome = filteredTransactions
    .filter((trans) => trans.type === "Einnahme")
    .reduce((sum, trans) => sum + parseFloat(trans.amount), 0);

  const totalExpenses = filteredTransactions
    .filter((trans) => trans.type === "Ausgabe")
    .reduce((sum, trans) => sum + parseFloat(trans.amount), 0);

  const totalBalance = totalIncome - totalExpenses;

  const calculateNextDueDate = (startDate, recurrenceType) => {
    let nextDate = new Date(startDate);

    switch (recurrenceType) {
      case "wöchentlich":
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case "monatlich":
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case "quartal":
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case "jahr":
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        return null;
    }

    return nextDate.toISOString().split("T")[0]; // Format: YYYY-MM-DD
  };

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

  const categoryColors = {
    // Einnahmen-Kategorien
    "Lohn/ Gehalt": "#673AB7", // Lila - kräftig und markant
    "Einkünfte aus selbstständiger Tätigkeit – Unternehmerlohn": "#3F51B5", // Blau - vertrauensvoll und professionell
    Förderungen: "#9C27B0", // Violett - kreativ und inspirierend
    "Rente/ Pension": "#009688", // Teal - beruhigend und modern
    "Staatliche Förderungen": "#2196F3", // Blau - kühl und professionell
    Geldgeschenke: "#FF5722", // Korallenorange - lebendig und auffällig
    "Dividenden/ Zinsen": "#607D8B", // Grau-Blau - dezent und ausbalanciert
    "Sonstige Einnahmen": "#8D6E63", // Braun - warm und natürlich

    // Ausgaben-Kategorien
    Wohnen: "#00BCD4", // Cyan - frisch und kühl
    Leben: "#FF4081", // Pink - lebendig und auffällig
    "Gesundheit und Fürsorge": "#9E9D24", // Olive - zurückhaltend und erdig
    "Hobbys, Freizeit und Sport": "#9E4D4D", // Ziegelrot - energisch und einladend
    Mobilität: "#90EE90", // Grün - beruhigend und ausgleichend
    "Beruf/ Bildung": "#FF9800", // Orange - dynamisch und energisch
    Tierhaltung: "#9C27B0", // Lila - sanft und kreativ
    "Weitere Ausgabenarten": "#03A9F4", // Himmelblau - cool und einladend
    "Versicherungen und Steuern": "#E91E63", // Magenta - kräftig und prägnant
    "Kredite und Finanzierung": "#3F51B5", // Blau - seriös und ruhig
    Sonstiges: "#8BC34A", // Pastellgrün - beruhigend und frisch
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTransaction({ ...transaction, [name]: value });
  };

  const handleTransactionSubmit = async (e) => {
    e.preventDefault();

    if (!transaction.type || !transaction.amount || !transaction.category) {
      alert("Bitte alle Felder ausfüllen!");
      return;
    }

    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      alert("Sie müssen angemeldet sein, um eine Transaktion hinzuzufügen.");
      return;
    }

    const transactionData = {
      type: transaction.type,
      amount: transaction.amount,
      category: transaction.category,
      date: transaction.date,
      description: transaction.description || "",
      isRecurring: transaction.isRecurring || false, // Sicherstellen, dass das Feld gesetzt ist
      recurrenceType: transaction.recurrenceType || null, // Falls vorhanden
      nextDueDate: transaction.isRecurring
        ? calculateNextDueDate(transaction.date, transaction.recurrenceType)
        : null, // Berechnen oder null setzen
    };

    try {
      const response = await fetch("http://127.0.0.1:5000/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(transactionData),
      });

      if (!response.ok) {
        const responseData = await response.json();
        console.error("Fehler bei der Antwort:", responseData);
        throw new Error(responseData.error || "Fehler beim Speichern.");
      }

      const responseData = await response.json();
      setTransactions([...transactions, responseData]);

      // Formular zurücksetzen
      setTransaction({
        type: "",
        amount: "",
        category: "",
        date: "",
        description: "",
        isRecurring: false,
        recurrenceType: "",
      });
    } catch (error) {
      console.error("Fehler beim API-Aufruf:", error);
      alert("Fehler: " + error.message);
    }
  };

  const checkRecurringTransactions = async () => {
    const today = new Date().toISOString().split("T")[0];

    // Zugriffstoken abrufen
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      console.warn("Kein Zugriffstoken gefunden. Anmeldung erforderlich.");
      return;
    }

    let updatedTransactions = [...transactions];

    for (let txn of transactions) {
      // Prüfen, ob die Transaktion wiederkehrend ist (egal ob Einnahme oder Ausgabe)
      if (txn.isRecurring && txn.nextDueDate && txn.nextDueDate <= today) {
        let newTransaction = {
          ...txn,
          date: txn.nextDueDate,
          nextDueDate: calculateNextDueDate(
            txn.nextDueDate,
            txn.recurrenceType
          ),
        };

        try {
          const response = await fetch(
            "http://127.0.0.1:5000/api/transactions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify(newTransaction),
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            console.error("Fehler beim Speichern:", errorData);
            continue; // Falls ein Fehler auftritt, zur nächsten Transaktion springen
          }

          const savedTransaction = await response.json();
          updatedTransactions.push(savedTransaction); // Neue Transaktion hinzufügen
        } catch (error) {
          console.error("API-Fehler:", error);
        }
      }
    }

    setTransactions(updatedTransactions); // Aktualisierte Transaktionsliste setzen
  };

  // Wiederkehrende Transaktionen regelmäßig prüfen (z.B. alle 24 Stunden)
  useEffect(() => {
    checkRecurringTransactions(); // Direkt beim Laden prüfen

    const interval = setInterval(() => {
      checkRecurringTransactions();
    }, 24 * 60 * 60 * 1000); // Alle 24 Stunden

    return () => clearInterval(interval); // Aufräumen bei Unmount
  }, []);

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

  const resetFilters = () => {
    setFilterCategory(""); // Zurücksetzen der Kategorie
    setFilterPeriod(""); // Zurücksetzen des Zeitraums
  };

  // Chart-Daten vorbereiten
  const chartData = {
    labels: ["Einnahmen", "Ausgaben", "Differenz"], // Beschriftungen der Balken
    datasets: [
      {
        label: "Einnahmen", // Label für den Einnahmen-Balken
        data: [totalIncome, 0, 0], // Nur Einnahmen anzeigen
        backgroundColor: "#90EE90", // Grüner Balken für Einnahmen
        borderColor: "#90EE90", // Grüner Rand für Einnahmen
        borderWidth: 1,
      },
      {
        label: "Ausgaben", // Label für den Ausgaben-Balken
        data: [0, totalExpenses, 0], // Nur Ausgaben anzeigen
        backgroundColor: "#FF5733", // Roter Balken für Ausgaben
        borderColor: "#FF5733", // Roter Rand für Ausgaben
        borderWidth: 1,
      },
      {
        label: "Differenz", // Label für den Differenz-Balken
        data: [0, 0, totalBalance], // Nur Differenz anzeigen
        backgroundColor: "#87CEFA", // Blauer Balken für Differenz
        borderColor: "#87CEFA", // Blauer Rand für Differenz
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

  const chartData2 = filteredTransactions.reduce(
    (acc, trans) => {
      const lastIncome =
        acc.income.length > 0 ? acc.income[acc.income.length - 1] : 0;
      const lastExpense =
        acc.expense.length > 0 ? acc.expense[acc.expense.length - 1] : 0;

      // Kumulierte Einnahmen und Ausgaben berechnen
      acc.income.push(
        lastIncome + (trans.type === "Einnahme" ? trans.amount : 0)
      );
      acc.expense.push(
        lastExpense + (trans.type === "Ausgabe" ? trans.amount : 0)
      );

      return acc;
    },
    { income: [], expense: [] }
  );

  // Transaktionen nach Datum gruppieren und kumulieren
  const groupedTransactions = filteredTransactions.reduce((acc, trans) => {
    const date = trans.date; // Datum der Transaktion
    const amount = trans.type === "Einnahme" ? trans.amount : -trans.amount; // Einnahme oder Ausgabe

    // Wenn das Datum bereits im Accumulator vorhanden ist, füge die Menge hinzu
    if (acc[date]) {
      acc[date].income += trans.type === "Einnahme" ? trans.amount : 0;
      acc[date].expense += trans.type === "Ausgabe" ? trans.amount : 0;
    } else {
      // Andernfalls erstelle einen neuen Eintrag für das Datum
      acc[date] = {
        income: trans.type === "Einnahme" ? trans.amount : 0,
        expense: trans.type === "Ausgabe" ? trans.amount : 0,
      };
    }

    return acc;
  }, {});

  // Sortiere die gruppierten Transaktionen nach Datum
  const sortedGroupedTransactions = Object.keys(groupedTransactions)
    .sort((a, b) => new Date(a) - new Date(b)) // Sortiere nach Datum
    .map((date) => ({
      date,
      Einnahmen: groupedTransactions[date].income,
      Ausgaben: groupedTransactions[date].expense,
    }));

  // Daten für das Diagramm vorbereiten
  let cumulativeIncome = 0;
  let cumulativeExpense = 0;

  const chartData2Formatted = sortedGroupedTransactions.map((entry) => {
    // Kumulierte Einnahmen und Ausgaben berechnen
    cumulativeIncome += entry.Einnahmen;
    cumulativeExpense += entry.Ausgaben;

    // Debugging: Konsolenausgabe für jedes Datum
    console.log(`Parsing date: ${entry.date}`);

    // Datum parsen
    const parsedDate = parseISO(entry.date);

    // Prüfen, ob das Datum gültig ist
    if (!isValid(parsedDate)) {
      console.error(`Ungültiges Datum: ${entry.date}`); // Detaillierte Fehlermeldung
      return {
        date: "Invalid Date", // Fallback bei ungültigem Datum
        Einnahmen: cumulativeIncome,
        Ausgaben: cumulativeExpense,
      };
    }

    return {
      date: format(parsedDate, "dd.MM.yyyy"), // Datum im richtigen Format
      Einnahmen: cumulativeIncome, // Kumulierte Einnahmen
      Ausgaben: cumulativeExpense, // Kumulierte Ausgaben
    };
  });

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
    setUser(email);
    localStorage.setItem("userEmail", email); // E-Mail im localStorage speichern

    // Rufe fetchTransactions direkt nach dem Login auf
    fetchTransactions(); // Transaktionen nach dem Login abrufen
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userEmail");
    setUser(null); // Reset user state
  };

  if (!user) {
    return <AuthForm onLogin={handleLogin} />;
  }

  return (
    <Container maxWidth="md" style={{ marginTop: "50px" }}>
      <Paper style={{ padding: "20px" }}>
        <Typography variant="h4" align="center" gutterBottom>
          Finanzübersicht
        </Typography>

        {/* Transaktionseingabe */}
        <form onSubmit={handleTransactionSubmit}>
          <Grid
            container
            spacing={2}
            justifyContent="center"
            alignItems="center"
          >
            {/* Transaktionstyp Auswahl */}
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

            {/* Datum Eingabe */}
            <Grid item xs={8} sm={6} md={4}>
              <TextField
                fullWidth
                label="Datum"
                variant="outlined"
                name="date"
                type="date"
                value={
                  transaction.date || new Date().toISOString().split("T")[0]
                }
                onChange={handleChange}
                InputLabelProps={{
                  shrink: true,
                }}
                required
                inputProps={{
                  max: new Date().toISOString().split("T")[0], // Setzt das maximale Datum auf heute
                }}
              />
            </Grid>

            {/* Betrag Eingabe */}
            <Grid item xs={8} sm={6} md={4}>
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

            {/* Kategorie Auswahl */}
            <Grid item xs={8} sm={6} md={4}>
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

            {/* Wiederkehrend Ja/Nein Auswahl */}
            <Grid item xs={12}>
              <Typography variant="h6" align="center" gutterBottom>
                Wiederkehrend?
              </Typography>
              <Grid container justifyContent="center" spacing={2}>
                <Grid item>
                  <Button
                    variant={transaction.isRecurring ? "contained" : "outlined"}
                    color="primary"
                    onClick={() =>
                      setTransaction({ ...transaction, isRecurring: true })
                    }
                  >
                    Ja
                  </Button>
                </Grid>
                <Grid item>
                  <Button
                    variant={
                      !transaction.isRecurring ? "contained" : "outlined"
                    }
                    color="secondary"
                    onClick={() =>
                      setTransaction({
                        ...transaction,
                        isRecurring: false,
                        recurrenceType: "", // Setzt das Wiederholungsintervall zurück, wenn "Nein" ausgewählt
                      })
                    }
                  >
                    Nein
                  </Button>
                </Grid>
              </Grid>
            </Grid>

            {/* Wiederholungsfrequenz (wenn wiederkehrend "Ja") */}
            {transaction.isRecurring && (
              <Grid item xs={4}>
                <Grid container direction="column" spacing={2}>
                  <Grid item>
                    <Autocomplete
                      fullWidth
                      value={transaction.recurrenceType}
                      onChange={(event, newValue) =>
                        setTransaction({
                          ...transaction,
                          recurrenceType: newValue,
                        })
                      }
                      options={[
                        "Wöchentlich",
                        "Monatlich",
                        "Quartal",
                        "Jährlich",
                      ]}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Wiederholungsintervall"
                          required
                        />
                      )}
                    />
                  </Grid>

                  {/* Hinzufügen Button */}
                  <Grid item>
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
              </Grid>
            )}
          </Grid>
        </form>

        {/* Filtersymbol hinzufügen */}
        <Box mb={3} display="flex" alignItems="center">
          <IconButton
            onClick={() => setIsFilterVisible(!isFilterVisible)}
            color="primary"
          >
            <FilterListIcon />
            <Typography variant="h6" ml={1}>
              Filter
            </Typography>
          </IconButton>
        </Box>

        {/* Filter-Bereich */}
        {isFilterVisible && (
          <Box mb={3} p={3} bgcolor="#f1f1f1" borderRadius={2}>
            <Grid container spacing={3} direction="column">
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
                    <MenuItem value="custom">Benutzerdefiniert</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Benutzerdefinierter Zeitraum */}
              {filterPeriod === "custom" && (
                <Grid item>
                  <Grid container spacing={3}>
                    <Grid item xs={8} sm={6}>
                      <TextField
                        fullWidth
                        variant="outlined"
                        type="date"
                        label="Startdatum"
                        InputLabelProps={{ shrink: true }}
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                      />
                    </Grid>
                    <Grid item xs={8} sm={6}>
                      <TextField
                        fullWidth
                        variant="outlined"
                        type="date"
                        label="Enddatum"
                        InputLabelProps={{ shrink: true }}
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                      />
                    </Grid>
                  </Grid>
                </Grid>
              )}

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
            <Box display="flex" justifyContent="space-between" mt={3}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => {
                  setIsFilterVisible(false); // Filter ausblenden, nach dem Anwenden
                  applyCustomFilter(); // Filter anwenden
                }}
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
        <Typography variant="h6" align="center" margin={4} gutterBottom>
          Transaktionen
        </Typography>

        <Container maxWidth="md" style={{ marginTop: "50px" }}>
          <Paper style={{ padding: "20px" }}>
            {/* Tabelle mit Transaktionen */}
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === "date"}
                        direction={orderBy === "date" ? order : "asc"}
                        onClick={() => handleRequestSort("date")}
                      >
                        Datum
                        {orderBy === "date" &&
                          (order === "desc" ? (
                            <ArrowDownward />
                          ) : (
                            <ArrowUpward />
                          ))}
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === "amount"}
                        direction={orderBy === "amount" ? order : "asc"}
                        onClick={() => handleRequestSort("amount")}
                      >
                        Betrag
                        {orderBy === "amount" &&
                          (order === "desc" ? (
                            <ArrowDownward />
                          ) : (
                            <ArrowUpward />
                          ))}
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Kategorie</TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={orderBy === "type"}
                        direction={orderBy === "type" ? order : "asc"}
                        onClick={() => handleRequestSort("type")}
                      >
                        Typ
                        {orderBy === "type" &&
                          (order === "desc" ? (
                            <ArrowDownward />
                          ) : (
                            <ArrowUpward />
                          ))}
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>Aktionen</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedAndFilteredTransactions.length > 0 ? (
                    sortedAndFilteredTransactions.map((trans) => (
                      <TableRow key={trans.id}>
                        <TableCell>
                          {new Date(trans.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{trans.amount} EUR</TableCell>
                        <TableCell>{trans.category}</TableCell>
                        <TableCell>{trans.type}</TableCell>
                        <TableCell>
                          <IconButton
                            color="secondary"
                            onClick={() => handleDeleteTransaction(trans.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        Keine Transaktionen gefunden.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Container>
      </Box>

      {/* Diagramm */}
      <Box marginTop={4}>
        <Typography variant="h6" align="center" margin={4} gutterBottom>
          Finanzübersicht Balkendiagramm
        </Typography>
        <Bar data={chartData} options={chartOptions} />

        <Typography variant="h6" align="center" margin={4} gutterBottom>
          Finanzübersicht Liniendiagramm
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData2Formatted}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Einnahmen" stroke="#90EE90" />
            <Line type="monotone" dataKey="Ausgaben" stroke="#FF5733" />
          </LineChart>
        </ResponsiveContainer>
      </Box>

      {/* Bilanz-Anzeige */}
      <Box marginTop={4}>
        <Typography variant="h6" align="center" margin={4} gutterBottom>
          Bilanz{" "}
        </Typography>
        <Box display="flex" justifyContent="space-between" padding={2}>
          <Typography variant="body1">Gesamte Einnahmen:</Typography>
          <Typography variant="body1" style={{ color: "#90EE90" }}>
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
              color: totalBalance >= 0 ? "#90EE90" : "#FF5733",
              fontWeight: "bold",
            }}
          >
            {totalBalance} EUR
          </Typography>
        </Box>
      </Box>

      {/* Benutzer angezeigt, wenn eingeloggt */}
      <Box marginBottom={2} marginTop={4}>
        <Typography
          variant="body2"
          align="center"
          style={{ fontSize: "smaller" }}
        >
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
