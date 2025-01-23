import React, { useState } from "react";
import {
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  Box,
} from "@mui/material";

const Login = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://127.0.0.1:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (response.ok) {
        alert("Login erfolgreich!");
        onLogin(); // Callback zum Weiterleiten auf Dashboard
      } else {
        alert("Falsche Anmeldedaten. Bitte erneut versuchen.");
      }
    } catch (error) {
      console.error("Fehler bei der Anmeldung:", error);
    }
  };

  return (
    <Container maxWidth="xs">
      <Paper elevation={3} style={{ padding: 20, marginTop: 50 }}>
        <Typography variant="h5" align="center">
          Anmeldung
        </Typography>
        <form onSubmit={handleSubmit}>
          <Box mb={2}>
            <TextField
              fullWidth
              label="E-Mail"
              variant="outlined"
              name="email"
              type="email"
              value={credentials.email}
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
              value={credentials.password}
              onChange={handleChange}
              required
            />
          </Box>
          <Button type="submit" variant="contained" color="primary" fullWidth>
            Anmelden
          </Button>
        </form>
      </Paper>
    </Container>
  );
};

export default Login;
