/* data.js — Words, mode definitions, sequential lessons curriculum, QWERTY layouts. */

const WORD_BANK = {
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

const CHALLENGES = [
  { id: 'daily-challenge', label: 'Daily Challenge', desc: "Today's seeded run · resets at midnight", src: 'daily' },
  { id: 'speed-run', label: 'Speed Run Endurance', desc: 'Real English paragraphs testing muscle stamina.', src: 'paragraph', sentences: true },
  { id: 'expert-sentences', label: 'Punctuation Expert', desc: 'Complex sentences with quotes, brackets, and syntax.', src: 'expert', sentences: true },
  { id: 'code-sprint', label: 'Code Syntax Sprint', desc: 'Real syntactical coding layouts in JS/Python.', src: 'code', sentences: true }
];

// The full 32-chapter curriculum — kept in sync with app/src/lib/lessons.ts.
// Each lesson optionally carries `guide` (multi-paragraph) and `tip` (callout)
// rendered by the TutorialCard before the typing screen appears.
const LESSONS = [
  // ─── TRACK 1 · FOUNDATIONS ──────────────────────────────
  { id: 'lesson-1', title: 'Chapter 1: The F and J Keys', subtitle: 'Focus: Index fingers',
    instructions: 'Place your left index finger on F and right index finger on J. Feel the bumps!',
    guide: [
      'Welcome. This is the most important chapter of the entire curriculum — everything else builds on this foundation.',
      'Look at the F and J keys on your keyboard. Notice the tiny raised bumps on each one. Those bumps exist for one reason: so your fingers can find the home row without looking. Place your LEFT INDEX FINGER on F and your RIGHT INDEX FINGER on J. Let your other fingers rest naturally on the keys beside them.',
      'For this chapter, you only need two fingers. Keep your eyes on the screen, not your hands. If you make mistakes — and you will — that is fine. Speed comes later. Accuracy now.',
    ],
    tip: 'If you feel the urge to look at your hands, resist it. The whole point is to build a map in your fingers, not your eyes.',
    keys: 'fj',
    pool: ['ffff', 'jjjj', 'fjfj', 'jfjf', 'ffjj', 'jjff', 'fjjf', 'jffj'] },

  { id: 'lesson-2', title: 'Chapter 2: Adding Space', subtitle: 'Focus: Thumbs',
    instructions: 'Use your thumb to press the space bar between sequences.',
    guide: [
      'Both thumbs sit naturally on the space bar. Most touch-typists use whichever thumb is more comfortable — there is no "correct" thumb for space.',
      'Pick one thumb (most right-handed people pick the right) and commit to it. The space bar is the most-pressed key on any keyboard. Hitting it consistently with the same thumb makes you faster.',
      'Continue keeping your eyes on the screen. The rhythm you want is: tap, tap, tap, SPACE, tap, tap, tap, SPACE.',
    ],
    tip: 'Space is your reset key. Every space is a fresh start — a tiny moment to settle your fingers back on F and J.',
    keys: 'fj ',
    pool: ['f j', 'f f j j', 'fj jf', 'fjf jfj', 'ff jj', 'j f j f', 'jj ff'] },

  { id: 'lesson-3', title: 'Chapter 3: D and K Keys', subtitle: 'Focus: Middle fingers',
    instructions: 'Use your left middle finger for D and right middle finger for K.',
    guide: [
      'Now we add the MIDDLE fingers. D belongs to the left middle, K belongs to the right middle.',
      'Keep your index fingers anchored on F and J. The middle fingers should reach naturally to D and K without your hand moving. If your hand drifts, reset.',
      'This chapter is about controlled isolation: only the middle fingers move. Index fingers stay put.',
    ],
    keys: 'dfjk ',
    pool: ['dd kk', 'df jk', 'kd fd', 'dkf jdk', 'k d f j', 'dfd kjk', 'fkdj'] },

  { id: 'lesson-4', title: 'Chapter 4: S and L Keys', subtitle: 'Focus: Ring fingers',
    instructions: 'Use your left ring finger for S and right ring finger for L.',
    guide: [
      'Ring fingers are the weakest fingers on most people\'s hands. Be patient with them.',
      'S goes to the left ring finger. L goes to the right ring finger. They should reach without the rest of your hand moving — the index and middle fingers stay anchored.',
      'You may notice the ring finger wants to pull other fingers along with it. That is normal. With practice the fingers learn to operate independently.',
    ],
    tip: 'Slow down on this chapter. Ring-finger accuracy is the difference between 60 WPM and 100 WPM later.',
    keys: 'sdflkj ',
    pool: ['ss ll', 'sl ls', 'sf jl', 'fs lj', 'ssl ddk', 'lks fsd', 'flks jls'] },

  { id: 'lesson-5', title: 'Chapter 5: A and ; Keys', subtitle: 'Focus: Pinky fingers',
    instructions: 'Use your left pinky for A and right pinky for Semicolon (;).',
    guide: [
      'The pinkies! The smallest, weakest, most independent of the fingers. They also do the most work in real-world typing — every Shift, Enter, Tab, and Backspace runs through a pinky.',
      'Left pinky on A. Right pinky on the semicolon (;). Your hand should now span the full home row: A S D F · J K L ;',
      'Take this chapter slow. Pinky-key accuracy is what separates intermediate typists from professionals.',
    ],
    tip: 'Curl your pinkies slightly. A flat pinky tends to slap multiple keys. A curled pinky lands clean.',
    keys: 'asdfjkl; ',
    pool: ['aa ;;', 'a; ;a', 'asdf jkl;', 'af j;', 'fa ;j', 'adsl', 'ask dad'] },

  { id: 'lesson-6', title: 'Chapter 6: Home Row Words', subtitle: 'Focus: Muscle memory',
    instructions: 'Now let us combine all the home row keys into real words!',
    guide: [
      'You now control the entire home row. Time to type actual English words.',
      'Notice how the home row alone makes a surprising number of useful words: ASK, DAD, SAD, LAD, ADD, SALAD, FALL, FLASK, GLASS.',
      'For this chapter, every key your fingers need is already under your fingers. There is no excuse to look at the keyboard. Trust the bumps on F and J. They will guide you home every time.',
    ],
    keys: 'asdfjkl; ',
    pool: ['ask', 'dad', 'sad', 'lad', 'add', 'salad', 'lash', 'asks', 'glass', 'fall', 'halls', 'flask', 'lass', 'sass', 'flags'] },

  { id: 'lesson-7', title: 'Chapter 7: G and H Keys', subtitle: 'Focus: Index extensions',
    instructions: 'Stretch your left index to G and right index to H. Return to F and J immediately.',
    guide: [
      'Your index fingers are the most flexible — they cover an EXTRA column each. The left index reaches IN to G, the right index reaches IN to H.',
      'The critical word here is "return". After tapping G, the left index snaps back to F. After tapping H, the right index snaps back to J. Never let your hand drift.',
      'This snap-back motion is what keeps your typing fast. Anchored hands type fast. Drifting hands type slow.',
    ],
    tip: 'Whisper "F-J-F-J" between drills. It re-anchors your hands without you having to look.',
    keys: 'fghj ',
    pool: ['fgf jhj', 'fg jh', 'gf hj', 'fgh jhg', 'gfh hjg', 'fjg jfh', 'gh hg', 'ghj fjh'] },

  { id: 'lesson-8', title: 'Chapter 8: Home Row Sentences', subtitle: 'Focus: End of Foundations',
    instructions: 'Mix everything you learned into smooth home-row sentences.',
    guide: [
      'Congratulations — you now own the home row. This chapter is a victory lap.',
      'Type these mini-sentences smoothly, without stopping between words. The goal is RHYTHM. A steady metronome of keystrokes is more valuable than sporadic speed.',
      'After this chapter, the next eight lessons add the top row — R, U, E, I, T, Y, W, O, Q, P. The home row will still be your base of operations. Always return.',
    ],
    keys: 'asdfghjkl; ',
    pool: ['ask dad', 'a sad lad', 'flash a flag', 'glass jar', 'half a salad', 'all hands', 'as a flash', 'all fall'] },

  // ─── TRACK 2 · TOP ROW ──────────────────────────────────
  { id: 'lesson-9', title: 'Chapter 9: R and U Keys', subtitle: 'Focus: Upward index extensions',
    instructions: 'Reach up with your left index to R, and right index to U.',
    guide: [
      'The top row starts here. R sits directly above F — left index moves UP and slightly forward. U sits directly above J — right index moves UP and slightly forward.',
      'Notice the geometry: every top-row letter is reached from the home-row finger immediately below it. You already know which finger to use; you just have to teach it to reach.',
      'Snap back to F and J after every top-row tap. The home row is your anchor.',
    ],
    keys: 'frju ',
    pool: ['rr uu', 'ru ur', 'fr ju', 'rf uj', 'fur rug', 'ruf fur', 'jury', 'true'] },

  { id: 'lesson-10', title: 'Chapter 10: E and I Keys', subtitle: 'Focus: Upward middle extensions',
    instructions: 'Reach up with your left middle to E, and right middle to I.',
    guide: [
      'E sits above D — use your left middle finger. I sits above K — use your right middle finger.',
      'E and I are the two most common vowels in English. Mastering these alone will speed up almost everything you type.',
      'You now know enough of the alphabet to type real words: DRIVE, FRIED, IDEA, FIRE. Try them.',
    ],
    tip: 'When E and I appear back-to-back (FIELD, RELIEVE), it tests your hand independence. Slow down for accuracy.',
    keys: 'dekie ',
    pool: ['ee ii', 'ei ie', 'de ki', 'ed ik', 'die ire', 'kid red', 'fire', 'edit', 'idle', 'idea'] },

  { id: 'lesson-11', title: 'Chapter 11: T and Y Keys', subtitle: 'Focus: Stretched index reaches',
    instructions: 'Left index reaches diagonally up-left to T. Right index reaches up-right to Y.',
    guide: [
      'T and Y are the trickiest letters on the top row. The index fingers have to stretch FARTHER — T is up and toward the center, Y is up and toward the center too.',
      'Your hand may want to lift. Resist. Keep the other fingers anchored. Only the index stretches.',
      'T is the second most common letter in English (after E). This chapter pays off immediately.',
    ],
    keys: 'fghjty ',
    pool: ['tt yy', 'ty yt', 'try thy', 'rut yet', 'they that', 'truth', 'tray', 'fifty'] },

  { id: 'lesson-12', title: 'Chapter 12: W and O Keys', subtitle: 'Focus: Ring fingers reach up',
    instructions: 'Left ring finger up to W. Right ring finger up to O.',
    guide: [
      'W sits above S (left ring). O sits above L (right ring). Ring fingers, again — patience.',
      'Common words now within reach: WORD, WORK, ROW, LOW, FLOW, WORLD, GOOD. Notice how vowel-rich English really is.',
      'If your ring finger drags the pinky along with it, that is a hand-independence issue. Slow down and isolate.',
    ],
    keys: 'swlo ',
    pool: ['ww oo', 'wo ow', 'so lo', 'word work', 'who low', 'flow', 'world'] },

  { id: 'lesson-13', title: 'Chapter 13: Q and P Keys', subtitle: 'Focus: Pinky reaches up',
    instructions: 'Left pinky up to Q. Right pinky up to P.',
    guide: [
      'The top corners — Q and P — are reached by the pinkies. These are the longest reaches on the entire keyboard.',
      'Most English words don\'t have a Q. When one shows up (QUICK, QUIET), the U almost always follows — your right index handles that smoothly.',
      'P is far more common (PLAY, POP, PEOPLE). Train the right pinky to reach without the hand lifting.',
    ],
    keys: 'aq;p ',
    pool: ['qq pp', 'aq p;', 'pop', 'quip', 'quiet pop', 'paper', 'apple', 'quart'] },

  { id: 'lesson-14', title: 'Chapter 14: Top Row Sentences', subtitle: 'End of top-row track',
    instructions: 'Real English sentences using only the keys you know.',
    guide: [
      'You now control the top row AND the home row. That covers 26 alphabet keys − 7 bottom-row keys = enough to type the majority of English text.',
      'Time for real sentences with rhythm. Don\'t stop mid-word. Don\'t look down. Trust your fingers.',
      'After this chapter we drop to the bottom row: V, N, C, M, X, comma, Z, period, B, slash.',
    ],
    keys: 'qwertyuiopasdfghjkl; ',
    pool: ['the quiet typist', 'a sequel awaits', 'play out the request', 'wire up your fingers', 'happy work is true', 'sleep is for the weak'] },

  // ─── TRACK 3 · BOTTOM ROW ───────────────────────────────
  { id: 'lesson-15', title: 'Chapter 15: V and N Keys', subtitle: 'Focus: Bottom index extensions',
    instructions: 'Left index DOWN to V. Right index DOWN to N.',
    guide: [
      'Bottom row begins. The index fingers now reach DOWN as well as up.',
      'V is below F — left index curls down and slightly inward. N is below J — right index does the same on the right.',
      'The downward motion uses different muscles than the upward motion. Take your time.',
    ],
    keys: 'fvjn ',
    pool: ['vv nn', 'vn nv', 'fv jn', 'van van', 'inn even', 'vine nine'] },

  { id: 'lesson-16', title: 'Chapter 16: C and M Keys', subtitle: 'Focus: Bottom middle extensions',
    instructions: 'Left middle DOWN to C. Right middle DOWN to M.',
    guide: [
      'C is below D (left middle). M is below K (right middle).',
      'Both letters are common in English (CAT, CASE, MAY, MAKE). Quick muscle memory pays off here.',
      'Watch for finger drift on M — it likes to recruit the index. Keep the index anchored on J.',
    ],
    keys: 'dcmk ',
    pool: ['cc mm', 'cm mc', 'dc mk', 'cam mac', 'come make', 'much'] },

  { id: 'lesson-17', title: 'Chapter 17: X and , Keys', subtitle: 'Focus: Bottom ring extensions',
    instructions: 'Left ring DOWN to X. Right ring DOWN to comma (,).',
    guide: [
      'X is below S (left ring). Comma is below L (right ring).',
      'Comma is one of the most-used keys in real writing. Treating it as a "letter" pays off — punctuation slows down most beginners far more than uncommon letters do.',
    ],
    keys: 'sx,l ',
    pool: ['xx ,,', 'six fix', 'mix, fox', 'lax, sax', 'next, vex'] },

  { id: 'lesson-18', title: 'Chapter 18: Z and . Keys', subtitle: 'Focus: Bottom pinky extensions',
    instructions: 'Left pinky DOWN to Z. Right pinky DOWN to period (.)',
    guide: [
      'Z is below A (left pinky). Period is below ; (right pinky).',
      'Z barely appears in English. Period appears constantly. Spend more time on the period.',
      'After this chapter, B and / round out the bottom row.',
    ],
    keys: 'az;. ',
    pool: ['zz ..', 'zap. lazy.', 'a zoo. a zip.', 'jazz. fuzz.', 'maze. doze.'] },

  { id: 'lesson-19', title: 'Chapter 19: B and / Keys', subtitle: 'Focus: Center-bottom reaches',
    instructions: 'Left index DOWN-IN to B. Right pinky DOWN to / (and ?).',
    guide: [
      'B is the awkward letter. It sits below the gap between G and H — and convention says the LEFT INDEX handles it. So your left index has to stretch down and inward.',
      'The slash key (/) sits to the right of period — right pinky territory. Shift+/ gives you ?.',
      'After this chapter you have typed every letter of the alphabet. The whole keyboard is yours.',
    ],
    keys: 'fb;/ ',
    pool: ['bb //', 'b/ /b', 'big bag', 'be bold', 'b/c', 'a/b/c', 'why/how'] },

  { id: 'lesson-20', title: 'Chapter 20: Full Alphabet Sentences', subtitle: 'End of bottom-row track',
    instructions: 'Pangrams — sentences using every letter of the alphabet.',
    guide: [
      'You have now drilled every letter of the alphabet. Time to prove it with pangrams — short sentences that contain every letter at least once.',
      'These are classic typing-practice sentences. Type them smoothly and you have mastered the keyboard\'s alphabetic core.',
      'Next track: Shift + capitals.',
    ],
    keys: 'abcdefghijklmnopqrstuvwxyz, .',
    pool: [
      'the quick brown fox jumps over the lazy dog.',
      'pack my box with five dozen liquor jugs.',
      'how vexingly quick daft zebras jump.',
      'sphinx of black quartz, judge my vow.',
      'amazingly few discotheques provide jukeboxes.',
      'the five boxing wizards jump quickly.',
    ] },

  // ─── TRACK 4 · CAPITALS & SHIFT ─────────────────────────
  { id: 'lesson-21', title: 'Chapter 21: Left Shift', subtitle: 'Focus: Right-hand letters with Shift',
    instructions: 'Use the LEFT Shift key (held by left pinky) for right-hand capitals.',
    guide: [
      'Shift comes in pairs — left Shift and right Shift. The rule is simple: use the OPPOSITE shift from the letter you are capitalizing.',
      'For RIGHT-hand letters (Y, U, I, O, P, H, J, K, L, N, M), press LEFT Shift with your left pinky and type the letter with the right hand.',
      'The shift goes DOWN with the pinky and STAYS DOWN until the capital letter is typed. Release together.',
    ],
    tip: 'Left pinky holds Shift while left hand stays anchored on A. The right hand types the letter. Two hands, two roles.',
    keys: 'asdfghjkl;',
    pool: ['Hi', 'Hello', 'Yes', 'No', 'Pass', 'Jump', 'Look', 'Hill', 'Pop', 'Up'] },

  { id: 'lesson-22', title: 'Chapter 22: Right Shift', subtitle: 'Focus: Left-hand letters with Shift',
    instructions: 'Use the RIGHT Shift key (held by right pinky) for left-hand capitals.',
    guide: [
      'For LEFT-hand letters (Q, W, E, R, T, A, S, D, F, G, Z, X, C, V, B), press RIGHT Shift with your right pinky.',
      'Same mechanics — shift down, letter typed, shift released.',
      'It feels awkward at first. The investment pays off massively. Shift-on-the-wrong-side typists max out around 50 WPM. Shift-on-the-correct-side typists pass 100 WPM easily.',
    ],
    keys: 'asdfghjkl;',
    pool: ['Cat', 'Dog', 'Red', 'Big', 'Bag', 'Far', 'Fast', 'Quiet', 'Easy', 'Adventure', 'Vast'] },

  { id: 'lesson-23', title: 'Chapter 23: Proper Nouns & Names', subtitle: 'Focus: Capital + lowercase mix',
    instructions: 'Real names, real cities, real proper nouns.',
    guide: [
      'Now the shift dance gets real. Every name, every place, every brand starts with a capital and continues lowercase.',
      'The pattern: shift down, capital letter, shift up, lowercase letters. Smoothly.',
      'These prompts are intentionally short — focus on the shift-letter-release rhythm.',
    ],
    keys: 'qwertyuiopasdfghjkl;zxcvbnm, .',
    pool: [
      'New York is loud.',
      'Mary read a Tolstoy novel.',
      'The Pacific is vast.',
      'Albert Einstein lived in Princeton.',
      'Mount Everest stands above Nepal.',
      'Jane visited London and Paris.',
    ] },

  // ─── TRACK 5 · NUMBERS & SYMBOLS ────────────────────────
  { id: 'lesson-24', title: 'Chapter 24: Number Row Center (4 5 6 7)', subtitle: 'Focus: Index fingers reach for digits',
    instructions: 'Both index fingers stretch UP TWO ROWS for the center digits.',
    guide: [
      'The number row is two rows above home. Your fingers need to actually TRAVEL there, then snap back.',
      'Left index handles 4 and 5. Right index handles 6 and 7. Notice each index covers TWO digits (its natural column + one inward).',
      'Going to the number row and looking is fine for the first few attempts. Force yourself to do it by feel by the end of the chapter.',
    ],
    tip: 'Many keyboards have a "5" that\'s the visual midpoint. Train your fingers to feel where 5/6 split.',
    keys: '45 67 fjghr u',
    pool: ['45 67', '4 5 6 7', '44 55', '66 77', '475 564', '47 56', '4567', '745 654'] },

  { id: 'lesson-25', title: 'Chapter 25: Number Row Edges (1 2 3 8 9 0)', subtitle: 'Focus: Outer fingers for outer digits',
    instructions: 'Left hand handles 1-3, right hand handles 8-0.',
    guide: [
      'The outer digits each get their own finger: 1=pinky, 2=ring, 3=middle (left hand). 8=middle, 9=ring, 0=pinky (right hand).',
      'These are LONG reaches, especially for the pinkies. Curl the pinky and go.',
      'Combined with chapter 24, you now own the entire number row.',
    ],
    keys: '1234567890 ',
    pool: ['12 34', '78 90', '123 890', '1 2 3', '8 9 0', '147 369', '2025 2026', '100 200 300'] },

  { id: 'lesson-26', title: 'Chapter 26: Common Punctuation', subtitle: "Focus: . , ; ' \" : ?",
    instructions: 'The punctuation that appears in real writing every day.',
    guide: [
      'Real writing is 80% letters, 20% punctuation. Most beginners learn the letters and ignore the punctuation. That cap their speed forever.',
      'Period and comma you already know (chapters 17-18). Add: semicolon (right pinky, home row), apostrophe (right pinky, one right of semicolon), quote (Shift+apostrophe), colon (Shift+semicolon).',
      'Question mark is Shift + /. We did / in chapter 19.',
    ],
    keys: "asdfjkl;', .?",
    pool: [
      "it's a test.",
      'she said, "hi."',
      'wait; then go.',
      'is it ok?',
      "don't stop.",
      'one: two; three.',
    ] },

  { id: 'lesson-27', title: 'Chapter 27: Brackets and Math', subtitle: 'Focus: ( ) [ ] { } + - = /',
    instructions: 'Symbols every programmer and most writers need.',
    guide: [
      'These are the symbols that don\'t appear in regular prose but appear constantly in code, math, lists, and structured writing.',
      'Parentheses: Shift+9 = ( and Shift+0 = ). Brackets: [ and ] are unshifted, right pinky. Braces: Shift+[ = { and Shift+] = }.',
      'Plus, minus, equals, slash are all single-finger reaches in the top-right and bottom-right.',
    ],
    keys: '[]()+-=/ ',
    pool: ['(a)', '[1]', '{x}', '1 + 2 = 3', '(a + b)', '5 - 2', '10 / 2', 'a[0]', '{key: val}'] },

  // ─── TRACK 6 · SPEED & REAL-WORLD ───────────────────────
  { id: 'lesson-28', title: 'Chapter 28: Common Bigrams', subtitle: 'Focus: Letter pairs that show up everywhere',
    instructions: 'TH, HE, IN, ER, AN, RE, ON, AT, EN, ND — the most common two-letter sequences in English.',
    guide: [
      'Real speed comes from CHUNKING. Fast typists don\'t type one letter at a time — they type in pairs, syllables, even whole short words.',
      'These ten bigrams account for roughly 25% of all letter pairs in English text. Drill them until your fingers fire them as a single motion.',
      'Don\'t think "T then H". Think "TH". One unit.',
    ],
    tip: 'When TH fires as a single muscle memory, your WPM jumps overnight.',
    keys: 'abcdefghijklmnopqrstuvwxyz ',
    pool: ['th th th', 'he he he', 'in in', 'er er', 'an an', 're re', 'on on', 'at at', 'en en', 'nd nd', 'th he in er', 'an re on at'] },

  { id: 'lesson-29', title: 'Chapter 29: Common Trigrams', subtitle: 'Focus: Three-letter chunks',
    instructions: 'THE, AND, ING, ION, TIO, ENT, ATI, FOR, HER, TER — three-letter combos that are everywhere.',
    guide: [
      'After bigrams come trigrams. THE alone is roughly 6% of all words in English. ING ends millions of verbs.',
      'Each trigram should feel like a single keystroke once mastered.',
    ],
    keys: 'abcdefghijklmnopqrstuvwxyz ',
    pool: ['the the the', 'and and and', 'ing ing', 'ion ion', 'tio tio', 'ent ent', 'ati ati', 'for for', 'her her', 'ter ter', 'the and ing', 'for her'] },

  { id: 'lesson-30', title: 'Chapter 30: 100 Most Common Words', subtitle: 'Focus: Word fluency',
    instructions: 'The 100 most-used words in English. Master these and you can type 50%+ of any text.',
    guide: [
      'Linguists have shown that just 100 words account for about half of all words in spoken and written English.',
      'When THE, OF, AND, A, TO, IN, IS, YOU, THAT, IT — and 90 similar words — fire as automatic muscle patterns, your real-world WPM doubles.',
      'These prompts mix and match the top 100. Type them smoothly and don\'t stop between words.',
    ],
    keys: 'abcdefghijklmnopqrstuvwxyz ',
    pool: [
      'the of and to a in is you that it',
      'he was for on are with as i his they',
      'be at one have this from or by hot',
      'word but what some we can out other',
      'were all there when up use your how said',
      'an each she which do their time if will way',
    ] },

  { id: 'lesson-31', title: 'Chapter 31: Sentence Rhythm', subtitle: 'Focus: Punctuation cues',
    instructions: 'Smooth sentences with all the punctuation that real writing uses.',
    guide: [
      'Real prose has commas, periods, semicolons, quotation marks, and apostrophes scattered throughout. The shift-and-symbol dance becomes part of your rhythm.',
      'Don\'t slow down for punctuation. Type it AS you type the words around it. The comma after a word is part of that word\'s rhythm, not a separate event.',
    ],
    tip: 'A great test: can you type a comma without your eyes flicking to your hands? If yes, you\'ve nailed it.',
    keys: "abcdefghijklmnopqrstuvwxyz ,.;':\"?-",
    pool: [
      "It's a long road, but it's worth it.",
      'She said, "Slow down; speed comes later."',
      "What's the point if you can't enjoy it?",
      'Three things matter: focus, rhythm, and patience.',
      "He typed quickly, smoothly, without pausing — like a pianist.",
      'The keyboard is a tool; the brain is the instrument.',
    ] },

  { id: 'lesson-32', title: 'Chapter 32: Code Typing Micro-Drill', subtitle: 'Focus: Real syntactical code',
    instructions: 'JavaScript and Python snippets — brackets, semicolons, operators all in motion.',
    guide: [
      'The final chapter. Code looks intimidating but is mostly the same characters as English, just arranged differently.',
      'Programmers who can\'t touch-type lose hours every day. The investment in this chapter pays off forever — every line of code you write for the rest of your career runs through these muscles.',
      'After this, the curriculum is done. Keep practicing daily — even 10 minutes a day will keep your speed climbing.',
    ],
    tip: 'There is no finish line. The best typists in the world still practice. Welcome to the club.',
    keys: "abcdefghijklmnopqrstuvwxyz0123456789 ()[]{}+-=/<>;:'\".,",
    pool: [
      "const x = 1;",
      "if (a > b) return a;",
      "for (let i = 0; i < 10; i++) {}",
      "function add(a, b) { return a + b; }",
      "def hello(name): print(name)",
      "items.map(x => x * 2)",
      "user?.name ?? 'guest'",
    ] },
];

/* QWERTY keyboard layout map */
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

/* Finger Assignment map for visual real-time cues */
const FINGER_MAP = {
  // Left Pinky
  'q': 'Left Pinky', 'a': 'Left Pinky', 'z': 'Left Pinky', '1': 'Left Pinky', '`': 'Left Pinky', 'Q': 'Left Pinky', 'A': 'Left Pinky', 'Z': 'Left Pinky', '~': 'Left Pinky', '!': 'Left Pinky',
  // Left Ring
  'w': 'Left Ring', 's': 'Left Ring', 'x': 'Left Ring', '2': 'Left Ring', '@': 'Left Ring', 'W': 'Left Ring', 'S': 'Left Ring', 'X': 'Left Ring',
  // Left Middle
  'e': 'Left Middle', 'd': 'Left Middle', 'c': 'Left Middle', '3': 'Left Middle', '#': 'Left Middle', 'E': 'Left Middle', 'D': 'Left Middle', 'C': 'Left Middle',
  // Left Index
  'r': 'Left Index', 'f': 'Left Index', 'v': 'Left Index', '4': 'Left Index', '$': 'Left Index', 't': 'Left Index', 'g': 'Left Index', 'b': 'Left Index', '5': 'Left Index', '%': 'Left Index',
  'R': 'Left Index', 'F': 'Left Index', 'V': 'Left Index', 'T': 'Left Index', 'G': 'Left Index', 'B': 'Left Index',
  // Right Index
  'y': 'Right Index', 'h': 'Right Index', 'n': 'Right Index', '6': 'Right Index', '^': 'Right Index', 'u': 'Right Index', 'j': 'Right Index', 'm': 'Right Index', '7': 'Right Index', '&': 'Right Index',
  'Y': 'Right Index', 'H': 'Right Index', 'N': 'Right Index', 'U': 'Right Index', 'J': 'Right Index', 'M': 'Right Index',
  // Right Middle
  'i': 'Right Middle', 'k': 'Right Middle', ',': 'Right Middle', '8': 'Right Middle', '*': 'Right Middle', '<': 'Right Middle', 'I': 'Right Middle', 'K': 'Right Middle',
  // Right Ring
  'o': 'Right Ring', 'l': 'Right Ring', '.': 'Right Ring', '9': 'Right Ring', '(': 'Right Ring', '>': 'Right Ring', 'O': 'Right Ring', 'L': 'Right Ring',
  // Right Pinky
  'p': 'Right Pinky', ';': 'Right Pinky', '/': 'Right Pinky', '0': 'Right Pinky', ')': 'Right Pinky', ':': 'Right Pinky', '?': 'Right Pinky', 'P': 'Right Pinky',
  '-': 'Right Pinky', '_': 'Right Pinky', '=': 'Right Pinky', '+': 'Right Pinky', '[': 'Right Pinky', '{': 'Right Pinky', ']': 'Right Pinky', '}': 'Right Pinky',
  '\\': 'Right Pinky', '|': 'Right Pinky', '\'': 'Right Pinky', '"': 'Right Pinky',
  // Thumbs
  ' ': 'Either Thumb', '\n': 'Right Pinky (Enter)', '\t': 'Left Pinky (Tab)', '\b': 'Right Pinky (Backspace)'
};

/* Builds prompt text from a mode. */
function buildPrompt(modeItem, length = 40) {
  if (!modeItem) return WORD_BANK.beginner.slice(0, 14).join(' ');
  
  // Sentence challenge
  if (modeItem.sentences) {
    const pool = SENTENCES[modeItem.src] || SENTENCES.paragraph;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Daily seed
  if (modeItem.src === 'daily') {
    const pool = SENTENCES.paragraph;
    const day = new Date().toISOString().slice(0, 10);
    let seed = 0; 
    for (const c of day) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
    return pool[seed % pool.length];
  }

  // Normal pool
  const pool = WORD_BANK[modeItem.src] || WORD_BANK.beginner;
  const out = [];
  for (let i = 0; i < length; i++) out.push(pool[Math.floor(Math.random() * pool.length)]);
  return out.join(' ');
}

function generateFromCustomKeys(keys, length = 40) {
  const all = [...keys];
  const SPECIALS = new Set([' ', '\t', '\n', '\b']);
  const letters = all.filter(c => !SPECIALS.has(c));
  const pool = letters.length ? letters : 'asdfghjkl'.split('');
  const out = [];
  for (let w = 0; w < length; w++) {
    const wl = 2 + Math.floor(Math.random() * 5);
    let word = '';
    for (let i = 0; i < wl; i++) word += pool[Math.floor(Math.random() * pool.length)];
    out.push(word);
  }
  return out.join(' ');
}

// Bind to window
window.WORD_BANK = WORD_BANK;
window.SENTENCES = SENTENCES;
window.CHALLENGES = CHALLENGES;
window.LESSONS = LESSONS;
window.KB_ROWS = KB_ROWS;
window.ACCENTS = ACCENTS;
window.FINGER_MAP = FINGER_MAP;
window.buildPrompt = buildPrompt;
window.generateFromCustomKeys = generateFromCustomKeys;
