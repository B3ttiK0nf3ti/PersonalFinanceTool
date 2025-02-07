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
} from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import axios from "axios";
import Autocomplete from "@mui/lab/Autocomplete";
import DeleteIcon from "@mui/icons-material/Delete";
import FilterListIcon from "@mui/icons-material/FilterList";
import { Bar } from "react-chartjs-2";
import { parseISO, format, isValid } from "date-fns";
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
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { saveAs } from "file-saver";
import DownloadIcon from "@mui/icons-material/Download";
import Menu from "@mui/material/Menu";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

// Passwortvalidierung
const passwordValidation = (password) => {
  const regex =
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return regex.test(password);
};

const formatNumber = (number) => {
  return new Intl.NumberFormat("de-DE").format(number);
};

const AuthForm = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    mfaCode: "",
  });
  const [resetData, setResetData] = useState({
    email: "",
    token: "",
    newPassword: "",
  });
  const [message, setMessage] = useState("");
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [secret, setSecret] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleResetChange = (e) => {
    setResetData({ ...resetData, [e.target.name]: e.target.value });
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
        mfaCode: formData.mfaCode,
      });

      // Debugging-Ausgabe der Serverantwort
      console.log("Antwort vom Server:", response.data);

      // Serverantwort analysieren
      if (response.data.success) {
        if (isRegistering) {
          if (response.data.qrCodeUrl) {
            setQrCodeUrl(response.data.qrCodeUrl);
          }
          if (response.data.secret) {
            setSecret(response.data.secret);
          }
        } else if (response.data.mfaRequired) {
          setSnackbarMessage(
            "MFA erforderlich. Bitte geben Sie Ihren MFA-Code ein."
          );
          setOpenSnackbar(true);
        } else {
          localStorage.setItem("accessToken", response.data.token);
          localStorage.setItem("userEmail", formData.email);
          onLogin(formData.email);
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

  const requestResetToken = async () => {
    try {
      const response = await axios.post(
        "http://127.0.0.1:5000/request-password-reset",
        { email: resetData.email }
      );
      setSnackbarMessage(response.data.message);
      setOpenSnackbar(true);
    } catch (error) {
      setSnackbarMessage(
        error.response?.data?.message || "Fehler beim Anfordern des Tokens!"
      );
      setOpenSnackbar(true);
    }
  };

  const resetPassword = async () => {
    try {
      const response = await axios.post(
        "http://127.0.0.1:5000/reset-password",
        resetData
      );
      setSnackbarMessage(response.data.message);
      setOpenSnackbar(true);
      if (response.data.success) setIsResetting(false);
    } catch (error) {
      setSnackbarMessage(
        error.response?.data?.message ||
          "Fehler beim Zurücksetzen des Passworts!"
      );
      setOpenSnackbar(true);
    }
  };

  return (
    <Container maxWidth="xs" style={{ marginTop: "80px" }}>
      <Paper style={{ padding: "20px" }}>
        <Typography variant="h5" align="center" gutterBottom>
          {isResetting
            ? "Passwort zurücksetzen"
            : isRegistering
            ? "Registrierung"
            : "Anmeldung"}
        </Typography>

        {/* Login & Registrierung */}
        {!isResetting ? (
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

            {/* MFA-Feld nur anzeigen, wenn notwendig */}
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
        ) : (
          // Passwort-Reset Formular
          <>
            <TextField
              fullWidth
              label="E-Mail-Adresse"
              variant="outlined"
              name="email"
              type="email"
              value={resetData.email}
              onChange={handleResetChange}
              required
            />
            <Button
              onClick={requestResetToken}
              variant="contained"
              color="primary"
              fullWidth
              style={{ marginTop: "10px" }}
            >
              Reset-Link anfordern
            </Button>

            <TextField
              fullWidth
              label="Reset-Token"
              variant="outlined"
              name="token"
              type="text"
              value={resetData.token}
              onChange={handleResetChange}
              required
              style={{ marginTop: "10px" }}
            />
            <TextField
              fullWidth
              label="Neues Passwort"
              variant="outlined"
              name="newPassword"
              type="password"
              value={resetData.newPassword}
              onChange={handleResetChange}
              required
              style={{ marginTop: "10px" }}
            />
            <Button
              onClick={resetPassword}
              variant="contained"
              color="primary"
              fullWidth
              style={{ marginTop: "10px" }}
            >
              Passwort zurücksetzen
            </Button>
          </>
        )}

        {/* QR-Code für MFA nach der Registrierung anzeigen */}
        {isRegistering && qrCodeUrl && (
          <Box mt={2} align="center">
            <Typography variant="h6">
              Scanne den QR-Code mit deiner Authenticator-App
            </Typography>
            <img
              src={qrCodeUrl}
              alt="QR Code für MFA"
              style={{ maxWidth: "100%", width: "200px", height: "auto" }}
            />
          </Box>
        )}

        {/* Secret für MFA anzeigen */}
        {isRegistering && secret && (
          <Box mt={2} align="center">
            <Typography variant="h6">Alternativ: Manuelles Secret</Typography>
            <Typography variant="body1" style={{ wordBreak: "break-word" }}>
              {secret}
            </Typography>
          </Box>
        )}

        {/* Navigation zwischen Login, Registrierung & Passwort-Reset */}
        <Box mt={2}>
          {!isResetting && (
            <Button
              fullWidth
              color="secondary"
              onClick={() => setIsRegistering(!isRegistering)}
            >
              {isRegistering
                ? "Bereits ein Konto? Anmelden"
                : "Kein Konto? Registrieren"}
            </Button>
          )}
          <Button
            fullWidth
            color="secondary"
            onClick={() => setIsResetting(!isResetting)}
          >
            {isResetting ? "Zurück zur Anmeldung" : "Passwort vergessen?"}
          </Button>
        </Box>
      </Paper>

      {/* Snackbar für Erfolgs-/Fehlermeldungen */}
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
    nextDueDate: "",
  });
  const [transactions, setTransactions] = useState([]);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPeriod, setFilterPeriod] = useState("30");
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [inactivityTimer, setInactivityTimer] = useState(null);
  const [order, setOrder] = useState("asc");
  const [orderBy, setOrderBy] = useState("date");
  const [anchorEl, setAnchorEl] = useState(null);

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
    // logout the user
    const logout = () => {
      localStorage.removeItem("authToken");
      localStorage.removeItem("userEmail");
      setUser(null);
      alert("You have been logged out due to inactivity.");
    };

    // Reset inactivity timer
    const resetTimer = () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
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

    return nextDate.toISOString().split("T")[0];
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
      isRecurring: JSON.parse(transaction.isRecurring || "false"),
      recurrenceType: transaction.recurrenceType || null,
      nextDueDate: transaction.isRecurring
        ? calculateNextDueDate(transaction.date, transaction.recurrenceType)
        : null,
    };
    console.log("isRecurring in transactionData:", transactionData.isRecurring);
    console.log("Final transactionData vor dem API-Call:", transactionData);

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
        console.log("API Response nach POST:", responseData);
        console.error("Fehler bei der Antwort:", responseData);
        throw new Error(responseData.error || "Fehler beim Speichern.");
      }

      const responseData = await response.json();
      console.log("API Response nach POST:", responseData);
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
            continue;
          }

          const savedTransaction = await response.json();
          updatedTransactions.push(savedTransaction);
        } catch (error) {
          console.error("API-Fehler:", error);
        }
      }
    }

    setTransactions(updatedTransactions);
  };

  // Wiederkehrende Transaktionen regelmäßig prüfen (z.B. alle 24 Stunden)
  useEffect(() => {
    checkRecurringTransactions();

    const interval = setInterval(() => {
      checkRecurringTransactions();
    }, 24 * 60 * 60 * 1000); // Alle 24 Stunden

    return () => clearInterval(interval);
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

      // Überprüfe, ob die Antwort JSON ist, bevor du versuchst, sie zu parsen
      if (response.ok) {
        const data = await response.json();
        console.log("Antwort vom Server als JSON:", data);
        setTransactions(data);
      } else {
        const errorText = await response.text();
        console.error("Fehler beim Abrufen der Transaktionen:", errorText);
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
    setFilterCategory("");
    setFilterPeriod("");
  };

  // Chart-Daten vorbereiten
  const chartData = {
    labels: ["Einnahmen", "Ausgaben", "Differenz"],
    datasets: [
      {
        label: "Einnahmen",
        data: [totalIncome, 0, 0],
        backgroundColor: "#90EE90",
        borderColor: "#90EE90",
        borderWidth: 1,
      },
      {
        label: "Ausgaben",
        data: [0, totalExpenses, 0],
        backgroundColor: "#FF5733",
        borderColor: "#FF5733",
        borderWidth: 1,
      },
      {
        label: "Differenz",
        data: [0, 0, totalBalance],
        backgroundColor: "#87CEFA",
        borderColor: "#87CEFA",
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
        labels: {
          font: {
            size: 14,
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          font: {
            size: 14,
          },
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          font: {
            size: 14,
          },
          callback: function (value) {
            return new Intl.NumberFormat("de-DE", {
              style: "decimal",
              maximumFractionDigits: 2,
              minimumFractionDigits: 2,
            }).format(value);
          },
        },
      },
    },
  };

  // Transaktionen nach Datum gruppieren und kumulieren
  const groupedTransactions = filteredTransactions.reduce((acc, trans) => {
    const date = trans.date;
    // Wenn das Datum bereits im Accumulator vorhanden ist, füge die Menge hinzu
    if (acc[date]) {
      acc[date].income += trans.type === "Einnahme" ? trans.amount : 0;
      acc[date].expense += trans.type === "Ausgabe" ? trans.amount : 0;
    } else {
      // Andernfalls neuen Eintrag für das Datum
      acc[date] = {
        income: trans.type === "Einnahme" ? trans.amount : 0,
        expense: trans.type === "Ausgabe" ? trans.amount : 0,
      };
    }

    return acc;
  }, {});

  // Sortiere die gruppierten Transaktionen nach Datum
  const sortedGroupedTransactions = Object.keys(groupedTransactions)
    .sort((a, b) => new Date(a) - new Date(b))
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
      console.error(`Ungültiges Datum: ${entry.date}`);
      return {
        date: "Invalid Date",
        Einnahmen: cumulativeIncome,
        Ausgaben: cumulativeExpense,
      };
    }

    return {
      date: format(parsedDate, "dd.MM.yyyy"),
      Einnahmen: cumulativeIncome,
      Ausgaben: cumulativeExpense,
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
    console.log("E-Mail in handleLogin:", email);
    setUser(email);
    localStorage.setItem("userEmail", email);

    fetchTransactions();
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userEmail");
    setUser(null); // Reset user state
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const exportToCSV = () => {
    const csvContent = [
      ["Datum", "Betrag", "Kategorie", "Typ", "Wiederkehrend"], // Kopfzeile
      ...sortedAndFilteredTransactions.map((trans) => {
        const amount =
          trans.type === "Einnahme"
            ? trans.amount // Einnahme bleibt positiv
            : -trans.amount; // Ausgabe wird negativ

        return [
          new Date(trans.date).toLocaleDateString(), // Datum
          amount, // Betrag (nur Zahl, positiv oder negativ)
          trans.category, // Kategorie
          trans.type, // Typ (Einnahme oder Ausgabe)
          trans.isRecurring === 1 ? "Ja" : "Nein", // Wiederkehrend
        ];
      }),
    ]
      .map((e) => e.join(";")) // Zeilen zusammenfügen mit Semikolon
      .join("\n"); // Zeilen trennen

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, "transaktionen.csv");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Transaktionen", 14, 10);

    const tableData = sortedAndFilteredTransactions.map((trans) => {
      const amount =
        trans.type === "Einnahme"
          ? trans.amount // Einnahme bleibt positiv
          : -trans.amount; // Ausgabe wird negativ

      return [
        new Date(trans.date).toLocaleDateString(),
        `${amount}`, // Betrag als Zahl (positiv oder negativ)
        trans.category,
        trans.type,
        trans.isRecurring === 1 ? "Ja" : "Nein",
      ];
    });

    // AutoTable für die Tabelle im PDF
    doc.autoTable({
      head: [["Datum", "Betrag", "Kategorie", "Typ", "Wiederkehrend"]],
      body: tableData,
      columnStyles: {
        1: { halign: "right" }, // Betrag rechtsbündig ausrichten
      },
    });

    doc.save("transaktionen.pdf");
    handleMenuClose();
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
                InputLabelProps={{ shrink: true }}
                required
                inputProps={{ max: new Date().toISOString().split("T")[0] }} // Setzt das maximale Datum auf heute
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
                InputLabelProps={{ shrink: true }}
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
                InputLabelProps={{ shrink: true }}
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
                    onClick={() => {
                      setTransaction({ ...transaction, isRecurring: true });
                      console.log(
                        "Aktualisierter Wert für isRecurring (Ja):",
                        transaction.isRecurring
                      );
                    }}
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
                        recurrenceType: "",
                      })
                    }
                  >
                    Nein
                  </Button>
                </Grid>
              </Grid>
            </Grid>

            {/* Wiederholungsfrequenz (wenn wiederkehrend "Ja") */}
            <Grid item xs={6}>
              <Grid container direction="column" spacing={2}>
                {transaction.isRecurring && (
                  <Grid item xs={12}>
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
                )}

                {/* Hinzufügen Button (immer sichtbar) */}
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
            </Grid>
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
                  setIsFilterVisible(false);
                  applyCustomFilter();
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
        <Box display="flex" justifyContent="flex-end" marginRight={2}>
          <IconButton color="primary" onClick={handleMenuClick}>
            <DownloadIcon />
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={exportToCSV}>Als CSV herunterladen</MenuItem>
            <MenuItem onClick={exportToPDF}>Als PDF herunterladen</MenuItem>
          </Menu>
        </Box>

        <Container maxWidth="md" style={{ marginTop: "10px" }}>
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
                    <TableCell>Wiederkehrend</TableCell>{" "}
                    {/* Neue Spalte für Wiederkehrend */}
                    <TableCell>Aktionen</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedAndFilteredTransactions.length > 0 ? (
                    sortedAndFilteredTransactions.map((trans) => {
                      // Log für isRecurring und andere relevante Daten
                      console.log("Transaktion ID:", trans.id);
                      console.log(
                        "isRecurring für Transaktion:",
                        trans.isRecurring
                      );

                      return (
                        <TableRow key={trans.id}>
                          <TableCell>
                            {new Date(trans.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {formatNumber(trans.amount)} EUR
                          </TableCell>
                          <TableCell>{trans.category}</TableCell>
                          <TableCell>{trans.type}</TableCell>
                          <TableCell>
                            {/* Log vor der Anzeige von "Ja" oder "Nein" */}

                            {trans.isRecurring === 1 ? "Ja" : "Nein"}
                          </TableCell>
                          <TableCell>
                            <IconButton
                              color="secondary"
                              onClick={() => handleDeleteTransaction(trans.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
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
        <ResponsiveContainer width="100%" height={450}>
          <LineChart data={chartData2Formatted}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ dy: 10 }} />
            <YAxis
              width={80}
              tickMargin={10}
              tickFormatter={(value) =>
                new Intl.NumberFormat("de-DE", {
                  style: "decimal",
                  maximumFractionDigits: 2,
                  minimumFractionDigits: 2,
                }).format(value)
              }
            />
            <Tooltip />
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
            {formatNumber(totalIncome)} EUR
          </Typography>
        </Box>
        <Box display="flex" justifyContent="space-between" padding={2}>
          <Typography variant="body1">Gesamte Ausgaben:</Typography>
          <Typography variant="body1" style={{ color: "#FF5733" }}>
            {formatNumber(totalExpenses)} EUR
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
            {formatNumber(totalBalance)} EUR
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
