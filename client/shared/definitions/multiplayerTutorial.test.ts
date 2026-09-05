// Staging-only bridge: the repository Vitest config roots tests at /client.
// Import the canonical shared multiplayer contract so the staging gate executes
// the real assertions without duplicating them.
import "../../../shared/definitions/multiplayerTutorial.test";
