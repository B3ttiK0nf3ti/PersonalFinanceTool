import React, { useState } from "react";
import {
  Container,
  TextField,
  Button,
  Grid,
  Paper,
  Typography,
  Box,
} from "@mui/material";

const App = () => {
  const [transaction, setTransaction] = useState({
    type: "",
    amount: "",
    category: "",
  });
  const [transactions, setTransactions] = useState([]);

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
    setTransactions([...transactions, transaction]);
    setTransaction({ type: "", amount: "", category: "" });
  };

  return (
    <Container maxWidth="sm" style={{ marginTop: "50px" }}>
      <Paper style={{ padding: "20px" }}>
        <Typography variant="h4" align="center" gutterBottom>
          Finanzübersicht
        </Typography>

        {/* Form für Einnahmen und Ausgaben */}
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

      {/* Anzeige der Transaktionen */}
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
  );
};

export default App;
