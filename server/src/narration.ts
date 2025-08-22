export type LancelotMode = 'off' | 'classic' | 'variant';
export type RolesToggle = {
  Merlin: boolean; Percival: boolean; Mordred: boolean; Morgana: boolean; Oberon: boolean;
  LadyOfTheLake: boolean; Cleric: boolean; LancelotMode: LancelotMode;
  MessengerJunior: boolean; MessengerSenior: boolean; MessengerEvil: boolean;
  RogueGood: boolean; RogueEvil: boolean;
  SorcererGood: boolean; SorcererEvil: boolean;
  Troublemaker: boolean; UntrustworthyServant: boolean; Apprentice: boolean;
  Lunatic: boolean; Brute: boolean; Revealer: boolean; Trickster: boolean;
};
export type Assignment = { seat: number; role: string; team: 'Good' | 'Evil' };

const GOOD = 'Good' as const, EVIL = 'Evil' as const;
export function teamCounts(players: number) {
  if (players < 5 || players > 10) throw new Error('Players must be 5–10.');
  const evilByN: Record<number, number> = { 5:2,6:2,7:3,8:3,9:3,10:4 }; const evil = evilByN[players as 5|6|7|8|9|10];
  return { good: players - evil, evil };
}
function shuffle<T>(a: T[]) { a=a.slice(); for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; }

export function buildRolePool(players:number,o:RolesToggle){
  const {good,evil}=teamCounts(players);
  const chosen:{name:string;team:typeof GOOD|typeof EVIL}[]=[];
  if(o.Merlin)chosen.push({name:'Merlin',team:GOOD});
  chosen.push({name:'Assassin',team:EVIL});
  if(o.Percival)chosen.push({name:'Percival',team:GOOD});
  if(o.Mordred)chosen.push({name:'Mordred',team:EVIL});
  if(o.Morgana)chosen.push({name:'Morgana',team:EVIL});
  if(o.Oberon)chosen.push({name:'Oberon',team:EVIL});
  if(o.LancelotMode!=='off'){chosen.push({name:'Good Lancelot',team:GOOD});chosen.push({name:'Evil Lancelot',team:EVIL});}
  if(o.MessengerJunior)chosen.push({name:'Junior Messenger',team:GOOD});
  if(o.MessengerSenior)chosen.push({name:'Senior Messenger',team:GOOD});
  if(o.MessengerEvil)chosen.push({name:'Evil Messenger',team:EVIL});
  if(o.RogueGood)chosen.push({name:'Good Rogue',team:GOOD});
  if(o.RogueEvil)chosen.push({name:'Evil Rogue',team:EVIL});
  if(o.SorcererGood)chosen.push({name:'Good Sorcerer',team:GOOD});
  if(o.SorcererEvil)chosen.push({name:'Evil Sorcerer',team:EVIL});
  if(o.Cleric)chosen.push({name:'Cleric',team:GOOD});
  if(o.Troublemaker)chosen.push({name:'Troublemaker',team:GOOD});
  if(o.UntrustworthyServant)chosen.push({name:'Untrustworthy Servant',team:GOOD});
  if(o.Apprentice)chosen.push({name:'Apprentice',team:GOOD});
  if(o.Lunatic)chosen.push({name:'Lunatic',team:EVIL});
  if(o.Brute)chosen.push({name:'Brute',team:EVIL});
  if(o.Revealer)chosen.push({name:'Revealer',team:EVIL});
  if(o.Trickster)chosen.push({name:'Trickster',team:EVIL});
  const g=chosen.filter(r=>r.team===GOOD).length, e=chosen.filter(r=>r.team===EVIL).length;
  if(e>evil)throw new Error(`Too many Evil roles selected (${e}/${evil}).`);
  if(g>good)throw new Error(`Too many Good roles selected (${g}/${good}).`);
  for(let i=0;i<good-g;i++)chosen.push({name:`Loyal Servant ${i+1}`,team:GOOD});
  for(let i=0;i<evil-e;i++)chosen.push({name:`Minion of Mordred ${i+1}`,team:EVIL});
  if(chosen.length!==players)throw new Error('Role pool does not match player count.');
  return chosen;
}
export function assignRoles(players:number,opts:RolesToggle){return shuffle(buildRolePool(players,opts)).map((r,i)=>({seat:i+1,role:r.name,team:r.team}));}
export function buildNarration(o:RolesToggle,_p:number){
  const steps:string[] = [], notes:string[]=[];
  const except=(a:string[])=>a.length?`, except ${a.slice(0,-1).join(', ')}${a.length>1?' and ':''}${a[a.length-1]},`:`,`;
  steps.push('Everyone, close your eyes and make a fist on the table.');
  if(o.Cleric){steps.push('Leader, extend your thumb if you are Evil.');steps.push('Cleric, open your eyes and see if the Leader is Good or Evil.');steps.push('Cleric, close your eyes.');steps.push('Leader, re-form your hand into a fist.');}
  const evilOpenSkips:string[]=[]; if(o.Oberon)evilOpenSkips.push('Oberon'); if(o.LancelotMode==='variant')evilOpenSkips.push('Evil Lancelot'); if(o.RogueEvil)evilOpenSkips.push('Evil Rogue');
  steps.push(`Minions of Mordred${except(evilOpenSkips)} open your eyes and look around so that you know all agents of Evil.`);
  if(o.LancelotMode==='variant')steps.push('Evil Lancelot, keep your eyes closed but extend your thumb so the other agents of Evil may know you.');
  if(o.Oberon)steps.push('Reminder: Oberon, keep your eyes closed and do not reveal yourself.');
  steps.push('Minions of Mordred, close your eyes.');
  if(o.LancelotMode==='classic'){steps.push('Lancelots, open your eyes to reveal your counterpart.');steps.push('Lancelots, close your eyes.');}
  if(o.Merlin){
    const m:string[]=[]; if(o.Mordred)m.push('Mordred'); if(o.Oberon)m.push('Oberon'); if(o.RogueEvil)m.push('the Evil Rogue');
    steps.push(`Minions of Mordred${m.length?`, except ${m.join(' and ')},`:''} extend your thumbs so that Merlin will know of you.`);
    if(o.UntrustworthyServant)steps.push('Untrustworthy Servant, also extend your thumb so that Merlin will think you are Evil.');
    steps.push('Merlin, open your eyes and see the raised thumbs.'); steps.push(`Minions of Mordred${o.UntrustworthyServant ? ' and Untrustworthy Servant' : ''}, put your thumbs down.`); steps.push('Merlin, close your eyes.');
  }
  if(o.Percival&&(o.Merlin||o.Morgana)){const who=[o.Merlin?'Merlin':null,o.Morgana?'Morgana':null].filter(Boolean).join(' and '); steps.push(`${who}, extend your thumbs so that Percival may know of you.`); steps.push('Percival, open your eyes and see the raised thumbs.'); steps.push(`${who}, re-form your hand into a fist.`); steps.push('Percival, close your eyes.');}
  if(o.MessengerSenior&&o.MessengerJunior){steps.push('Junior Messenger, extend your thumb so that the Senior Messenger may know you.'); steps.push('Senior Messenger, open your eyes.'); steps.push('Senior Messenger, close your eyes.'); steps.push('Junior Messenger, re-form your hand into a fist.');}
  if(o.UntrustworthyServant){steps.push('Assassin, extend your thumb so that the Untrustworthy Servant may know you.'); steps.push('Untrustworthy Servant, open your eyes.'); steps.push('Untrustworthy Servant, close your eyes.'); steps.push('Assassin, re-form your hand into a fist.');}
  steps.push('Everyone, open your eyes. The game begins.');
  const skip:string[]=[]; if(o.Oberon)skip.push('Oberon'); if(o.LancelotMode==='variant')skip.push('Evil Lancelot (thumbs only)'); if(o.RogueEvil)skip.push('Evil Rogue'); if(skip.length)notes.push(`Evil open-eyes skip: ${skip.join(', ')}.`);
  if(o.Merlin){const ex:string[]=[]; if(o.Mordred)ex.push('not Mordred'); if(o.Oberon)ex.push('never Oberon'); if(o.RogueEvil)ex.push('not the Evil Rogue'); notes.push(`Merlin sees evil thumbs ${ex.length?`(${ex.join(', ')})`:''}.`);}
  if(o.LancelotMode==='classic')notes.push('Lancelots know each other (classic).');
  if(o.LancelotMode==='variant')notes.push('Lancelots do not know each other; Evil Lancelot thumbs only (variant).');
  if(o.MessengerSenior||o.MessengerJunior||o.MessengerEvil)notes.push('Messenger module in play.');
  if(o.RogueGood||o.RogueEvil)notes.push('Rogue module in play.');
  if(o.SorcererGood||o.SorcererEvil)notes.push('Sorcerer module in play (Magic can reverse a Quest).');
  if(o.LadyOfTheLake)notes.push('Lady of the Lake in play (after Quests 2–4).');
  if(o.UntrustworthyServant)notes.push('Untrustworthy Servant appears Evil to Merlin; learns Assassin; may flip at Recruitment.');
  if(o.Lunatic)notes.push('Lunatic must Fail every Quest they are on.');
  if(o.Brute)notes.push('Brute may Fail only the first three Quests.');
  if(o.Revealer)notes.push('Revealer reveals loyalty after the second failed Quest.');
  if(o.Trickster)notes.push('Trickster/Troublemaker may lie when checked.');
  if(o.Apprentice)notes.push('Apprentice: Good’s Last Chance helper.');
  return { steps, notes };
}
