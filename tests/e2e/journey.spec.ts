import { test, expect } from "@playwright/test";
import {
  batch,
  correction,
  overview,
  progress,
  word,
  words,
} from "../fixtures";
test.beforeEach(async ({ page }) => {
  await page.route("http://localhost:8080/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const data = path.endsWith("/generate")
      ? batch
      : path.endsWith("/answers")
        ? correction
        : path.endsWith("/import")
          ? { created: 1, merged: 0 }
          : path === "/api/vocabulary"
            ? words
            : path.startsWith("/api/vocabulary/")
              ? word
              : path === "/api/progress" || path.endsWith("/due")
                ? progress
                : path.endsWith("/overview")
                  ? overview
                  : path.endsWith("/revisions")
                    ? [{ date: "2026-11-09", completed: 1, due: 2 }]
                    : path.endsWith("/weak-words")
                      ? [progress[1]]
                      : path.endsWith("/history")
                        ? {
                            content: [correction],
                            number: 0,
                            totalPages: 1,
                            totalElements: 1,
                            size: 20,
                          }
                        : batch.exercises[0];
    await route.fulfill({
      json: data,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  });
});
test("import JSON confirmé et résumé", async ({ page }) => {
  await page.goto("/import");
  await page.getByLabel("Fichier JSON").setInputFiles({
    name: "vocabulary.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        vocabulary: [
          { hanzi: "朋友", pinyin: "péngyou", traductions_fr: ["ami"] },
        ],
      }),
    ),
  });
  await expect(
    page.getByRole("button", { name: "Confirmer l’import" }),
  ).toBeDisabled();
  await page.getByRole("checkbox").check();
  const request = page.waitForRequest(
    (r) => r.url().endsWith("/vocabulary/import") && r.method() === "POST",
  );
  await page.getByRole("button", { name: "Confirmer l’import" }).click();
  expect((await request).postDataJSON()).toHaveProperty("vocabulary");
  await expect(page.getByText("Import terminé")).toBeVisible();
  await expect(page.getByText("Entrées créées : 1")).toBeVisible();
});
test("séance, rechargement, réponse et bilan", async ({ page }) => {
  await page.goto("/practice");
  await page.getByRole("button", { name: "Commencer la séance" }).click();
  await expect(page).toHaveURL(/practice\/session/);
  await expect(page.getByText("朋友 signifie ami.")).toHaveCount(0);
  await page.getByRole("radio", { name: /ami/ }).check();
  await page.reload();
  await expect(page.getByRole("radio", { name: /ami/ })).toBeChecked();
  const request = page.waitForRequest((r) => r.url().endsWith("/answers"));
  await page.getByRole("button", { name: "Valider ma réponse" }).click();
  expect((await request).postDataJSON()).toEqual({ answer: "ami" });
  await expect(page.getByText("朋友 signifie ami.")).toBeVisible();
  await page.getByRole("button", { name: "Voir mes résultats" }).click();
  await expect(
    page.getByRole("heading", { name: "Votre bilan de séance" }),
  ).toBeVisible();
  await expect(page.getByText("100%")).toBeVisible();
});
test("progression filtrable et distinction null / zéro", async ({ page }) => {
  await page.goto("/progress");
  await expect(page.getByText("Non évalué", { exact: true })).toBeVisible();
  await expect(page.getByText("Niveau 0 / 5")).toBeVisible();
  await page.getByLabel("Afficher").selectOption("new");
  await expect(page.getByText("Niveau 0 / 5")).toHaveCount(0);
  await expect(page.getByText("Non évalué", { exact: true })).toBeVisible();
});
test("backend indisponible sans statistiques fictives", async ({ page }) => {
  await page.route("http://localhost:8080/api/**", (route) => route.abort());
  await page.goto("/");
  await expect(
    page.getByText(/Le serveur est indisponible/).first(),
  ).toBeVisible();
  await expect(page.getByText("Mots dans ma collection")).toHaveCount(0);
});

test("refuse un JSON invalide puis importe la progression sans transformer les événements", async ({
  page,
}) => {
  await page.goto("/import");
  await page.getByLabel("Fichier JSON").setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from("{invalid"),
  });
  await expect(page.getByRole("alert")).toContainText("JSON valide");
  await expect(
    page.getByRole("button", { name: "Confirmer l’import" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Progression", exact: true }).click();
  const payload = {
    progress: [
      {
        id: "44444444-4444-4444-8444-444444444444",
        hanzi: "朋友",
        pinyin: "péngyou",
        skill: "HANZI_TO_FRENCH",
        correct: true,
        reviewedAt: "2026-11-08T10:00:00Z",
        answer: "ami",
      },
    ],
  };
  await page.getByLabel("Fichier JSON").setInputFiles({
    name: "progress.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(payload)),
  });
  await page.getByRole("checkbox").check();
  const request = page.waitForRequest(
    (r) => r.url().endsWith("/progress/import") && r.method() === "POST",
  );
  await page.getByRole("button", { name: "Confirmer l’import" }).click();
  expect((await request).postDataJSON()).toEqual(payload);
  await expect(page.getByText("Import terminé")).toBeVisible();
});

test("navigation, thème persistant et mise en page sans débordement", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByText("Mots dans ma collection")).toBeVisible();
  await page.getByRole("button", { name: "Mode sombre" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Mode clair" })).toBeVisible();
  for (const [path, heading] of [
    ["/vocabulary", "Mon vocabulaire"],
    ["/practice", "À vous de jouer"],
    ["/statistics", "Mes statistiques"],
    ["/history", "Historique"],
    ["/import", "Importer mes données"],
  ] as const) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});

test("indice automatique après dix secondes et Entrée après correction", async ({
  page,
}) => {
  await page.clock.install();
  let hintRequests = 0;
  await page.route("**/api/exercises/*/hint", async (route) => {
    hintRequests++;
    await route.fulfill({ json: { firstLetter: "a" } });
  });
  await page.goto("/practice");
  await page.getByRole("button", { name: "Commencer la séance" }).click();
  await expect(page.getByText("Question 1 / 1")).toBeVisible();
  await page.clock.fastForward(9000);
  expect(hintRequests).toBe(0);
  await page.clock.fastForward(1000);
  await expect(page.getByText("Première lettre :")).toContainText("a");
  expect(hintRequests).toBe(1);
  await expect(page.getByText("朋友 signifie ami.")).toHaveCount(0);
  await page.getByRole("radio", { name: /ami/ }).check();
  await page.getByRole("button", { name: "Valider ma réponse" }).click();
  await expect(page.getByText("朋友 signifie ami.")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Votre bilan de séance" }),
  ).toBeVisible();
});

test("bouton indice et saisie de i sans raccourci", async ({ page }) => {
  await page.clock.install();
  await page.route("**/api/exercises/generate", (route) =>
    route.fulfill({
      json: {
        ...batch,
        exercises: [
          { ...batch.exercises[0], type: "HANZI_TO_FRENCH", choices: [] },
        ],
      },
    }),
  );
  let hintRequests = 0;
  await page.route("**/api/exercises/*/hint", async (route) => {
    hintRequests++;
    await route.fulfill({ json: { firstLetter: "a" } });
  });
  await page.goto("/practice");
  await page.getByRole("button", { name: "Commencer la séance" }).click();
  await page.getByLabel("Votre réponse").press("i");
  await expect(page.getByLabel("Votre réponse")).toHaveValue("i");
  await page.clock.fastForward(11000);
  expect(hintRequests).toBe(0);
  await page
    .getByRole("button", { name: "Afficher un indice", exact: true })
    .click();
  await expect(page.getByText("Première lettre :")).toContainText("a");
  expect(hintRequests).toBe(1);
});
