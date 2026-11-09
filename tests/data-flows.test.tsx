import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse } from "msw";
import App from "../src/app/App";
import { server } from "./server";
import { word } from "./fixtures";
function mount(path: string) {
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
describe("modifications et événements", () => {
  it("crée un mot avec les traductions françaises attendues", async () => {
    let body: unknown;
    server.use(
      http.post("http://localhost:8080/api/vocabulary", async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(word, { status: 201 });
      }),
    );
    mount("/vocabulary");
    await userEvent.click(
      await screen.findByRole("button", { name: "Ajouter un mot" }),
    );
    await userEvent.type(screen.getByLabelText("Hanzi"), "朋友");
    await userEvent.type(screen.getByLabelText("Pinyin"), "péngyou");
    await userEvent.type(
      screen.getByLabelText("Traductions françaises"),
      "ami\namie",
    );
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(
      await screen.findByText("Le mot a été enregistré."),
    ).toBeInTheDocument();
    expect(body).toEqual({
      hanzi: "朋友",
      pinyin: "péngyou",
      traductions_fr: ["ami", "amie"],
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("modifie le mot par PUT et remplace ses traductions", async () => {
    let body: unknown;
    server.use(
      http.put(
        `http://localhost:8080/api/vocabulary/${word.id}`,
        async ({ request }) => {
          body = await request.json();
          return HttpResponse.json({ ...word, traductions_fr: ["camarade"] });
        },
      ),
    );
    mount("/vocabulary");
    await userEvent.click(
      await screen.findByRole("button", { name: "Modifier 朋友" }),
    );
    await userEvent.clear(screen.getByLabelText("Traductions françaises"));
    await userEvent.type(
      screen.getByLabelText("Traductions françaises"),
      "camarade",
    );
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(
      await screen.findByText("Le mot a été enregistré."),
    ).toBeInTheDocument();
    expect(body).toEqual({
      hanzi: word.hanzi,
      pinyin: word.pinyin,
      traductions_fr: ["camarade"],
    });
  });
  it("ne supprime pas avant confirmation et permet d’annuler", async () => {
    let deleted = 0;
    server.use(
      http.delete(`http://localhost:8080/api/vocabulary/${word.id}`, () => {
        deleted++;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    mount("/vocabulary");
    await userEvent.click(
      await screen.findByRole("button", { name: "Supprimer 朋友" }),
    );
    expect(deleted).toBe(0);
    await userEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(deleted).toBe(0);
    await userEvent.click(
      screen.getByRole("button", { name: "Supprimer 朋友" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Confirmer la suppression" }),
    );
    await waitFor(() => expect(deleted).toBe(1));
    expect(
      await screen.findByText(
        "Le mot et ses données associées ont été supprimés.",
      ),
    ).toBeInTheDocument();
  });
  it("consulte les révisions importées sans inventer de niveau", async () => {
    server.use(
      http.get("http://localhost:8080/api/progress/export", () =>
        HttpResponse.json({
          progress: [
            {
              id: "event-1",
              hanzi: word.hanzi,
              pinyin: word.pinyin,
              skill: "WRITING",
              correct: true,
              reviewedAt: "2026-11-09T10:00:00Z",
              answer: "mon tracé",
            },
          ],
        }),
      ),
    );
    mount("/progress");
    await userEvent.click(
      await screen.findByText(
        "Historique des révisions, y compris les événements importés",
      ),
    );
    expect(await screen.findByText("mon tracé")).toBeInTheDocument();
    expect(screen.getByText("Réussite", { exact: true })).toBeInTheDocument();
  });
  it("affiche les erreurs de génération avancée sans basculer silencieusement de type", async () => {
    server.use(
      http.post("http://localhost:8080/api/exercises/generate", () =>
        HttpResponse.json(
          { detail: "Les exercices avancés nécessitent OpenAI" },
          { status: 400 },
        ),
      ),
    );
    mount("/practice");
    await userEvent.click(
      await screen.findByRole("checkbox", { name: /Traduction de phrase/ }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Commencer la séance/ }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Les exercices avancés nécessitent OpenAI",
    );
  });
});

it("soumet le pinyin avec ses tons et affiche une correction erronée", async () => {
  const { startSession } = await import("../src/features/session-store");
  const { batch, correction } = await import("./fixtures");
  startSession({
    ...batch,
    exercises: [
      { ...batch.exercises[0], type: "HANZI_TO_PINYIN", choices: [] },
    ],
  });
  server.use(
    http.post(
      "http://localhost:8080/api/exercises/:id/answers",
      async ({ request }) => {
        expect(await request.json()).toEqual({ answer: "péngyǒu" });
        return HttpResponse.json({
          ...correction,
          correct: false,
          acceptedAnswers: ["péngyou"],
          explanation: "La syllabe you a ici un ton neutre.",
        });
      },
    ),
  );
  mount("/practice/session");
  await userEvent.type(
    await screen.findByLabelText("Votre réponse"),
    "péngyǒu",
  );
  await userEvent.click(
    screen.getByRole("button", { name: /Valider ma réponse/ }),
  );
  expect(
    await screen.findByText("La syllabe you a ici un ton neutre."),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Une occasion d’apprendre" }),
  ).toBeInTheDocument();
});
