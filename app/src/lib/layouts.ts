// Physical keyboard layouts.
//
// These describe what the 3D rendered keyboard LOOKS like, independent of
// the user's OS keymap. A user on a physical QWERTY keyboard who wants to
// learn Dvorak can pick "Dvorak" here and the 3D heatmap re-renders in the
// Dvorak arrangement. The user is responsible for using a Dvorak-mapped OS
// (or remembering which physical key corresponds to which Dvorak letter).
//
// For most users the default QWERTY is correct; AZERTY/QWERTZ matter to
// French/German users; Dvorak/Colemak are for the alt-layout community.
//
// Each layout reuses the same KeyDef shape as data.ts → KB_ROWS so it slots
// directly into KeyboardCard with zero render-side changes.

import type { KeyDef } from './types';

export type KbLayoutId = 'qwerty' | 'azerty' | 'qwertz' | 'dvorak' | 'colemak';

export interface KbLayoutMeta {
  id: KbLayoutId;
  name: string;
  description: string;
  rows: KeyDef[][];
}

// ─── QWERTY (default, US/UK/international) ────────────────────
const QWERTY: KeyDef[][] = [
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

// ─── AZERTY (France / Belgium) ───────────────────────────────
// Top row letters: AZERTYUIOP (Q is swapped with A; W with Z; M moves to
// right-of-L). Number row is shifted (need Shift for digits).
const AZERTY: KeyDef[][] = [
  [
    ['²',''],['&','1'],['é','2'],['"','3'],["'",'4'],['(','5'],
    ['-','6'],['è','7'],['_','8'],['ç','9'],['à','0'],[')','°'],['=','+'],
    { label:'⌫', w:'w-175', code:'Backspace' },
  ],
  [
    { label:'Tab', w:'w-15', code:'Tab' },
    ['a','A'],['z','Z'],['e','E'],['r','R'],['t','T'],['y','Y'],['u','U'],['i','I'],['o','O'],['p','P'],
    ['^','¨'],['$','£'],['*','µ'],
  ],
  [
    { label:'Caps', w:'w-175', code:'CapsLock' },
    ['q','Q'],['s','S'],['d','D'],['f','F'],['g','G'],['h','H'],['j','J'],['k','K'],['l','L'],
    ['m','M'],['ù','%'],
    { label:'Enter', w:'w-225', code:'Enter' },
  ],
  [
    { label:'Shift', w:'w-15', code:'ShiftLeft' },
    ['<','>'],
    ['w','W'],['x','X'],['c','C'],['v','V'],['b','B'],['n','N'],
    [',','?'],[';','.'],[':','/'],['!','§'],
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

// ─── QWERTZ (Germany / Austria / Switzerland) ────────────────
// Z and Y are swapped vs QWERTY; punctuation block on the right differs.
const QWERTZ: KeyDef[][] = [
  [
    ['^','°'],['1','!'],['2','"'],['3','§'],['4','$'],['5','%'],
    ['6','&'],['7','/'],['8','('],['9',')'],['0','='],['ß','?'],['´','`'],
    { label:'⌫', w:'w-175', code:'Backspace' },
  ],
  [
    { label:'Tab', w:'w-15', code:'Tab' },
    ['q','Q'],['w','W'],['e','E'],['r','R'],['t','T'],['z','Z'],['u','U'],['i','I'],['o','O'],['p','P'],
    ['ü','Ü'],['+','*'],['#',"'"],
  ],
  [
    { label:'Caps', w:'w-175', code:'CapsLock' },
    ['a','A'],['s','S'],['d','D'],['f','F'],['g','G'],['h','H'],['j','J'],['k','K'],['l','L'],
    ['ö','Ö'],['ä','Ä'],
    { label:'Enter', w:'w-225', code:'Enter' },
  ],
  [
    { label:'Shift', w:'w-15', code:'ShiftLeft' },
    ['<','>'],
    ['y','Y'],['x','X'],['c','C'],['v','V'],['b','B'],['n','N'],['m','M'],
    [',',';'],['.',':'],['-','_'],
    { label:'Shift', w:'w-275', code:'ShiftRight' },
  ],
  [
    { label:'Ctrl', w:'w-15', code:'ControlLeft' },
    { label:'⌥',   w:'w-15', code:'AltLeft' },
    { label:'⌘',   w:'w-15', code:'MetaLeft' },
    { label:'',    w:'w-6',  code:'Space' },
    { label:'AltGr', w:'w-15', code:'AltRight' },
    { label:'⌘',   w:'w-15', code:'MetaRight' },
    { label:'Ctrl', w:'w-15', code:'ControlRight' },
  ],
];

// ─── Dvorak (ergonomic alt — English) ────────────────────────
const DVORAK: KeyDef[][] = [
  [
    ['`','~'],['1','!'],['2','@'],['3','#'],['4','$'],['5','%'],
    ['6','^'],['7','&'],['8','*'],['9','('],['0',')'],['[','{'],[']','}'],
    { label:'⌫', w:'w-175', code:'Backspace' },
  ],
  [
    { label:'Tab', w:'w-15', code:'Tab' },
    ["'",'"'],[',','<'],['.','>'],['p','P'],['y','Y'],['f','F'],['g','G'],['c','C'],['r','R'],['l','L'],
    ['/','?'],['=','+'],['\\','|'],
  ],
  [
    { label:'Caps', w:'w-175', code:'CapsLock' },
    ['a','A'],['o','O'],['e','E'],['u','U'],['i','I'],['d','D'],['h','H'],['t','T'],['n','N'],
    ['s','S'],['-','_'],
    { label:'Enter', w:'w-225', code:'Enter' },
  ],
  [
    { label:'Shift', w:'w-225', code:'ShiftLeft' },
    [';',':'],['q','Q'],['j','J'],['k','K'],['x','X'],['b','B'],['m','M'],
    ['w','W'],['v','V'],['z','Z'],
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

// ─── Colemak (ergonomic alt — keeps QWERTY ZXCV) ─────────────
const COLEMAK: KeyDef[][] = [
  [
    ['`','~'],['1','!'],['2','@'],['3','#'],['4','$'],['5','%'],
    ['6','^'],['7','&'],['8','*'],['9','('],['0',')'],['-','_'],['=','+'],
    { label:'⌫', w:'w-175', code:'Backspace' },
  ],
  [
    { label:'Tab', w:'w-15', code:'Tab' },
    ['q','Q'],['w','W'],['f','F'],['p','P'],['g','G'],['j','J'],['l','L'],['u','U'],['y','Y'],[';',':'],
    ['[','{'],[']','}'],['\\','|'],
  ],
  [
    { label:'Caps', w:'w-175', code:'CapsLock' },
    ['a','A'],['r','R'],['s','S'],['t','T'],['d','D'],['h','H'],['n','N'],['e','E'],['i','I'],
    ['o','O'],["'",'"'],
    { label:'Enter', w:'w-225', code:'Enter' },
  ],
  [
    { label:'Shift', w:'w-225', code:'ShiftLeft' },
    ['z','Z'],['x','X'],['c','C'],['v','V'],['b','B'],['k','K'],['m','M'],
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

export const KB_LAYOUTS: Record<KbLayoutId, KbLayoutMeta> = {
  qwerty:  { id: 'qwerty',  name: 'QWERTY',  description: 'Standard US/UK/international', rows: QWERTY },
  azerty:  { id: 'azerty',  name: 'AZERTY',  description: 'France · Belgium',             rows: AZERTY },
  qwertz:  { id: 'qwertz',  name: 'QWERTZ',  description: 'Germany · Austria · Switzerland', rows: QWERTZ },
  dvorak:  { id: 'dvorak',  name: 'Dvorak',  description: 'Ergonomic alt for English',    rows: DVORAK },
  colemak: { id: 'colemak', name: 'Colemak', description: 'Modern alt, keeps Z X C V',    rows: COLEMAK },
};

export const KB_LAYOUT_LIST: KbLayoutMeta[] = [
  KB_LAYOUTS.qwerty, KB_LAYOUTS.azerty, KB_LAYOUTS.qwertz,
  KB_LAYOUTS.dvorak, KB_LAYOUTS.colemak,
];
