import React from "react";
import ReactDOM from "react-dom";
import "./index.css"; // eigenes Stylesheet
import App from "./App"; // Hauptkomponente
import reportWebVitals from "./reportWebVitals"; // Optional, falls du Web-Vital-Daten tracken möchtest

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root") // Stellt sicher, dass das Element mit der ID 'root' in index.html existiert
);

// Optional: Für Web Vitals (Leistungsmetriken)
reportWebVitals();
