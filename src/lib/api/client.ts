import type {
  Batch,
  Correction,
  Daily,
  Exercise,
  Generation,
  Overview,
  Page,
  Progress,
  ReviewEvent,
  Word,
  WordInput,
} from "../../types/models";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
const base = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"
).replace(/\/$/, "");
export async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}/api${path}`, {
      ...init,
      headers: {
        Accept: "application/json, application/problem+json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(
      0,
      "Le serveur est indisponible. Vérifiez que le backend est lancé sur le port 8080, puis réessayez.",
    );
  }
  if (!response.ok) {
    const problem: unknown = await response.json().catch(() => null);
    const detail =
      problem &&
      typeof problem === "object" &&
      "detail" in problem &&
      typeof problem.detail === "string"
        ? problem.detail
        : `La requête a échoué (HTTP ${response.status}).`;
    throw new ApiError(response.status, detail);
  }
  return response.status === 204
    ? (undefined as T)
    : (response.json() as Promise<T>);
}
const body = (value: unknown, method = "POST") => ({
  method,
  body: JSON.stringify(value),
});
export const api = {
  vocabulary: (q = "", page = 0) =>
    request<Page<Word>>(
      `/vocabulary?${new URLSearchParams({ q, page: String(page), size: "20" })}`,
    ),
  word: (id: string) => request<Word>(`/vocabulary/${id}`),
  saveWord: (word: WordInput, id?: string) =>
    request<Word>(
      id ? `/vocabulary/${id}` : "/vocabulary",
      body(word, id ? "PUT" : "POST"),
    ),
  deleteWord: (id: string) =>
    request<void>(`/vocabulary/${id}`, { method: "DELETE" }),
  progress: () => request<Progress[]>("/progress"),
  reviewEvents: () => request<{ progress: ReviewEvent[] }>("/progress/export"),
  due: () => request<Progress[]>("/progress/due"),
  overview: () => request<Overview>("/statistics/overview"),
  weak: () => request<Progress[]>("/statistics/weak-words"),
  revisions: () => request<Daily[]>("/statistics/revisions"),
  history: (page = 0) =>
    request<Page<Correction>>(`/exercises/history?page=${page}&size=20`),
  exercise: (id: string) => request<Exercise>(`/exercises/${id}`),
  generate: (value: Generation) =>
    request<Batch>("/exercises/generate", body(value)),
  answer: (id: string, answer: string) =>
    request<Correction>(`/exercises/${id}/answers`, body({ answer })),
  import: (kind: "vocabulary" | "progress", value: unknown) =>
    request<Record<string, number>>(`/${kind}/import`, body(value)),
  export: (kind: "vocabulary" | "progress") =>
    request<unknown>(`/${kind}/export`),
};
export async function download(kind: "vocabulary" | "progress") {
  const value = await api.export(kind);
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${kind}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
