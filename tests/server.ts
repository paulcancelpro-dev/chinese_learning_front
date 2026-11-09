import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { batch, correction, overview, progress, word, words } from "./fixtures";
const base = "http://localhost:8080/api";
export const server = setupServer(
  http.get(`${base}/vocabulary`, () => HttpResponse.json(words)),
  http.get(`${base}/vocabulary/:id`, () => HttpResponse.json(word)),
  http.get(`${base}/progress`, () => HttpResponse.json(progress)),
  http.get(`${base}/progress/due`, () => HttpResponse.json(progress)),
  http.get(`${base}/statistics/overview`, () => HttpResponse.json(overview)),
  http.get(`${base}/statistics/revisions`, () =>
    HttpResponse.json([{ date: "2026-11-09", completed: 1, due: 2 }]),
  ),
  http.get(`${base}/statistics/weak-words`, () =>
    HttpResponse.json([progress[1]]),
  ),
  http.get(`${base}/exercises/history`, () =>
    HttpResponse.json({
      content: [correction],
      number: 0,
      size: 20,
      totalPages: 1,
      totalElements: 1,
    }),
  ),
  http.get(`${base}/exercises/:id`, () =>
    HttpResponse.json(batch.exercises[0]),
  ),
  http.post(`${base}/exercises/generate`, () => HttpResponse.json(batch)),
  http.post(`${base}/exercises/:id/answers`, () =>
    HttpResponse.json(correction),
  ),
  http.post(`${base}/vocabulary/import`, () =>
    HttpResponse.json({ created: 1, merged: 0 }),
  ),
);
