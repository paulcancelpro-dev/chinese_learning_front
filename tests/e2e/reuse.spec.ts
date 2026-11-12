import { test, expect } from "@playwright/test";

test("séance de phrases enregistrées sans génération, avec correction", async ({
  page,
}, testInfo) => {
  let generations = 0;
  let reuses = 0;
  await page.route("http://localhost:8080/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/generate")) {
      generations++;
      await route.fulfill({
        status: 500,
        json: { detail: "Génération interdite" },
      });
      return;
    }
    if (path.endsWith("/reusable")) {
      await route.fulfill({
        json: [{ type: "SENTENCE_TRANSLATION", difficulty: 0, available: 1 }],
      });
      return;
    }
    if (path.endsWith("/reuse")) {
      reuses++;
      expect(route.request().postDataJSON()).toEqual({
        count: 10,
        types: ["SENTENCE_TRANSLATION"],
        difficulty: null,
      });
      await route.fulfill({
        json: {
          source: "reused",
          exercises: [
            {
              id: "attempt-2",
              sessionId: "session-2",
              type: "SENTENCE_TRANSLATION",
              question: "我的朋友",
              choices: [],
              difficulty: 2,
              newVocabulary: ["我的"],
            },
          ],
        },
      });
      return;
    }
    if (path.endsWith("/answers")) {
      expect(route.request().postDataJSON()).toEqual({ answer: "mon ami" });
      await route.fulfill({
        json: {
          exerciseId: "attempt-2",
          correct: true,
          acceptedAnswers: ["mon ami"],
          explanation: "朋友 signifie ami.",
          answeredAt: "2026-11-11T20:00:00Z",
        },
      });
      return;
    }
    if (path.endsWith("/hint")) {
      await route.fulfill({ json: { firstLetter: "m" } });
      return;
    }
    await route.fulfill({ status: 404, json: { detail: "Non simulé" } });
  });
  await page.goto("/practice");
  await page
    .getByRole("button", { name: "Phrases enregistrées — sans IA" })
    .click();
  await expect(
    page.getByText("1 phrase disponible pour ces critères."),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("reuse-setup.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Réviser ces phrases" }).click();
  await expect(page.getByText("Question 1 / 1")).toBeVisible();
  await expect(
    page.getByText(/phrases enregistrées · sans appel à OpenAI/),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Votre réponse" }).fill("mon ami");
  await page.getByRole("button", { name: "Valider ma réponse" }).click();
  await expect(page.getByText("Bien joué !")).toBeVisible();
  expect(reuses).toBe(1);
  expect(generations).toBe(0);
});
