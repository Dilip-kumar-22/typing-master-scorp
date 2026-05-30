/* Words, mode definitions, sample sentences. */

const WORD_BANK = {
  home: ['ask','dad','sad','lad','flask','glass','add','jab','salad','hash','flash','dash','gash','lash','ass','asks','flag','flags','half','halls'],
  homeg: ['gag','sag','gas','flag','gash','gags'],
  homeh: ['ash','hash','hall','has','had','dash'],
  homegh: ['gash','flash','hash','flags','halls','dash'],
  homeleft: ['add','sad','dad','fads','flag','glad','salad','sass','lass','flag','flask','flag'],
  homeright: ['hjk','jkl','hkl','hh','jj','kk','ll'],
  upper: ['quiet','typewriter','outer','wire','your','ripe','tour','quote','yo','priority','perpetuity'],
  upperleft: ['water','quiet','retry','tree','were','quartet','trottoir'],
  upperright: ['your','pour','rip','tour','poppy','outpour','pop'],
  upperhome: ['salad','flask','quote','hash','ripe','glass','jet','later'],
  lower: ['zoom','box','mix','van','baby','calm','bun','number','climb','beam'],
  lowerleft: ['cab','baby','calm','vibe','viz','bam','vax'],
  lowerright: ['mom','nun','none,','non.','mn,','moon.','m./n'],
  lowerhome: ['cabs','dance','salad','calm','sand','fancy','glass','manual'],
  beginner: ['cat','dog','sun','run','fly','sky','sea','sit','jog','tap','hat','map','win','box'],
  intermediate: ['planet','rocket','silver','answer','dragon','silent','memory','silver','jungle','copper','breath','number'],
  advanced: ['perpetual','indicator','metaphysics','consortium','recognition','characterize','triangulate','phosphorus','equilibrium'],
  numbers: ['12','34','56','78','90','123','456','789','100','2024','3.14','42','007'],
  symbols: ['!','@','#','$','%','^','&','*','()','{}','[]','<>','?!'],
};

const SENTENCES = {
  expert: [
    "The quick brown fox jumps over the lazy dog; punctuation, capitals, and numbers (1234) all mix.",
    "She said, \"Don't forget the semicolons—they're tricky!\" while compiling 47 modules.",
    "Pack my box with five dozen liquor jugs: it's a classic pangram, all 26 letters appear.",
  ],
  paragraph: [
    "Typing is muscle memory wearing a costume of thought. The more you practice with intention, the less your fingers need to ask permission from your mind.",
    "There is a strange, quiet satisfaction in watching gray letters turn into a steady ribbon of green. Each keystroke is a tiny vote for the kind of typist you want to be.",
    "Speed without accuracy is just noise; accuracy without speed is just patience. The goal is to make them indistinguishable.",
  ],
  code: [
    "const sum = (a, b) => a + b;\nfor (let i = 0; i < 10; i++) console.log(i);",
    "def fib(n):\n    if n < 2: return n\n    return fib(n-1) + fib(n-2)",
    "if (user?.name && config.enabled) { render(<App data={data} />); }",
  ],
};

const MODE_GROUPS = [
  {
    id: 'home', label: 'Home Row', icon: 'H',
    items: [
      { id: 'home-only',   label: 'Home keys only',         keys: 'asdfghjkl;', src: 'home' },
      { id: 'home-g',      label: 'Home + G only',          keys: 'asdfghjkl;', src: 'homeg' },
      { id: 'home-h',      label: 'Home + H only',          keys: 'asdfghjkl;', src: 'homeh' },
      { id: 'home-gh',     label: 'Home + G and H',         keys: 'asdfghjkl;', src: 'homegh' },
      { id: 'home-left',   label: 'Left hand only',         keys: 'asdfg',       src: 'homeleft' },
      { id: 'home-right',  label: 'Right hand only',        keys: 'hjkl;',       src: 'homeright' },
    ]
  },
  {
    id: 'upper', label: 'Upper Row', icon: 'U',
    items: [
      { id: 'upper-only',  label: 'Upper row only',         keys: 'qwertyuiop', src: 'upper' },
      { id: 'upper-left',  label: 'Left hand',              keys: 'qwert',      src: 'upperleft' },
      { id: 'upper-right', label: 'Right hand',             keys: 'yuiop',      src: 'upperright' },
      { id: 'upper-home',  label: 'Upper + Home combined',  keys: 'qwertyuiopasdfghjkl;', src: 'upperhome' },
    ]
  },
  {
    id: 'lower', label: 'Lower Row', icon: 'L',
    items: [
      { id: 'lower-only',  label: 'Lower row only',         keys: 'zxcvbnm,./',  src: 'lower' },
      { id: 'lower-left',  label: 'Left hand',              keys: 'zxcvb',       src: 'lowerleft' },
      { id: 'lower-right', label: 'Right hand',             keys: 'nm,./',       src: 'lowerright' },
      { id: 'lower-home',  label: 'Lower + Home combined',  keys: 'zxcvbnm,./asdfghjkl;', src: 'lowerhome' },
    ]
  },
  {
    id: 'custom', label: 'Custom Keys', icon: '◇', custom: true,
    items: [
      { id: 'custom-set',  label: 'Pick your own keys',     keys: '', src: 'custom' },
    ]
  },
  {
    id: 'numsym', label: 'Numbers & Symbols', icon: '#',
    items: [
      { id: 'numbers',     label: 'Numbers only (1–0)',     keys: '1234567890',  src: 'numbers' },
      { id: 'symbols',     label: 'Symbols only',           keys: '!@#$%^&*()',  src: 'symbols' },
      { id: 'all-keys',    label: 'All keys combined',      keys: 'all',         src: 'mixed' },
    ]
  },
  {
    id: 'case', label: 'Case Modes', icon: 'Aa',
    items: [
      { id: 'lower-case',  label: 'lowercase only',         keys: '',  src: 'case-lower' },
      { id: 'upper-case',  label: 'UPPERCASE ONLY',         keys: '',  src: 'case-upper' },
      { id: 'mixed-case',  label: 'Mixed case',             keys: '',  src: 'case-mixed' },
      { id: 'camel-case',  label: 'camelCase words',        keys: '',  src: 'case-camel' },
    ]
  },
  {
    id: 'level', label: 'Difficulty', icon: '▲',
    items: [
      { id: 'beginner',     label: 'Beginner · 2–4 letters', keys: '',  src: 'beginner' },
      { id: 'intermediate', label: 'Intermediate · 5–7',     keys: '',  src: 'intermediate' },
      { id: 'advanced',     label: 'Advanced · 8–12',        keys: '',  src: 'advanced' },
      { id: 'expert',       label: 'Expert · sentences',     keys: '',  src: 'expert', sentences: true },
      { id: 'code',         label: 'Code snippets',          keys: '',  src: 'code', sentences: true },
      { id: 'paragraph',    label: 'Paragraph mode',         keys: '',  src: 'paragraph', sentences: true },
    ]
  },
];

/* QWERTY keyboard layout */
const KB_ROWS = [
  [
    ['`','~'],['1','!'],['2','@'],['3','#'],['4','$'],['5','%'],
    ['6','^'],['7','&'],['8','*'],['9','('],['0',')'],['-','_'],['=','+'],
    {label:'⌫', w:'w-175', code:'Backspace'}
  ],
  [
    {label:'Tab', w:'w-15', code:'Tab'},
    ['q','Q'],['w','W'],['e','E'],['r','R'],['t','T'],['y','Y'],['u','U'],['i','I'],['o','O'],['p','P'],
    ['[','{'],[']','}'],['\\','|']
  ],
  [
    {label:'Caps', w:'w-175', code:'CapsLock'},
    ['a','A'],['s','S'],['d','D'],['f','F'],['g','G'],['h','H'],['j','J'],['k','K'],['l','L'],
    [';',':'],["'",'"'],
    {label:'Enter', w:'w-225', code:'Enter'}
  ],
  [
    {label:'Shift', w:'w-225', code:'ShiftLeft'},
    ['z','Z'],['x','X'],['c','C'],['v','V'],['b','B'],['n','N'],['m','M'],
    [',','<'],['.','>'],['/','?'],
    {label:'Shift', w:'w-275', code:'ShiftRight'}
  ],
  [
    {label:'Ctrl', w:'w-15', code:'ControlLeft'},
    {label:'⌥', w:'w-15', code:'AltLeft'},
    {label:'⌘', w:'w-15', code:'MetaLeft'},
    {label:'', w:'w-6', code:'Space'},
    {label:'⌘', w:'w-15', code:'MetaRight'},
    {label:'⌥', w:'w-15', code:'AltRight'},
    {label:'Ctrl', w:'w-15', code:'ControlRight'},
  ]
];

const ACCENTS = [
  { id: 'violet',  c: 'linear-gradient(135deg, #8b5cf6, #ec4899)' },
  { id: 'cyan',    c: 'linear-gradient(135deg, #06b6d4, #22d3ee)' },
  { id: 'lime',    c: 'linear-gradient(135deg, #84cc16, #22c55e)' },
  { id: 'amber',   c: 'linear-gradient(135deg, #f59e0b, #ec4899)' },
];

window.WORD_BANK = WORD_BANK;
window.SENTENCES = SENTENCES;
window.MODE_GROUPS = MODE_GROUPS;
window.KB_ROWS = KB_ROWS;
window.ACCENTS = ACCENTS;

/* Builds prompt text from a mode. */
function buildPrompt(modeItem, length = 40) {
  if (!modeItem) return WORD_BANK.beginner.slice(0, 14).join(' ');
  if (modeItem.sentences) {
    const pool = SENTENCES[modeItem.src] || SENTENCES.paragraph;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  if (modeItem.src && modeItem.src.startsWith('case-')) {
    const base = WORD_BANK.intermediate;
    const out = [];
    for (let i = 0; i < length; i++) {
      let w = base[Math.floor(Math.random() * base.length)];
      if (modeItem.src === 'case-upper') w = w.toUpperCase();
      else if (modeItem.src === 'case-mixed') w = w.split('').map(c => Math.random() > 0.5 ? c.toUpperCase() : c).join('');
      else if (modeItem.src === 'case-camel' && i % 2 === 1) w = w[0].toUpperCase() + w.slice(1);
      out.push(w);
    }
    return out.join(' ');
  }
  const pool = WORD_BANK[modeItem.src] || WORD_BANK.beginner;
  const out = [];
  for (let i = 0; i < length; i++) out.push(pool[Math.floor(Math.random() * pool.length)]);
  return out.join(' ');
}
window.buildPrompt = buildPrompt;
