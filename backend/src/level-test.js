// Paid certification exam. Answers never leave the server; grading is server-side.
// Pool: 4 questions per CEFR level; each attempt serves 2 random questions per level.
const QUESTIONS = [
  { id: 101, level: 1, question: "I ___ a student.", options: ["am", "is", "are"], answer: "am" },
  { id: 102, level: 1, question: "Which one is a color?", options: ["Blue", "Table", "Run"], answer: "Blue" },
  { id: 111, level: 1, question: "How ___ you?", options: ["are", "is", "am"], answer: "are" },
  { id: 112, level: 1, question: "My brother ___ two cats.", options: ["has", "have", "having"], answer: "has" },
  { id: 103, level: 2, question: "Yesterday I ___ to the cinema.", options: ["go", "went", "gone"], answer: "went" },
  { id: 104, level: 2, question: "There aren't ___ apples left.", options: ["some", "any", "much"], answer: "any" },
  { id: 113, level: 2, question: "This bag is ___ than that one.", options: ["heavier", "heaviest", "more heavy"], answer: "heavier" },
  { id: 114, level: 2, question: "We ___ TV when the phone rang.", options: ["were watching", "watched", "are watching"], answer: "were watching" },
  { id: 105, level: 3, question: "If it rains, we ___ at home.", options: ["stay", "will stay", "stayed"], answer: "will stay" },
  { id: 106, level: 3, question: "She has been working here ___ five years.", options: ["since", "for", "during"], answer: "for" },
  { id: 115, level: 3, question: "The film ___ by millions of people.", options: ["was seen", "saw", "has seeing"], answer: "was seen" },
  { id: 116, level: 3, question: "You ___ smoke here. It's forbidden.", options: ["mustn't", "don't have to", "needn't"], answer: "mustn't" },
  { id: 107, level: 4, question: "The report ___ by the time the manager arrived.", options: ["was finishing", "had been finished", "has finished"], answer: "had been finished" },
  { id: 108, level: 4, question: "Choose the closest meaning of 'reluctant'.", options: ["Unwilling", "Excited", "Careless"], answer: "Unwilling" },
  { id: 117, level: 4, question: "If I ___ you, I would accept the offer.", options: ["were", "am", "would be"], answer: "were" },
  { id: 118, level: 4, question: "He denied ___ the window.", options: ["breaking", "to break", "break"], answer: "breaking" },
  { id: 109, level: 5, question: "Hardly ___ the station when the train left.", options: ["I had reached", "had I reached", "I reached"], answer: "had I reached" },
  { id: 110, level: 5, question: "His argument was so ___ that nobody could refute it.", options: ["cogent", "vague", "trivial"], answer: "cogent" },
  { id: 119, level: 5, question: "Not until the end ___ the truth.", options: ["did she reveal", "she revealed", "she did reveal"], answer: "did she reveal" },
  { id: 120, level: 5, question: "Choose the closest meaning of 'ubiquitous'.", options: ["Found everywhere", "Very rare", "Extremely old"], answer: "Found everywhere" },
];

const LEVEL_NAMES = ["", "A1", "A2", "B1", "B2", "C1"];
const PER_LEVEL = 2;
const byId = new Map(QUESTIONS.map((q) => [q.id, q]));

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Picks PER_LEVEL random questions per level (ordered A1 → C1) with shuffled options. */
function drawExam() {
  const picked = [];
  for (let level = 1; level <= 5; level++) {
    picked.push(...shuffle(QUESTIONS.filter((q) => q.level === level)).slice(0, PER_LEVEL));
  }
  return picked.map(({ answer, ...q }) => ({ ...q, options: shuffle(q.options) }));
}

/** @param ids question ids that were served; @param answers {[questionId]: chosenOption} */
function grade(ids, answers = {}) {
  const results = ids.map((id) => ({ id, correct: answers[id] === byId.get(id)?.answer }));
  const correct = results.filter((r) => r.correct).length;
  const total = ids.length;
  // Scale to the 10-question bands: 0-2 A1, 3-4 A2, 5-6 B1, 7-8 B2, 9-10 C1
  const level = Math.min(5, Math.max(1, Math.ceil((correct * 10) / total / 2)));
  return { correct, total, level, levelName: LEVEL_NAMES[level], results };
}

module.exports = { QUESTIONS, drawExam, grade, LEVEL_NAMES };
