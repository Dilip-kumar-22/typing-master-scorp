// Word banks, sentences, lessons, challenges, keyboard layout, finger map,
// and the prompt builders. Pure module — no DOM, no globals.

import type { Mode, Challenge, KeyDef, AccentSwatch } from './types';
export { LESSONS } from './lessons';

export const WORD_BANK: Record<string, string[]> = {
  home: ['ask','dad','sad','lad','flask','glass','add','salad','asks','flag','flags','half','halls','lass','sass','dash','lash','asks'],
  homeg: ['gag','sag','gas','flag','gash','gags','glass','glad','flag'],
  homeh: ['ash','hash','hall','has','had','dash','lash','shall','halls'],
  homegh: ['gash','flash','hash','flags','halls','dash','glad','shall'],
  homeleft: ['add','sad','dad','fads','flag','glad','salad','sass','lass','flask','sass'],
  homeright: ['halls','asks','lass','sass','shall','dash','lash','ash','hash'],
  upper: ['quiet','typewriter','outer','wire','your','ripe','tour','quote','priority','perpetuity','pour','pot','root','port','route'],
  upperleft: ['water','quiet','retry','tree','were','quartet','trottoir','wet','red','write'],
  upperright: ['your','pour','rip','tour','poppy','outpour','pop','you','our','pink','pit'],
  upperhome: ['salad','flask','quote','hash','ripe','glass','jet','later','wet','fad','pot','lad','dad'],
  lower: ['zoom','box','mix','van','baby','calm','bun','number','climb','beam','verb','bank','vibe','vax','barn','vocal','cab'],
  lowerleft: ['cab','baby','calm','vibe','viz','bam','vax','cave','verb','axe','cat'],
  lowerright: ['mom','nun','none','moon','no','on','my','mine','many','men','map','mop'],
  lowerhome: ['cabs','dance','salad','calm','sand','fancy','glass','manual','vibe','climb','axe','cave','mix'],
  beginner: ['cat','dog','sun','run','fly','sky','sea','sit','jog','tap','hat','map','win','box','toy','ice','red','pen','key'],
  intermediate: ['planet','rocket','silver','answer','dragon','silent','memory','jungle','copper','breath','number','shadow','guitar','pencil'],
  advanced: ['perpetual','indicator','metaphysics','consortium','recognition','characterize','triangulate','phosphorus','equilibrium','antigravity','antiquated'],
  numbers: ['12','34','56','78','90','123','456','789','100','2024','3.14','42','007','10','50','99','1000','911'],
  symbols: ['!','@','#','$','%','^','&','*','()','{}','[]','<>','?!','+','-','=','_',':','/','\\'],
};

export const SENTENCES: Record<string, string[]> = {
  expert: [
    "The quick brown fox jumps over the lazy dog; punctuation, capitals, and numbers (1234) all mix.",
    "She said, \"Don't forget the semicolons—they're tricky!\" while compiling 47 modules.",
    "Pack my box with five dozen liquor jugs: it's a classic pangram, all 26 letters appear.",
  ],
  paragraph: [
    "Typing is muscle memory wearing a costume of thought. The more you practice with intention, the less your fingers need to ask permission from your mind.",
    "There is a strange, quiet satisfaction in watching gray letters turn into a steady ribbon of green. Each keystroke is a tiny vote for the kind of typist you want to be.",
    "Speed without accuracy is just noise; accuracy without speed is just patience. The goal is to make them indistinguishable.",
    "The keys you fear are the keys you must visit most. Avoidance is the long road; deliberate practice is the short one.",
    "A great typist does not type faster, exactly. They make fewer detours. Every backspace is a small road sign for tomorrow's drill.",
    "Rhythm beats speed. Find the metronome inside your hands and the words will travel through it without effort.",
    "Look at the screen, not your hands. The hands already know; it is the eyes that keep interrupting them.",
    "Posture is half the technique. Sit tall, wrists floating, shoulders soft. The keyboard should come to you, not the other way around.",
    "Warm up like a pianist. Slow scales of the home row before any sprint. Two minutes of care saves twenty minutes of frustration.",
    "Accuracy compounds. A clean ninety words per minute is worth more than a messy one hundred and twenty.",
    "Treat each lesson like a small ceremony. Breathe in, settle, then begin. Speed loves a calm starting line.",
    "The fingers remember what the mind forgets. Trust them, and they will repay you the moment you stop watching.",
    "Every keystroke is a tiny commitment. String enough of them together and you can write the rest of your life.",
    "Beginners chase speed. Intermediates chase accuracy. Masters chase ease, and the rest follows on its own.",
    "There is no shortcut to a hundred words a minute. There is only the road, walked daily, with patience for the slow days.",
  ],
  code: [
    "const sum = (a, b) => a + b;\nfor (let i = 0; i < 10; i++) console.log(i);",
    "def fib(n):\n    if n < 2: return n\n    return fib(n-1) + fib(n-2)",
    "if (user?.name && config.enabled) { render(<App data={data} />); }",
  ],
};

export const CHALLENGES: Challenge[] = [
  { id: 'daily-challenge', label: 'Daily Challenge', desc: "Today's seeded run · resets at midnight", src: 'daily' },
  { id: 'speed-run', label: 'Speed Run Endurance', desc: 'Real English paragraphs testing muscle stamina.', src: 'paragraph', sentences: true },
  { id: 'expert-sentences', label: 'Punctuation Expert', desc: 'Complex sentences with quotes, brackets, and syntax.', src: 'expert', sentences: true },
  { id: 'code-sprint', label: 'Code Syntax Sprint', desc: 'Real syntactical coding layouts in JS/Python.', src: 'code', sentences: true },
];

// LESSONS moved to ./lessons.ts (re-exported at the top of this file)
// so this file stays focused on word banks, sentences, and prompt builders.

export const KB_ROWS: KeyDef[][] = [
  [
    ['`','~'],['1','!'],['2','@'],['3','#'],['4','$'],['5','%'],
    ['6','^'],['7','&'],['8','*'],['9','('],['0',')'],['-','_'],['=','+'],
    { label:'⌫', w:'w-175', code:'Backspace' },
  ],
  [
    { label:'Tab', w:'w-15', code:'Tab' },
    ['q','Q'],['w','W'],['e','E'],['r','R'],['t','T'],['y','Y'],['u','U'],['i','I'],['o','O'],['p','P'],
    ['[','{'],[']','}'],['\\','|'],
  ],
  [
    { label:'Caps', w:'w-175', code:'CapsLock' },
    ['a','A'],['s','S'],['d','D'],['f','F'],['g','G'],['h','H'],['j','J'],['k','K'],['l','L'],
    [';',':'],["'",'"'],
    { label:'Enter', w:'w-225', code:'Enter' },
  ],
  [
    { label:'Shift', w:'w-225', code:'ShiftLeft' },
    ['z','Z'],['x','X'],['c','C'],['v','V'],['b','B'],['n','N'],['m','M'],
    [',','<'],['.','>'],['/','?'],
    { label:'Shift', w:'w-275', code:'ShiftRight' },
  ],
  [
    { label:'Ctrl', w:'w-15', code:'ControlLeft' },
    { label:'⌥',   w:'w-15', code:'AltLeft' },
    { label:'⌘',   w:'w-15', code:'MetaLeft' },
    { label:'',    w:'w-6',  code:'Space' },
    { label:'⌘',   w:'w-15', code:'MetaRight' },
    { label:'⌥',   w:'w-15', code:'AltRight' },
    { label:'Ctrl', w:'w-15', code:'ControlRight' },
  ],
];

export const ACCENTS: AccentSwatch[] = [
  { id: 'violet', c: 'linear-gradient(135deg, #8b5cf6, #ec4899)' },
  { id: 'cyan',   c: 'linear-gradient(135deg, #06b6d4, #22d3ee)' },
  { id: 'lime',   c: 'linear-gradient(135deg, #84cc16, #22c55e)' },
  { id: 'amber',  c: 'linear-gradient(135deg, #f59e0b, #ec4899)' },
];

export const FINGER_MAP: Record<string, string> = {
  'q':'Left Pinky','a':'Left Pinky','z':'Left Pinky','1':'Left Pinky','`':'Left Pinky','Q':'Left Pinky','A':'Left Pinky','Z':'Left Pinky','~':'Left Pinky','!':'Left Pinky',
  'w':'Left Ring','s':'Left Ring','x':'Left Ring','2':'Left Ring','@':'Left Ring','W':'Left Ring','S':'Left Ring','X':'Left Ring',
  'e':'Left Middle','d':'Left Middle','c':'Left Middle','3':'Left Middle','#':'Left Middle','E':'Left Middle','D':'Left Middle','C':'Left Middle',
  'r':'Left Index','f':'Left Index','v':'Left Index','4':'Left Index','$':'Left Index','t':'Left Index','g':'Left Index','b':'Left Index','5':'Left Index','%':'Left Index',
  'R':'Left Index','F':'Left Index','V':'Left Index','T':'Left Index','G':'Left Index','B':'Left Index',
  'y':'Right Index','h':'Right Index','n':'Right Index','6':'Right Index','^':'Right Index','u':'Right Index','j':'Right Index','m':'Right Index','7':'Right Index','&':'Right Index',
  'Y':'Right Index','H':'Right Index','N':'Right Index','U':'Right Index','J':'Right Index','M':'Right Index',
  'i':'Right Middle','k':'Right Middle',',':'Right Middle','8':'Right Middle','*':'Right Middle','<':'Right Middle','I':'Right Middle','K':'Right Middle',
  'o':'Right Ring','l':'Right Ring','.':'Right Ring','9':'Right Ring','(':'Right Ring','>':'Right Ring','O':'Right Ring','L':'Right Ring',
  'p':'Right Pinky',';':'Right Pinky','/':'Right Pinky','0':'Right Pinky',')':'Right Pinky',':':'Right Pinky','?':'Right Pinky','P':'Right Pinky',
  '-':'Right Pinky','_':'Right Pinky','=':'Right Pinky','+':'Right Pinky','[':'Right Pinky','{':'Right Pinky',']':'Right Pinky','}':'Right Pinky',
  '\\':'Right Pinky','|':'Right Pinky','\'':'Right Pinky','"':'Right Pinky',
  ' ':'Either Thumb', '\n':'Right Pinky (Enter)', '\t':'Left Pinky (Tab)', '\b':'Right Pinky (Backspace)',
};

const SPECIALS = new Set([' ', '\t', '\n', '\b']);

export function buildPrompt(modeItem: Mode | null, length = 40): string {
  if (!modeItem) return WORD_BANK.beginner.slice(0, 14).join(' ');

  // Custom paragraph (Pro feature) — pulled from a window stash so we don't
  // pollute the schema. See components/CustomParagraphPanel.tsx.
  if ('id' in modeItem && modeItem.id === 'custom-paragraph') {
    const stashed = (window as unknown as { __customParagraph?: string }).__customParagraph;
    if (stashed && stashed.length > 0) return stashed;
  }

  // Sentence challenge — pick one verbatim.
  if ('sentences' in modeItem && modeItem.sentences) {
    const pool = SENTENCES[(modeItem as Challenge).src] || SENTENCES.paragraph;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Daily seeded — deterministic per calendar day.
  if ('src' in modeItem && (modeItem as Challenge).src === 'daily') {
    const pool = SENTENCES.paragraph;
    const day = new Date().toISOString().slice(0, 10);
    let seed = 0;
    for (const c of day) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
    return pool[seed % pool.length];
  }

  const src = 'src' in modeItem ? (modeItem as Challenge).src : 'beginner';
  const pool = WORD_BANK[src] || WORD_BANK.beginner;
  const out: string[] = [];
  for (let i = 0; i < length; i++) out.push(pool[Math.floor(Math.random() * pool.length)]);
  return out.join(' ');
}

export function generateFromCustomKeys(keys: Iterable<string>, length = 40): string {
  const all = [...keys];
  const letters = all.filter(c => !SPECIALS.has(c));
  const pool = letters.length ? letters : 'asdfghjkl'.split('');
  const out: string[] = [];
  for (let w = 0; w < length; w++) {
    const wl = 2 + Math.floor(Math.random() * 5);
    let word = '';
    for (let i = 0; i < wl; i++) word += pool[Math.floor(Math.random() * pool.length)];
    out.push(word);
  }
  return out.join(' ');
}
