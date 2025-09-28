export interface RolesToggle {
  Merlin: boolean;
  Percival: boolean;
  Mordred: boolean;
  Morgana: boolean;
  Oberon: boolean;
  LadyOfTheLake: boolean;
  Cleric: boolean;
  LancelotMode: "off" | "classic" | "variant";
  MessengerJunior: boolean;
  MessengerSenior: boolean;
  MessengerEvil: boolean;
  RogueGood: boolean;
  RogueEvil: boolean;
  SorcererGood: boolean;
  SorcererEvil: boolean;
  Troublemaker: boolean;
  UntrustworthyServant: boolean;
  Apprentice: boolean;
  Lunatic: boolean;
  Brute: boolean;
  Revealer: boolean;
  Trickster: boolean;
}

export interface Assignment {
  seat: number;
  role: string;
  team: "Good" | "Evil";
}