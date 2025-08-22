export type LancelotMode = 'off' | 'classic' | 'variant';

export type RolesToggle = {
  // Base Avalon
  Merlin: boolean;
  Percival: boolean;
  Mordred: boolean;
  Morgana: boolean;
  Oberon: boolean;

  // Global modules
  LadyOfTheLake: boolean;
  Cleric: boolean;

  // Lancelots
  LancelotMode: LancelotMode; // off | classic | variant

  // Messengers
  MessengerJunior: boolean;   // Good
  MessengerSenior: boolean;   // Good (knows Junior via reveal insert)
  MessengerEvil: boolean;     // Evil

  // Rogues
  RogueGood: boolean;         // Good Rogue Success
  RogueEvil: boolean;         // Evil Rogue Fail (hidden at reveal)

  // Sorcerers
  SorcererGood: boolean;      // Good Magic
  SorcererEvil: boolean;      // Evil Magic, cannot play Fail (default reveal)

  // Good extras
  Troublemaker: boolean;      // Good can lie when checked
  UntrustworthyServant: boolean; // Appears Evil to Merlin; knows Assassin, may flip at Recruitment
  Apprentice: boolean;        // Good’s Last Chance helper

  // Evil extras
  Lunatic: boolean;           // Must Fail every quest
  Brute: boolean;             // May Fail only the first 3 quests
  Revealer: boolean;          // Reveals after 2nd failed quest
  Trickster: boolean;         // May lie when checked
};

export type Assignment = { seat: number; role: string; team: 'Good' | 'Evil' };
