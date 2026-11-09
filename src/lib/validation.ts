import { z } from "zod";
export const wordSchema = z.object({
  hanzi: z.string().trim().min(1, "Saisissez les hanzi.").max(100),
  pinyin: z.string().trim().min(1, "Saisissez le pinyin.").max(200),
  translations: z
    .string()
    .trim()
    .min(1, "Ajoutez une traduction.")
    .refine(
      (v) =>
        v.split("\n").filter((s) => s.trim()).length <= 30 &&
        v.split("\n").every((s) => s.trim().length <= 300),
      "30 traductions maximum, 300 caractères chacune.",
    ),
});
export type WordForm = z.infer<typeof wordSchema>;
export function parseImport(name: string, text: string): unknown {
  if (!name.toLowerCase().endsWith(".json"))
    throw new Error("Sélectionnez un fichier .json.");
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Le fichier ne contient pas un JSON valide.");
  }
  if (!data || typeof data !== "object")
    throw new Error("Le JSON doit être un tableau ou une enveloppe objet.");
  return data;
}
