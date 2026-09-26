// Daily lesson pool. `speak` = text the browser reads aloud (listening questions).
const POOL = [
  // vocabulary
  {
    id: 1,
    type: "vocabulary",
    question: "What is the past tense of 'run'?",
    options: ["Ran", "Running", "Runned"],
    answer: "Ran",
  },
  {
    id: 4,
    type: "vocabulary",
    question: "Which word means 'very big'?",
    options: ["Tiny", "Huge", "Narrow"],
    answer: "Huge",
  },
  {
    id: 7,
    type: "vocabulary",
    question: "What is the opposite of 'cheap'?",
    options: ["Expensive", "Easy", "Free"],
    answer: "Expensive",
  },
  {
    id: 11,
    type: "vocabulary",
    question: "Which word is a fruit?",
    options: ["Carrot", "Mango", "Onion"],
    answer: "Mango",
  },
  {
    id: 16,
    type: "vocabulary",
    question: "A person who flies a plane is a…",
    options: ["Pilot", "Sailor", "Driver"],
    answer: "Pilot",
  },
  // grammar
  {
    id: 2,
    type: "grammar",
    question: "Choose the correct article: ___ apple a day.",
    options: ["A", "An", "The"],
    answer: "An",
  },
  {
    id: 5,
    type: "grammar",
    question: "She ___ to school every day.",
    options: ["go", "goes", "going"],
    answer: "goes",
  },
  {
    id: 8,
    type: "grammar",
    question: "I have lived here ___ 2020.",
    options: ["for", "since", "from"],
    answer: "since",
  },
  {
    id: 12,
    type: "grammar",
    question: "They ___ playing football now.",
    options: ["is", "are", "am"],
    answer: "are",
  },
  {
    id: 15,
    type: "grammar",
    question: "This is ___ book I told you about.",
    options: ["a", "an", "the"],
    answer: "the",
  },
  // translation
  {
    id: 3,
    type: "translation",
    question: "Translate: 'Merhaba, nasılsın?'",
    options: ["Hello, how are you?", "Goodbye, see you", "Thank you very much"],
    answer: "Hello, how are you?",
  },
  {
    id: 6,
    type: "translation",
    question: "Translate: 'Kitap okumayı seviyorum.'",
    options: ["I love reading books.", "I am writing a book.", "I bought a book."],
    answer: "I love reading books.",
  },
  {
    id: 9,
    type: "translation",
    question: "Translate: 'Yarın görüşürüz.'",
    options: ["See you tomorrow.", "See you yesterday.", "Nice to meet you."],
    answer: "See you tomorrow.",
  },
  {
    id: 13,
    type: "translation",
    question: "Translate: 'Su içmek istiyorum.'",
    options: ["I want to drink water.", "I want to eat bread.", "I drank water."],
    answer: "I want to drink water.",
  },
  // idiom
  {
    id: 10,
    type: "idiom",
    question: "'Break a leg!' means…",
    options: ["Good luck!", "Be careful!", "Go away!"],
    answer: "Good luck!",
  },
  {
    id: 14,
    type: "idiom",
    question: "'Piece of cake' means…",
    options: ["Very easy", "Very sweet", "Very small"],
    answer: "Very easy",
  },
  {
    id: 17,
    type: "idiom",
    question: "'It's raining cats and dogs' means…",
    options: ["It's raining heavily", "Animals are outside", "It's a sunny day"],
    answer: "It's raining heavily",
  },
  {
    id: 18,
    type: "idiom",
    question: "'Hit the books' means…",
    options: ["Study hard", "Throw books", "Go to the library"],
    answer: "Study hard",
  },
  // listening (browser text-to-speech)
  {
    id: 19,
    type: "listening",
    question: "Which sentence did you hear?",
    speak: "I would like a cup of coffee, please.",
    options: [
      "I would like a cup of coffee, please.",
      "I would like a cup of tea, please.",
      "I had a cup of coffee.",
    ],
    answer: "I would like a cup of coffee, please.",
  },
  {
    id: 20,
    type: "listening",
    question: "Which word did you hear?",
    speak: "Weather",
    options: ["Weather", "Whether", "Wetter"],
    answer: "Weather",
  },
  {
    id: 21,
    type: "listening",
    question: "What time is it?",
    speak: "It's a quarter past seven.",
    options: ["7:15", "7:45", "6:45"],
    answer: "7:15",
  },
  {
    id: 22,
    type: "listening",
    question: "Where is she going?",
    speak: "She is going to the airport tonight.",
    options: ["To the airport", "To the office", "To the station"],
    answer: "To the airport",
  },
  // emoji / picture
  {
    id: 23,
    type: "emoji",
    question: "🐘  What animal is this?",
    options: ["Elephant", "Giraffe", "Rhino"],
    answer: "Elephant",
  },
  {
    id: 24,
    type: "emoji",
    question: "☔  What do you use this for?",
    options: ["Staying dry in the rain", "Cooking", "Writing"],
    answer: "Staying dry in the rain",
  },
  {
    id: 25,
    type: "emoji",
    question: "🥐  What is this?",
    options: ["Croissant", "Bagel", "Pancake"],
    answer: "Croissant",
  },
  {
    id: 26,
    type: "emoji",
    question: "🚲  What is this?",
    options: ["Bicycle", "Motorbike", "Scooter"],
    answer: "Bicycle",
  },
  // synonym
  {
    id: 27,
    type: "synonym",
    question: "Pick a synonym of 'happy'.",
    options: ["Glad", "Angry", "Tired"],
    answer: "Glad",
  },
  {
    id: 28,
    type: "synonym",
    question: "Pick a synonym of 'begin'.",
    options: ["Start", "Finish", "Wait"],
    answer: "Start",
  },
  {
    id: 29,
    type: "synonym",
    question: "Pick a synonym of 'quick'.",
    options: ["Fast", "Slow", "Late"],
    answer: "Fast",
  },
  // spelling
  {
    id: 30,
    type: "spelling",
    question: "Which spelling is correct?",
    options: ["Necessary", "Neccessary", "Necesary"],
    answer: "Necessary",
  },
  {
    id: 31,
    type: "spelling",
    question: "Which spelling is correct?",
    options: ["Beautiful", "Beatiful", "Beautifull"],
    answer: "Beautiful",
  },
  {
    id: 32,
    type: "spelling",
    question: "Which spelling is correct?",
    options: ["Tomorrow", "Tommorow", "Tomorow"],
    answer: "Tomorrow",
  },
  // preposition
  {
    id: 33,
    type: "preposition",
    question: "The cat is sleeping ___ the sofa.",
    options: ["on", "at", "of"],
    answer: "on",
  },
  {
    id: 34,
    type: "preposition",
    question: "I was born ___ May.",
    options: ["in", "on", "at"],
    answer: "in",
  },
  {
    id: 35,
    type: "preposition",
    question: "See you ___ Monday!",
    options: ["on", "in", "at"],
    answer: "on",
  },
  // phrasal verbs
  {
    id: 36,
    type: "phrasal",
    question: "'Give up' means…",
    options: ["Stop trying", "Give a gift", "Stand up"],
    answer: "Stop trying",
  },
  {
    id: 37,
    type: "phrasal",
    question: "'Look after' means…",
    options: ["Take care of", "Look behind", "Search for"],
    answer: "Take care of",
  },
  {
    id: 38,
    type: "phrasal",
    question: "Please ___ the lights when you leave.",
    options: ["turn off", "turn up", "turn in"],
    answer: "turn off",
  },
];

const LESSONS_PER_DAY = 3;

function today() {
  return new Date().toISOString().slice(0, 10);
}

// Small deterministic PRNG so every user gets the same lessons on a given day.
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** Picks LESSONS_PER_DAY lessons of different types for the given UTC day. */
function lessonsForDay(day = today()) {
  const rand = seeded(Math.floor(Date.parse(day) / 86_400_000));
  const shuffled = [...POOL].sort(() => rand() - 0.5);
  const picked = [];
  const types = new Set();
  for (const l of shuffled) {
    if (types.has(l.type)) continue;
    picked.push({ ...l, options: [...l.options].sort(() => rand() - 0.5) });
    types.add(l.type);
    if (picked.length === LESSONS_PER_DAY) break;
  }
  return picked;
}

module.exports = { POOL, LESSONS_PER_DAY, today, lessonsForDay, seeded };
