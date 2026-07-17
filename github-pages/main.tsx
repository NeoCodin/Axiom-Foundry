import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Game from "../app/page";
import "../app/globals.css";
import "../app/ark-deck.css";
import "../app/continuity-console.css";
import "../app/research-lattice.css";
import "../app/game-manual.css";
import "../app/awakening.css";
import "../app/pixel-ui.css";
import "../app/axiom-law-heart.css";
import "../app/lore-archive.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Game />
  </StrictMode>,
);
