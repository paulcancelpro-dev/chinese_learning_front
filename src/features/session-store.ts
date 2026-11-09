import { useSyncExternalStore } from "react";
import { z } from "zod";
import type { Batch, Correction } from "../types/models";
import { exerciseTypes } from "../types/models";
const correction = z.object({
  exerciseId: z.string(),
  correct: z.boolean(),
  acceptedAnswers: z.array(z.string()),
  explanation: z.string(),
  answeredAt: z.string(),
});
const schema = z.object({
  source: z.string(),
  exercises: z
    .array(
      z.object({
        id: z.string(),
        sessionId: z.string(),
        type: z.enum(
          Object.keys(exerciseTypes) as [
            keyof typeof exerciseTypes,
            ...(keyof typeof exerciseTypes)[],
          ],
        ),
        question: z.string(),
        choices: z.array(z.string()),
        difficulty: z.number(),
        newVocabulary: z.array(z.string()),
      }),
    )
    .min(1),
  answers: z.record(z.string(), z.string()),
  corrections: z.record(z.string(), correction),
  pending: z.record(z.string(), z.string()),
  index: z.number().int().min(0),
});
export type Session = z.infer<typeof schema>;
const key = "zhi-session-v1";
let storageWarning = "";
export function getStorageWarning() {
  return storageWarning;
}
function read(): Session | null {
  try {
    const result = schema.safeParse(
      JSON.parse(localStorage.getItem(key) || "null"),
    );
    return result.success && result.data.index < result.data.exercises.length
      ? result.data
      : null;
  } catch {
    storageWarning =
      "La sauvegarde locale est indisponible. Gardez cet onglet ouvert pour conserver votre séance.";
    return null;
  }
}
let current = read();
const listeners = new Set<() => void>();
export function setSession(value: Session | null) {
  current = value;
  try {
    if (value) localStorage.setItem(key, JSON.stringify(value));
    else localStorage.removeItem(key);
    storageWarning = "";
  } catch {
    storageWarning =
      "La sauvegarde locale est indisponible. Gardez cet onglet ouvert pour conserver votre séance.";
  }
  listeners.forEach((fn) => fn());
}
export function startSession(batch: Batch) {
  if (!batch.exercises.length)
    throw new Error(
      "Aucun exercice disponible pour cette sélection. Importez des mots ou changez de stratégie.",
    );
  setSession({ ...batch, index: 0, answers: {}, corrections: {}, pending: {} });
}
export function updateAnswer(id: string, answer: string) {
  if (current)
    setSession({ ...current, answers: { ...current.answers, [id]: answer } });
}
export function markPending(id: string, answer: string) {
  if (current)
    setSession({ ...current, pending: { ...current.pending, [id]: answer } });
}
export function clearPending(id: string) {
  if (current) {
    const pending = { ...current.pending };
    delete pending[id];
    setSession({ ...current, pending });
  }
}
export function saveCorrection(id: string, value: Correction) {
  if (current) {
    const pending = { ...current.pending };
    delete pending[id];
    setSession({
      ...current,
      pending,
      corrections: { ...current.corrections, [id]: value },
    });
  }
}
export function useSession() {
  return useSyncExternalStore(
    (callback) => {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
    () => current,
  );
}
