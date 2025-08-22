export type LancelotMode = 'off' | 'classic' | 'variant';

export type RolesToggle = {
  // Base
  Merlin: boolean;
  Percival: boolean;
  Mordred: boolean;
  Morgana: boolean;
  Oberon: boolean;

  // Global modules
  LadyOfTheLake: boolean;
  Cleric: boolean;

  // Lancelots
  LancelotMode: LancelotMode;

  // Messengers
  MessengerJunior: boolean;
  MessengerSenior: boolean;
  MessengerEvil: boolean;

  // Rogues
  RogueGood: boolean;
  RogueEvil: boolean;

  // Sorcerers
  SorcererGood: boolean;
  SorcererEvil: boolean;

  // Good extras
  Troublemaker: boolean;
  UntrustworthyServant: boolean;
  Apprentice: boolean;

  // Evil extras
  Lunatic: boolean;
  Brute: boolean;
  Revealer: boolean;
  Trickster: boolean;
};

export type Assignment = { seat: number; role: string; team: 'Good' | 'Evil' };
