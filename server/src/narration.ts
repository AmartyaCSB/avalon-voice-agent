export type RolesToggle = {
Merlin: boolean;
Percival: boolean;
Mordred: boolean;
Morgana: boolean;
Oberon: boolean;
};

export type Assignment = { seat: number; role: string; team: "Good" | "Evil" };


const GOOD = "Good" as const;
const EVIL = "Evil" as const;

export function teamCounts(players: number) {
if (players < 5 || players > 10) throw new Error("Players must be 5–10.");
const evilByN: Record<number, number> = { 5: 2, 6: 2, 7: 3, 8: 3, 9: 3, 10: 4 };
const evil = evilByN[players as keyof typeof evilByN];
const good = players - evil;
return { good, evil };
}


function shuffle<T>(arr: T[]) {
const a = arr.slice();
for (let i = a.length - 1; i > 0; i--) {
const j = Math.floor(Math.random() * (i + 1));
[a[i], a[j]] = [a[j], a[i]];
}
return a;
}

export function buildRolePool(players: number, opts: RolesToggle) {
const { good, evil } = teamCounts(players);
const chosen: { name: string; team: typeof GOOD | typeof EVIL }[] = [];


if (opts.Merlin) chosen.push({ name: "Merlin", team: GOOD });
chosen.push({ name: "Assassin", team: EVIL });
if (opts.Percival) chosen.push({ name: "Percival", team: GOOD });
if (opts.Mordred) chosen.push({ name: "Mordred", team: EVIL });
if (opts.Morgana) chosen.push({ name: "Morgana", team: EVIL });
if (opts.Oberon) chosen.push({ name: "Oberon", team: EVIL });


const goodChosen = chosen.filter(r => r.team === GOOD).length;
const evilChosen = chosen.filter(r => r.team === EVIL).length;
if (evilChosen > evil) throw new Error(`Too many Evil roles selected (${evilChosen}/${evil}).`);
if (goodChosen > good) throw new Error(`Too many Good roles selected (${goodChosen}/${good}).`);


for (let i = 0; i < good - goodChosen; i++) chosen.push({ name: `Loyal Servant ${i + 1}`, team: GOOD });
for (let i = 0; i < evil - evilChosen; i++) chosen.push({ name: `Minion of Mordred ${i + 1}`, team: EVIL });


if (chosen.length !== players) throw new Error("Role pool doesn’t match player count.");
return chosen;
}


export function assignRoles(players: number, opts: RolesToggle): Assignment[] {
const pool = buildRolePool(players, opts);
const shuffled = shuffle(pool);
return shuffled.map((r, i) => ({ seat: i + 1, role: r.name, team: r.team }));
}

export function buildNarration(selected: RolesToggle, players: number) {
const steps: string[] = [];
steps.push(
"Everyone, close your eyes and make a fist on the table.",
"Minions of Mordred, except Oberon, open your eyes and look around to recognize one another.",
);
if (selected.Oberon) steps.push("Reminder: Oberon, keep your eyes closed and do not reveal yourself.");
steps.push("Minions of Mordred, close your eyes.");


if (selected.Merlin) {
steps.push("Minions of Mordred, except Mordred and Oberon, extend your thumbs so Merlin can see you.");
steps.push("Merlin, open your eyes and see the raised thumbs.");
steps.push("Minions, put your thumbs down.");
steps.push("Merlin, close your eyes.");
}


if (selected.Percival && (selected.Merlin || selected.Morgana)) {
steps.push("Merlin and Morgana, extend your thumbs.");
steps.push("Percival, open your eyes and see the raised thumbs.");
steps.push("Merlin and Morgana, put your thumbs down.");
steps.push("Percival, close your eyes.");
}


steps.push("Everyone, open your eyes. The game begins.");


const notes: string[] = [];
notes.push("1) Evil (no Oberon) open eyes.");
notes.push("2) Evil close.");
if (selected.Merlin) notes.push("3) Merlin sees evil thumbs (not Mordred, never Oberon).");
if (selected.Percival && (selected.Merlin || selected.Morgana)) notes.push("4) Percival sees Merlin+Morgana thumbs.");
notes.push("5) Wake up.");


return { steps, notes };
}




