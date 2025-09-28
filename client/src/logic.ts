import type { RolesToggle } from "./types";

export function teamCountsSafe(players: number) {
  const counts = [
    { good: 0, evil: 0 }, // 0 players (invalid)
    { good: 0, evil: 0 }, // 1 player (invalid)
    { good: 0, evil: 0 }, // 2 players (invalid)
    { good: 0, evil: 0 }, // 3 players (invalid)
    { good: 0, evil: 0 }, // 4 players (invalid)
    { good: 3, evil: 2 }, // 5 players
    { good: 4, evil: 2 }, // 6 players
    { good: 4, evil: 3 }, // 7 players
    { good: 5, evil: 3 }, // 8 players
    { good: 6, evil: 3 }, // 9 players
    { good: 6, evil: 4 }, // 10 players
  ];
  return counts[players] || { good: 0, evil: 0 };
}

export function isAdvanced(roles: RolesToggle): boolean {
  return (
    roles.LancelotMode !== "off" ||
    roles.LadyOfTheLake ||
    roles.Cleric ||
    roles.MessengerJunior ||
    roles.MessengerSenior ||
    roles.MessengerEvil ||
    roles.RogueGood ||
    roles.RogueEvil ||
    roles.SorcererGood ||
    roles.SorcererEvil ||
    roles.Troublemaker ||
    roles.UntrustworthyServant ||
    roles.Apprentice ||
    roles.Lunatic ||
    roles.Brute ||
    roles.Revealer ||
    roles.Trickster
  );
}

export function buildSummary(players: number, roles: RolesToggle): string {
  const { good, evil } = teamCountsSafe(players);
  const advanced = isAdvanced(roles) ? "Advanced" : "Base";
  return `${advanced} game: ${players} players (${good} Good, ${evil} Evil)`;
}

export function validateConfiguration(players: number, roles: RolesToggle) {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (players < 5 || players > 10) {
    errors.push("Player count must be between 5 and 10");
  }

  const { good: goodSlots, evil: evilSlots } = teamCountsSafe(players);
  
  // Count selected roles
  let goodSelected = 0;
  let evilSelected = 1; // Assassin is always present
  
  if (roles.Merlin) goodSelected++;
  if (roles.Percival) goodSelected++;
  if (roles.Mordred) evilSelected++;
  if (roles.Morgana) evilSelected++;
  if (roles.Oberon) evilSelected++;
  if (roles.LadyOfTheLake) goodSelected++;
  if (roles.Cleric) goodSelected++;
  if (roles.LancelotMode !== "off") {
    goodSelected++; // Good Lancelot
    evilSelected++; // Evil Lancelot
  }
  if (roles.MessengerJunior) goodSelected++;
  if (roles.MessengerSenior) goodSelected++;
  if (roles.MessengerEvil) evilSelected++;
  if (roles.RogueGood) goodSelected++;
  if (roles.RogueEvil) evilSelected++;
  if (roles.SorcererGood) goodSelected++;
  if (roles.SorcererEvil) evilSelected++;
  if (roles.Troublemaker) goodSelected++;
  if (roles.UntrustworthyServant) goodSelected++;
  if (roles.Apprentice) goodSelected++;
  if (roles.Lunatic) evilSelected++;
  if (roles.Brute) evilSelected++;
  if (roles.Revealer) evilSelected++;
  if (roles.Trickster) evilSelected++;

  if (goodSelected > goodSlots) {
    errors.push(`Too many Good roles selected (${goodSelected}/${goodSlots})`);
  }
  if (evilSelected > evilSlots) {
    errors.push(`Too many Evil roles selected (${evilSelected}/${evilSlots})`);
  }

  if (goodSelected < goodSlots - 1) {
    warnings.push(`Consider adding more Good roles (${goodSelected}/${goodSlots})`);
  }
  if (evilSelected < evilSlots - 1) {
    warnings.push(`Consider adding more Evil roles (${evilSelected}/${evilSlots})`);
  }

  return {
    errors,
    warnings,
    counts: {
      goodSlots,
      evilSlots,
      goodSelected,
      evilSelected
    }
  };
}