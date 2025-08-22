import type { RolesToggle, Assignment } from "./types";

type Team = 'Good' | 'Evil';
const GOOD: Team = 'Good';
const EVIL: Team = 'Evil';

export function teamCounts(players: number) {
  if (players < 5 || players > 10) throw new Error('Players must be 5–10.');
  const evilByN: Record<number, number> = { 5: 2, 6: 2, 7: 3, 8: 3, 9: 3, 10: 4 };
  const evil = evilByN[players as 5|6|7|8|9|10];
  return { good: players - evil, evil };
}

function shuffle<T>(a: T[]) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildRolePool(players: number, o: RolesToggle) {
  const { good, evil } = teamCounts(players);
  const chosen: { name: string; team: Team }[] = [];

  // Base
  if (o.Merlin) chosen.push({ name: 'Merlin', team: GOOD });
  chosen.push({ name: 'Assassin', team: EVIL });
  if (o.Percival) chosen.push({ name: 'Percival', team: GOOD });
  if (o.Mordred) chosen.push({ name: 'Mordred', team: EVIL });
  if (o.Morgana) chosen.push({ name: 'Morgana', team: EVIL });
  if (o.Oberon) chosen.push({ name: 'Oberon', team: EVIL });

  // Lancelots
  if (o.LancelotMode !== 'off') {
    chosen.push({ name: 'Good Lancelot', team: GOOD });
    chosen.push({ name: 'Evil Lancelot', team: EVIL });
  }

  // Messengers
  if (o.MessengerJunior) chosen.push({ name: 'Junior Messenger', team: GOOD });
  if (o.MessengerSenior) chosen.push({ name: 'Senior Messenger', team: GOOD });
  if (o.MessengerEvil)   chosen.push({ name: 'Evil Messenger', team: EVIL });

  // Rogues
  if (o.RogueGood) chosen.push({ name: 'Good Rogue', team: GOOD });
  if (o.RogueEvil) chosen.push({ name: 'Evil Rogue', team: EVIL });

  // Sorcerers
  if (o.SorcererGood) chosen.push({ name: 'Good Sorcerer', team: GOOD });
  if (o.SorcererEvil) chosen.push({ name: 'Evil Sorcerer', team: EVIL });

  // Good extras
  if (o.Cleric) chosen.push({ name: 'Cleric', team: GOOD });
  if (o.Troublemaker) chosen.push({ name: 'Troublemaker', team: GOOD });
  if (o.UntrustworthyServant) chosen.push({ name: 'Untrustworthy Servant', team: GOOD });
  if (o.Apprentice) chosen.push({ name: 'Apprentice', team: GOOD });

  // Evil extras
  if (o.Lunatic) chosen.push({ name: 'Lunatic', team: EVIL });
  if (o.Brute) chosen.push({ name: 'Brute', team: EVIL });
  if (o.Revealer) chosen.push({ name: 'Revealer', team: EVIL });
  if (o.Trickster) chosen.push({ name: 'Trickster', team: EVIL });

  const goodChosen = chosen.filter(r => r.team === GOOD).length;
  const evilChosen = chosen.filter(r => r.team === EVIL).length;
  if (evilChosen > evil) throw new Error(`Too many Evil roles selected (${evilChosen}/${evil}).`);
  if (goodChosen > good) throw new Error(`Too many Good roles selected (${goodChosen}/${good}).`);

  for (let i = 0; i < good - goodChosen; i++) chosen.push({ name: `Loyal Servant ${i + 1}`, team: GOOD });
  for (let i = 0; i < evil - evilChosen; i++) chosen.push({ name: `Minion of Mordred ${i + 1}`, team: EVIL });

  if (chosen.length !== players) throw new Error('Role pool does not match player count.');
  return chosen;
}

export function assignRoles(players: number, opts: RolesToggle): Assignment[] {
  const pool = buildRolePool(players, opts);
  return shuffle(pool).map((r, i) => ({ seat: i + 1, role: r.name, team: r.team }));
}

export function buildNarration(o: RolesToggle, _players: number) {
  const steps: string[] = [];
  const notes: string[] = [];
  const except = (arr: string[]) =>
    arr.length ? `, except ${arr.slice(0, -1).join(', ')}${arr.length > 1 ? ' and ' : ''}${arr[arr.length - 1]},` : ',';

  steps.push('Everyone, close your eyes and make a fist on the table.');

  if (o.Cleric) {
    steps.push('Leader, extend your thumb if you are Evil.');
    steps.push('Cleric, open your eyes and see if the Leader is Good or Evil.');
    steps.push('Cleric, close your eyes.');
    steps.push('Leader, re-form your hand into a fist.');
  }

  const evilOpenSkips: string[] = [];
  if (o.Oberon) evilOpenSkips.push('Oberon');
  if (o.LancelotMode === 'variant') evilOpenSkips.push('Evil Lancelot');
  if (o.RogueEvil) evilOpenSkips.push('Evil Rogue');
  steps.push(`Minions of Mordred${except(evilOpenSkips)} open your eyes and look around so that you know all agents of Evil.`);

  if (o.LancelotMode === 'variant') {
    steps.push('Evil Lancelot, keep your eyes closed but extend your thumb so the other agents of Evil may know you.');
  }
  if (o.Oberon) steps.push('Reminder: Oberon, keep your eyes closed and do not reveal yourself.');

  steps.push('Minions of Mordred, close your eyes.');

  if (o.LancelotMode === 'classic') {
    steps.push('Lancelots, open your eyes to reveal your counterpart.');
    steps.push('Lancelots, close your eyes.');
  }

  if (o.Merlin) {
    const merlinSkips: string[] = [];
    if (o.Mordred) merlinSkips.push('Mordred');
    if (o.Oberon) merlinSkips.push('Oberon');
    if (o.RogueEvil) merlinSkips.push('the Evil Rogue');
    steps.push(`Minions of Mordred${merlinSkips.length ? `, except ${merlinSkips.join(' and ')},` : ''} extend your thumbs so that Merlin will know of you.`);
    if (o.UntrustworthyServant) steps.push('Untrustworthy Servant, also extend your thumb so that Merlin will think you are Evil.');
    steps.push('Merlin, open your eyes and see the raised thumbs.');
    steps.push(`Minions of Mordred${o.UntrustworthyServant ? ' and Untrustworthy Servant' : ''}, put your thumbs down.`);
    steps.push('Merlin, close your eyes.');
  }

  if (o.Percival && (o.Merlin || o.Morgana)) {
    const who = [o.Merlin ? 'Merlin' : null, o.Morgana ? 'Morgana' : null].filter(Boolean).join(' and ');
    steps.push(`${who}, extend your thumbs so that Percival may know of you.`);
    steps.push('Percival, open your eyes and see the raised thumbs.');
    steps.push(`${who}, re-form your hand into a fist.`);
    steps.push('Percival, close your eyes.');
  }

  if (o.MessengerSenior && o.MessengerJunior) {
    steps.push('Junior Messenger, extend your thumb so that the Senior Messenger may know you.');
    steps.push('Senior Messenger, open your eyes.');
    steps.push('Senior Messenger, close your eyes.');
    steps.push('Junior Messenger, re-form your hand into a fist.');
  }

  if (o.UntrustworthyServant) {
    steps.push('Assassin, extend your thumb so that the Untrustworthy Servant may know you.');
    steps.push('Untrustworthy Servant, open your eyes.');
    steps.push('Untrustworthy Servant, close your eyes.');
    steps.push('Assassin, re-form your hand into a fist.');
  }

  steps.push('Everyone, open your eyes. The game begins.');

  // Notes
  const skipBits = [];
  if (o.Oberon) skipBits.push('Oberon');
  if (o.LancelotMode === 'variant') skipBits.push('Evil Lancelot (thumbs only)');
  if (o.RogueEvil) skipBits.push('Evil Rogue');
  if (skipBits.length) notes.push(`Evil open-eyes skip: ${skipBits.join(', ')}.`);
  if (o.Merlin) {
    const ex: string[] = [];
    if (o.Mordred) ex.push('not Mordred');
    if (o.Oberon) ex.push('never Oberon');
    if (o.RogueEvil) ex.push('not the Evil Rogue');
    notes.push(`Merlin sees evil thumbs ${ex.length ? `(${ex.join(', ')})` : ''}.`);
  }
  if (o.LancelotMode === 'classic') notes.push('Lancelots know each other (classic).');
  if (o.LancelotMode === 'variant') notes.push('Lancelots do not know each other; Evil Lancelot thumbs only (variant).');
  if (o.MessengerSenior || o.MessengerJunior || o.MessengerEvil) notes.push('Messenger module in play.');
  if (o.RogueGood || o.RogueEvil) notes.push('Rogue module in play.');
  if (o.SorcererGood || o.SorcererEvil) notes.push('Sorcerer module in play (Magic can reverse a Quest).');
  if (o.LadyOfTheLake) notes.push('Lady of the Lake: loyalty checks after Quests 2–4.');
  if (o.UntrustworthyServant) notes.push('Untrustworthy Servant: appears Evil to Merlin; learns Assassin; may flip at Recruitment.');
  if (o.Lunatic) notes.push('Lunatic must Fail every Quest they are on.');
  if (o.Brute) notes.push('Brute may Fail only the first three Quests.');
  if (o.Revealer) notes.push('Revealer reveals loyalty after the second failed Quest.');
  if (o.Trickster || o.Troublemaker) notes.push('Trickster/Troublemaker may lie when checked.');
  if (o.Apprentice) notes.push('Apprentice: Good’s Last Chance helper.');

  return { steps, notes };
}
export function selectedRoleCounts(o: RolesToggle) {
  const goodNames: string[] = [];
  const evilNames: string[] = [];

  // Always in game
  evilNames.push('Assassin');

  // Base / toggles
  if (o.Merlin) goodNames.push('Merlin');
  if (o.Percival) goodNames.push('Percival');
  if (o.Mordred) evilNames.push('Mordred');
  if (o.Morgana) evilNames.push('Morgana');
  if (o.Oberon) evilNames.push('Oberon');

  // Lancelots
  if (o.LancelotMode !== 'off') {
    goodNames.push('Good Lancelot');
    evilNames.push('Evil Lancelot');
  }

  // Messengers
  if (o.MessengerJunior) goodNames.push('Junior Messenger');
  if (o.MessengerSenior) goodNames.push('Senior Messenger');
  if (o.MessengerEvil)   evilNames.push('Evil Messenger');

  // Rogues
  if (o.RogueGood) goodNames.push('Good Rogue');
  if (o.RogueEvil) evilNames.push('Evil Rogue');

  // Sorcerers
  if (o.SorcererGood) goodNames.push('Good Sorcerer');
  if (o.SorcererEvil) evilNames.push('Evil Sorcerer');

  // Good extras
  if (o.Cleric) goodNames.push('Cleric');
  if (o.Troublemaker) goodNames.push('Troublemaker');
  if (o.UntrustworthyServant) goodNames.push('Untrustworthy Servant');
  if (o.Apprentice) goodNames.push('Apprentice');

  // Evil extras
  if (o.Lunatic) evilNames.push('Lunatic');
  if (o.Brute) evilNames.push('Brute');
  if (o.Revealer) evilNames.push('Revealer');
  if (o.Trickster) evilNames.push('Trickster');

  return { good: goodNames.length, evil: evilNames.length, goodNames, evilNames };
}

export function validateConfiguration(players: number, o: RolesToggle) {
  const errors: string[] = [];
  const warnings: string[] = [];

  const { good: goodSel, evil: evilSel, goodNames, evilNames } = selectedRoleCounts(o);

  let goodSlots = 0;
  let evilSlots = 0;
  try {
    const t = teamCounts(players);
    goodSlots = t.good;
    evilSlots = t.evil;
  } catch {
    errors.push('Players must be between 5 and 10.');
  }

  if (goodSlots > 0 && evilSlots > 0) {
    if (evilSel > evilSlots) {
      const over = evilSel - evilSlots;
      errors.push(`Too many Evil roles selected: ${evilSel}/${evilSlots}. Reduce by ${over}. Currently: ${evilNames.join(', ')}.`);
    }
    if (goodSel > goodSlots) {
      const over = goodSel - goodSlots;
      errors.push(`Too many Good roles selected: ${goodSel}/${goodSlots}. Reduce by ${over}. Currently: ${goodNames.join(', ')}.`);
    }
  }

  if (o.Percival && !o.Merlin && !o.Morgana) {
    warnings.push('Percival has nobody to see (neither Merlin nor Morgana are selected).');
  }
  if (o.MessengerSenior && !o.MessengerJunior) {
    warnings.push('Senior Messenger is enabled but Junior Messenger is not; the reveal step for Messengers will be skipped.');
  }

  return {
    errors,
    warnings,
    counts: {
      goodSelected: goodSel,
      evilSelected: evilSel,
      goodSlots,
      evilSlots,
      goodNames,
      evilNames
    }
  };
}
