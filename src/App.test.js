import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import AuthForm from "./App"; // Stelle sicher, dass der Import korrekt ist
import { TextEncoder, TextDecoder } from "util";
import "@testing-library/jest-dom";

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

describe("AuthForm Tests", () => {
  test("Rendern der AuthForm und Standardzustände", () => {
    render(<AuthForm onLogin={jest.fn()} />);

    expect(screen.getByText("Anmeldung")).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: /E-Mail/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Passwort/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Anmelden/i })
    ).toBeInTheDocument();
  });

  test("Benutzer kann E-Mail und Passwort eingeben", () => {
    render(<AuthForm onLogin={jest.fn()} />);

    fireEvent.change(screen.getByRole("textbox", { name: /E-Mail/i }), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Passwort/i), {
      target: { value: "password123" },
    });

    expect(screen.getByRole("textbox", { name: /E-Mail/i })).toHaveValue(
      "test@example.com"
    );
    expect(screen.getByLabelText(/Passwort/i)).toHaveValue("password123");
  });

  test("Wechsel zwischen Registrierung und Anmeldung", () => {
    render(<AuthForm onLogin={jest.fn()} />);

    fireEvent.click(screen.getByText(/Kein Konto\? Registrieren/i));

    expect(screen.getByText(/Registrierung/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Bereits ein Konto\? Anmelden/i));

    expect(screen.getByText(/Anmeldung/i)).toBeInTheDocument();
  });

  test("Passwort-Reset-Modus umschalten", () => {
    render(<AuthForm onLogin={jest.fn()} />);

    fireEvent.click(
      screen.getByRole("button", { name: /Passwort vergessen/i })
    );

    expect(
      screen.getByRole("button", { name: /Passwort zurücksetzen/i })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Zurück zur Anmeldung/i));

    expect(screen.getByText(/Anmeldung/i)).toBeInTheDocument();
  });
});
