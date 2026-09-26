// Paid certification exam. Answers never leave the server; grading is server-side.
const QUESTIONS = [
  { id: 101, level: 1, question: "I ___ a student.", options: ["am", "is", "are"], answer: "am" },
  { id: 102, level: 1, question: "Which one is a color?", options: ["Blue", "Table", "Run"], answer: "Blue" },
  { id: 103, level: 2, question: "Yesterday I ___ to the cinema.", options: ["go", "went", "gone"], answer: "went" },
  { id: 104, level: 2, question: "There aren't ___ apples left.", options: ["some", "any", "much"], answer: "any" },
  { id: 105, level: 3, question: "If it rains, we ___ at home.", options: ["stay", "will stay", "stayed"], answer: "will stay" },
  { id: 106, level: 3, question: "She has been working here ___ five years.", options: ["since", "for", "during"], answer: "for" },
  { id: 107, level: 4, question: "The report ___ by the time the manager arrived.", options: ["was finishing", "had been finished", "has finished"], answer: "had been finished" },
  { id: 108, level: 4, question: "Choose the closest meaning of 'reluctant'.", options: ["Unwilling", "Excited", "Careless"], answer: "Unwilling" },
  { id: 109, level: 5, question: "Hardly ___ the station when the train left.", options: ["I had reached", "had I reached", "I reached"], answer: "had I reached" },
  { id: 110, level: 5, question: "His argument was so ___ that nobody could refute it.", options: ["cogent", "vague", "trivial"], answer: "cogent" },
];

const LEVEL_NAMES = ["", "A1", "A2", "B1", "B2", "C1"];

function publicQuestions() {
  return QUESTIONS.map(({ answer, ...q }) => q);
}

/** @param answers {[questionId]: chosenOption} */
function grade(answers = {}) {
  const results = QUESTIONS.map((q) => ({ id: q.id, correct: answers[q.id] === q.answer }));
  const correct = results.filter((r) => r.correct).length;
  // 0-2 -> A1, 3-4 -> A2, 5-6 -> B1, 7-8 -> B2, 9-10 -> C1
  const level = Math.min(5, Math.max(1, Math.ceil(correct / 2)));
  return { correct, total: QUESTIONS.length, level, levelName: LEVEL_NAMES[level], results };
}

module.exports = { publicQuestions, grade, LEVEL_NAMES };
