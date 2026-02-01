/**
 * Onboarding Tour Step Definitions
 *
 * Defines the sequence of steps for the first-time user onboarding tour.
 * Each step targets a specific UI element via data-tour-* attributes.
 *
 * Tour Steps:
 * 1. Welcome - Introduction to the app
 * 2. Input Mode - Selection between recording/text/file modes
 * 3. Record Button - How to start a recording
 * 4. Emotion Display - Understanding emotional analysis
 * 5. Chat History - Viewing analysis history
 * 6. Chat Input - RAG chatbot question input
 * 7. Recordings Library - Accessing saved recordings
 * 8. Settings - Configuring the application
 *
 * @see docs/reference/guidelines/TYPESCRIPT.md
 */

import type { Step } from "react-joyride";

/**
 * Array of tour steps for react-joyride.
 * Steps are shown in order and target elements via CSS selectors.
 *
 * Note: Content is plain text (no HTML) to prevent XSS risks.
 * React's JSX escapes content by default, but we use plain strings
 * for additional safety.
 */
export const TOUR_STEPS: Step[] = [
  {
    target: "[data-tour-welcome]",
    content:
      "Diese App erkennt Emotionen aus Stimme und Text mittels KI. Die Ergebnisse dienen der Selbstreflexion und können ungenau sein. Hablará kann eine professionelle Beratung nicht ersetzen.",
    title: "Willkommen bei Hablará",
    disableBeacon: true,
    placement: "center",
  },
  {
    target: "[data-tour-input-mode]",
    content:
      "Wähle zwischen drei Eingabemodi: Sprachaufnahme, Text-Eingabe oder Audio-Datei hochladen.",
    title: "Eingabemodus",
    placement: "bottom",
  },
  {
    target: "[data-tour-record-button]",
    content:
      "Starte eine Aufnahme per Klick oder mit dem Hotkey (Ctrl+Shift+D), den du in den Einstellungen anpassen kannst.",
    title: "Aufnahme starten",
    placement: "top",
  },
  {
    target: "[data-tour-emotion]",
    content:
      "Hier erscheinen die Ergebnisse der erkannten Emotionen anhand von Audio-Features (40%) und Text-Semantik (60%).",
    title: "Emotionale Analyse",
    placement: "left",
  },
  {
    target: "[data-tour-chat-header]",
    content:
      "In der Sprachanalyse siehst du alle Analysen deiner Aufnahmen und Texte.",
    title: "Sprachanalyse",
    placement: "bottom",
  },
  {
    target: "[data-tour-chat-input]",
    content:
      "Stelle hier Fragen zum Thema Emotionen, Kommunikation oder deinen Analysen. Der RAG-Chatbot antwortet basierend auf psychologischem Fachwissen.",
    title: "Frag den Chatbot",
    placement: "top",
  },
  {
    target: "[data-tour-recordings]",
    content:
      "In der Aufnahmen-Bibliothek findest du alle gespeicherten Analysen mit Filter- und Suchfunktionen.",
    title: "Aufnahmen-Bibliothek",
    placement: "bottom",
  },
  {
    target: "[data-tour-settings]",
    content:
      "In den Einstellungen kannst du LLM-Provider, Features, Speicher-Limits und das Theme (Hell/Dunkel) konfigurieren.",
    title: "Einstellungen",
    placement: "bottom",
  },
];
