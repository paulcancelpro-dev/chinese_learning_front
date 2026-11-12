import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { http, HttpResponse, delay } from "msw";
import App from "../src/app/App";
import { setSession, startSession } from "../src/features/session-store";
import { batch, correction } from "./fixtures";
import { server } from "./server";
function mount(path: string) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        })
      }
    >
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
beforeEach(() => setSession(null));
describe("parcours utilisateur", () => {
  it("affiche les données réelles et navigue vers le vocabulaire", async () => {
    mount("/");
    expect(
      await screen.findByText("Mots dans ma collection"),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("link", { name: "Mon vocabulaire" }),
    );
    expect(await screen.findByText("ami · amie")).toBeInTheDocument();
  });
  it("distingue un niveau nul du niveau zéro", async () => {
    mount("/progress");
    expect(await screen.findByText("Non évalué")).toBeInTheDocument();
    expect(screen.getByText("Niveau 0 / 5")).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Afficher"), "new");
    expect(screen.queryByText("Niveau 0 / 5")).not.toBeInTheDocument();
  });
  it("valide le formulaire avant enregistrement", async () => {
    mount("/vocabulary");
    await userEvent.click(
      await screen.findByRole("button", { name: "Ajouter un mot" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(await screen.findByText("Saisissez les hanzi.")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
  it("affiche une erreur réseau et permet de réessayer", async () => {
    server.use(
      http.get("http://localhost:8080/api/vocabulary", () =>
        HttpResponse.error(),
      ),
    );
    mount("/vocabulary");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "serveur est indisponible",
    );
    expect(
      screen.getByRole("button", { name: "Réessayer" }),
    ).toBeInTheDocument();
  });
  it("n’affiche pas la correction avant soumission et transmet le texte du QCM une seule fois", async () => {
    let requests = 0;
    server.use(
      http.post(
        "http://localhost:8080/api/exercises/:id/answers",
        async ({ request }) => {
          requests++;
          expect(await request.json()).toEqual({ answer: "ami" });
          await delay(100);
          return HttpResponse.json(correction);
        },
      ),
    );
    startSession(batch);
    mount("/practice/session");
    await screen.findByRole("radio", { name: /ami/ });
    expect(screen.queryByText("朋友 signifie ami.")).not.toBeInTheDocument();
    await userEvent.click(await screen.findByRole("radio", { name: /ami/ }));
    await userEvent.dblClick(
      screen.getByRole("button", { name: /Valider ma réponse/ }),
    );
    expect(await screen.findByText("朋友 signifie ami.")).toBeInTheDocument();
    expect(requests).toBe(1);
    await userEvent.click(
      screen.getByRole("button", { name: /Voir mes résultats/ }),
    );
    expect(
      await screen.findByRole("heading", { name: "Votre bilan de séance" }),
    ).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });
  it("traite le conflit 409 sans proposer une nouvelle soumission", async () => {
    server.use(
      http.post("http://localhost:8080/api/exercises/:id/answers", () =>
        HttpResponse.json(
          { detail: "Réponse déjà enregistrée" },
          { status: 409 },
        ),
      ),
    );
    startSession(batch);
    mount("/practice/session");
    await userEvent.click(await screen.findByRole("radio", { name: /ami/ }));
    await userEvent.click(screen.getByRole("button", { name: /Valider/ }));
    expect(
      await screen.findByText(/Cet exercice a déjà reçu/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Valider/ }),
    ).not.toBeInTheDocument();
  });
  it("conserve la réponse après une panne pour une relance idempotente", async () => {
    server.use(
      http.post("http://localhost:8080/api/exercises/:id/answers", () =>
        HttpResponse.error(),
      ),
    );
    startSession(batch);
    mount("/practice/session");
    await userEvent.click(await screen.findByRole("radio", { name: /ami/ }));
    await userEvent.click(screen.getByRole("button", { name: /Valider/ }));
    expect(
      await screen.findByRole("button", { name: "Réessayer la même réponse" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /eau/ })).toBeDisabled();
  });
  it("envoie les paramètres de génération et ouvre la séance", async () => {
    server.use(
      http.post(
        "http://localhost:8080/api/exercises/generate",
        async ({ request }) => {
          expect(await request.json()).toEqual({
            count: 10,
            difficulty: 2,
            types: ["HANZI_TO_FRENCH"],
            strategy: "DUE",
          });
          return HttpResponse.json(batch);
        },
      ),
    );
    mount("/practice");
    await userEvent.click(
      await screen.findByRole("button", { name: /Commencer la séance/ }),
    );
    expect(await screen.findByText("Question 1 / 1")).toBeInTheDocument();
  });
  it("gère un lot vide sans créer une fausse séance", async () => {
    server.use(
      http.post("http://localhost:8080/api/exercises/generate", () =>
        HttpResponse.json({ source: "local", exercises: [] }),
      ),
    );
    mount("/practice");
    await userEvent.click(
      await screen.findByRole("button", { name: /Commencer la séance/ }),
    );
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Aucun exercice disponible",
      ),
    );
  });
});

describe("réutilisation des phrases", () => {
  it("ouvre une nouvelle tentative sans appeler la génération", async () => {
    let generations = 0;
    let reuses = 0;
    server.use(
      http.get("http://localhost:8080/api/exercises/reusable", () =>
        HttpResponse.json([
          { type: "SENTENCE_TRANSLATION", difficulty: 0, available: 1 },
          { type: "SENTENCE_TRANSLATION", difficulty: 2, available: 1 },
        ]),
      ),
      http.post("http://localhost:8080/api/exercises/generate", () => {
        generations++;
        return HttpResponse.json(batch);
      }),
      http.post(
        "http://localhost:8080/api/exercises/reuse",
        async ({ request }) => {
          reuses++;
          expect(await request.json()).toEqual({
            count: 10,
            types: ["SENTENCE_TRANSLATION"],
            difficulty: null,
          });
          return HttpResponse.json({
            source: "reused",
            exercises: [
              {
                ...batch.exercises[0],
                id: "new-attempt",
                type: "SENTENCE_TRANSLATION",
                question: "我的朋友",
                choices: [],
              },
            ],
          });
        },
      ),
    );
    mount("/practice");
    await userEvent.click(
      await screen.findByRole("button", {
        name: "Phrases enregistrées — sans IA",
      }),
    );
    expect(
      await screen.findByText("1 phrase disponible pour ces critères."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/La séance contiendra 1 exercice/),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Réviser ces phrases" }),
    );
    expect(await screen.findByText("Question 1 / 1")).toBeInTheDocument();
    expect(
      screen.getByText(/phrases enregistrées · sans appel à OpenAI/),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Votre réponse" })).toHaveValue(
      "",
    );
    expect(reuses).toBe(1);
    expect(generations).toBe(0);
  });

  it("signale une réserve vide sans proposer de génération automatique", async () => {
    server.use(
      http.get("http://localhost:8080/api/exercises/reusable", () =>
        HttpResponse.json([]),
      ),
    );
    mount("/practice");
    await userEvent.click(
      await screen.findByRole("button", {
        name: "Phrases enregistrées — sans IA",
      }),
    );
    expect(
      await screen.findByText(/Aucune phrase disponible/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Réviser ces phrases" }),
    ).toBeDisabled();
  });

  it("filtre la réserve par difficulté et par type", async () => {
    server.use(
      http.get("http://localhost:8080/api/exercises/reusable", () =>
        HttpResponse.json([
          { type: "SENTENCE_TRANSLATION", difficulty: 0, available: 2 },
          { type: "SENTENCE_TRANSLATION", difficulty: 2, available: 2 },
          { type: "FILL_IN_THE_BLANK", difficulty: 3, available: 1 },
        ]),
      ),
    );
    mount("/practice");
    await userEvent.click(
      await screen.findByRole("button", {
        name: "Phrases enregistrées — sans IA",
      }),
    );
    await screen.findByText("2 phrases disponibles pour ces critères.");
    await userEvent.selectOptions(
      screen.getByLabelText("Difficulté des phrases"),
      "3",
    );
    expect(
      screen.getByRole("button", { name: "Réviser ces phrases" }),
    ).toBeDisabled();
    await userEvent.click(
      screen.getByRole("checkbox", { name: /Phrase à compléter/ }),
    );
    expect(
      screen.getByText("1 phrase disponible pour ces critères."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Réviser ces phrases" }),
    ).toBeEnabled();
  });
});
