import type {
  Batch,
  Correction,
  Overview,
  Page,
  Progress,
  Word,
} from "../src/types/models";
export const word: Word = {
  id: "11111111-1111-4111-8111-111111111111",
  hanzi: "朋友",
  pinyin: "péngyou",
  traductions_fr: ["ami", "amie"],
};
export const words: Page<Word> = {
  content: [word],
  number: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1,
};
export const overview: Overview = {
  words: 1,
  evaluatedSkills: 1,
  masteredSkills: 0,
  dueSkills: 2,
  answers: 1,
  successes: 1,
};
export const progress: Progress[] = [
  {
    wordId: word.id,
    skill: "HANZI_RECOGNITION",
    level: null,
    successes: 0,
    errors: 0,
    lastReview: null,
    nextReview: null,
  },
  {
    wordId: word.id,
    skill: "HANZI_TO_FRENCH",
    level: 0,
    successes: 0,
    errors: 1,
    lastReview: "2026-11-08T12:00:00Z",
    nextReview: "2026-11-08T12:10:00Z",
  },
];
export const batch: Batch = {
  source: "local",
  exercises: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      sessionId: "33333333-3333-4333-8333-333333333333",
      type: "MULTIPLE_CHOICE",
      question: "朋友",
      choices: ["ami", "eau"],
      difficulty: 2,
      newVocabulary: [],
    },
  ],
};
export const correction: Correction = {
  exerciseId: batch.exercises[0].id,
  correct: true,
  acceptedAnswers: ["ami"],
  explanation: "朋友 signifie ami.",
  answeredAt: "2026-11-09T12:00:00Z",
};
