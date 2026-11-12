import type { components } from "./openapi";
type S = components["schemas"];
export type Word = Required<S["WordView"]>;
export type WordInput = S["WordDto"];
export type Progress = Omit<
  Required<S["ProgressView"]>,
  "level" | "lastReview" | "nextReview"
> & {
  level: number | null;
  lastReview: string | null;
  nextReview: string | null;
};
export type Exercise = Required<S["ExerciseView"]>;
export type Correction = Required<S["Correction"]>;
export type Generation = Required<S["GenerationRequest"]>;
export type Batch = { source: string; exercises: Exercise[] };
export type Overview = Required<S["Overview"]>;
export type Daily = Required<S["Daily"]>;
export type ReviewEvent = S["ImportedReview"];
export type Page<T> = {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
};
export const skills = {
  HANZI_RECOGNITION: "Reconnaissance",
  HANZI_TO_PINYIN: "Pinyin",
  HANZI_TO_FRENCH: "Compréhension",
  WRITING: "Écriture",
};
export const exerciseTypes = {
  HANZI_TO_FRENCH: "Hanzi → français",
  HANZI_TO_PINYIN: "Hanzi → pinyin",
  PINYIN_TO_HANZI: "Pinyin → hanzi",
  MULTIPLE_CHOICE: "Choix multiple",
  SENTENCE_TRANSLATION: "Traduction de phrase",
  FILL_IN_THE_BLANK: "Phrase à compléter",
};

export type ReuseRequest = {
  count: number;
  types: ("SENTENCE_TRANSLATION" | "FILL_IN_THE_BLANK")[];
  difficulty: number | null;
};
export type ReuseAvailability = {
  type: ReuseRequest["types"][number];
  /** 0 means all difficulties, deduplicated. */
  difficulty: number;
  available: number;
};
