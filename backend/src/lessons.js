// Small static pool; 3 lessons are served per UTC day, rotating through the pool.
const POOL = [
  { id: 1, type: "vocabulary", question: "What is the past tense of 'run'?", options: ["Ran", "Running", "Runned"], answer: "Ran" },
  { id: 2, type: "grammar", question: "Choose the correct article: ___ apple a day.", options: ["A", "An", "The"], answer: "An" },
  { id: 3, type: "translation", question: "Translate: 'Merhaba, nasılsın?'", options: ["Hello, how are you?", "Goodbye, see you", "Thank you very much"], answer: "Hello, how are you?" },
  { id: 4, type: "vocabulary", question: "Which word means 'very big'?", options: ["Tiny", "Huge", "Narrow"], answer: "Huge" },
  { id: 5, type: "grammar", question: "She ___ to school every day.", options: ["go", "goes", "going"], answer: "goes" },
  { id: 6, type: "translation", question: "Translate: 'Kitap okumayı seviyorum.'", options: ["I love reading books.", "I am writing a book.", "I bought a book."], answer: "I love reading books." },
  { id: 7, type: "vocabulary", question: "What is the opposite of 'cheap'?", options: ["Expensive", "Easy", "Free"], answer: "Expensive" },
  { id: 8, type: "grammar", question: "I have lived here ___ 2020.", options: ["for", "since", "from"], answer: "since" },
  { id: 9, type: "translation", question: "Translate: 'Yarın görüşürüz.'", options: ["See you tomorrow.", "See you yesterday.", "Nice to meet you."], answer: "See you tomorrow." },
];

const LESSONS_PER_DAY = 3;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function lessonsForDay(day = today()) {
  const dayIndex = Math.floor(Date.parse(day) / 86_400_000);
  const start = (dayIndex * LESSONS_PER_DAY) % POOL.length;
  return Array.from({ length: LESSONS_PER_DAY }, (_, i) => POOL[(start + i) % POOL.length]);
}

module.exports = { POOL, LESSONS_PER_DAY, today, lessonsForDay };
