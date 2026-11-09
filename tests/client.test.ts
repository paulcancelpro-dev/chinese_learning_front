import { describe, it, expect } from "vitest";
import { http, HttpResponse } from "msw";
import { api } from "../src/lib/api/client";
import { parseImport, wordSchema } from "../src/lib/validation";
import { server } from "./server";
describe("client HTTP et validation", () => {
  it("envoie un JSON brut et conserve ses champs", async () => {
    const payload = {
      vocabulary: [{ hanzi: "水", pinyin: "shuǐ", traductions_fr: ["eau"] }],
    };
    server.use(
      http.post(
        "http://localhost:8080/api/vocabulary/import",
        async ({ request }) => {
          expect(request.headers.get("content-type")).toBe("application/json");
          expect(await request.json()).toEqual(payload);
          return HttpResponse.json({ created: 1 });
        },
      ),
    );
    expect(await api.import("vocabulary", payload)).toEqual({ created: 1 });
  });
  it("expose le détail ProblemDetail et son statut", async () => {
    server.use(
      http.post("http://localhost:8080/api/exercises/generate", () =>
        HttpResponse.json(
          { detail: "OpenAI indisponible" },
          {
            status: 502,
            headers: { "Content-Type": "application/problem+json" },
          },
        ),
      ),
    );
    await expect(
      api.generate({
        count: 1,
        difficulty: 1,
        types: ["SENTENCE_TRANSLATION"],
        strategy: "NEW",
      }),
    ).rejects.toMatchObject({ status: 502, message: "OpenAI indisponible" });
  });
  it("explique une panne réseau", async () => {
    server.use(
      http.get("http://localhost:8080/api/progress", () =>
        HttpResponse.error(),
      ),
    );
    await expect(api.progress()).rejects.toMatchObject({
      status: 0,
      message: expect.stringContaining("serveur est indisponible"),
    });
  });
  it("accepte une suppression sans corps de réponse", async () => {
    server.use(
      http.delete(
        "http://localhost:8080/api/vocabulary/one",
        () => new HttpResponse(null, { status: 204 }),
      ),
    );
    await expect(api.deleteWord("one")).resolves.toBeUndefined();
  });
  it("encode les recherches et la pagination", async () => {
    server.use(
      http.get("http://localhost:8080/api/vocabulary", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.get("q")).toBe("水 & eau");
        expect(url.searchParams.get("page")).toBe("2");
        return HttpResponse.json({ content: [] });
      }),
    );
    await api.vocabulary("水 & eau", 2);
  });
  it("rejette les extensions, JSON invalides et valeurs primitives", () => {
    expect(() => parseImport("a.txt", "[]")).toThrow(".json");
    expect(() => parseImport("a.json", "{")).toThrow("JSON valide");
    expect(() => parseImport("a.json", "null")).toThrow("tableau");
    expect(parseImport("a.JSON", '{"vocabulary":[]}')).toEqual({
      vocabulary: [],
    });
  });
  it("valide les champs obligatoires et les limites des traductions", () => {
    expect(
      wordSchema.safeParse({ hanzi: " ", pinyin: "a", translations: "ami" })
        .success,
    ).toBe(false);
    expect(
      wordSchema.safeParse({
        hanzi: "友",
        pinyin: "yǒu",
        translations: "a".repeat(301),
      }).success,
    ).toBe(false);
    expect(
      wordSchema.safeParse({
        hanzi: "友",
        pinyin: "yǒu",
        translations: "ami\namie",
      }).success,
    ).toBe(true);
  });
});
