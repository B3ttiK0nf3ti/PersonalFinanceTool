import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Container,
  TextField,
  Button,
  Typography,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [type, setType] = useState("Einnahme");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Transaktionen abrufen
  const fetchTransactions = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:5000/transactions");
      setTransactions(response.data);
    } catch (error) {
      console.error("Fehler beim Abrufen der Daten:", error);
    }
  };

  // Neue Transaktion hinzufügen
  const handleAddTransaction = async () => {
    if (!amount || !category || !date) {
      alert("Bitte füllen Sie alle Felder aus!");
      return;
    }
    try {
      await axios.post("http://127.0.0.1:5000/transactions", {
        type,
        amount: parseFloat(amount),
        category,
        description,
        date,
      });
      fetchTransactions();
      setAmount("");
      setCategory("");
      setDescription("");
      setDate("");
    } catch (error) {
      console.error("Fehler beim Hinzufügen der Transaktion:", error);
    }
  };

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Finanzübersicht
      </Typography>

      <div>
        <Select value={type} onChange={(e) => setType(e.target.value)}>
          <MenuItem value="Einnahme">Einnahme</MenuItem>
          <MenuItem value="Ausgabe">Ausgabe</MenuItem>
        </Select>
        <TextField
          label="Betrag"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <TextField
          label="Kategorie"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
        <TextField
          label="Beschreibung"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <TextField
          label="Datum"
          type="date"
          InputLabelProps={{ shrink: true }}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={handleAddTransaction}
        >
          Hinzufügen
        </Button>
      </div>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Typ</TableCell>
            <TableCell>Betrag (€)</TableCell>
            <TableCell>Kategorie</TableCell>
            <TableCell>Beschreibung</TableCell>
            <TableCell>Datum</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell>{transaction.type}</TableCell>
              <TableCell>{transaction.amount}</TableCell>
              <TableCell>{transaction.category}</TableCell>
              <TableCell>{transaction.description}</TableCell>
              <TableCell>{transaction.date}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Container>
  );
};

export default Transactions;
