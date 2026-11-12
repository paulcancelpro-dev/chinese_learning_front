import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, RotateCcw } from "lucide-react";
import { api } from "../lib/api/client";
import { exerciseTypes, type ReuseRequest } from "../types/models";
import { ErrorNotice } from "../components/ui";
import { startSession } from "./session-store";

export default function ReusePractice() {
  const navigate = useNavigate();
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState(0);
  const [types, setTypes] = useState<ReuseRequest["types"]>([
    "SENTENCE_TRANSLATION",
  ]);
  const pool = useQuery({
    queryKey: ["reusable-exercises"],
    queryFn: api.reusable,
    staleTime: 0,
  });
  const available = (pool.data ?? [])
    .filter((row) => row.difficulty === difficulty && types.includes(row.type))
    .reduce((sum, row) => sum + row.available, 0);
  const reuse = useMutation({
    mutationFn: async () => {
      const batch = await api.reuse({
        count,
        types,
        difficulty: difficulty || null,
      });
      startSession(batch);
    },
    onSuccess: () => navigate("/practice/session"),
  });
  return (
    <form
      className="practice-layout"
      onSubmit={(event) => {
        event.preventDefault();
        if (
          types.length &&
          available > 0 &&
          !pool.isPending &&
          !pool.isError &&
          !reuse.isPending
        )
          reuse.mutate();
      }}
    >
      <section className="card">
        <h2>Retrouvez vos phrases</h2>
        <p className="muted">
          Révisez les phrases déjà générées, même celles auxquelles vous avez
          déjà répondu. Chaque séance enregistre de nouvelles réponses et met à
          jour votre progression.
        </p>
        <p className="notice">
          <RotateCcw size={20} />
          Aucun appel à OpenAI dans ce mode.
        </p>
        <fieldset disabled={reuse.isPending}>
          <legend>Types de phrases</legend>
          <div className="type-grid">
            {(["SENTENCE_TRANSLATION", "FILL_IN_THE_BLANK"] as const).map(
              (type) => (
                <label
                  key={type}
                  className={`type-option ${types.includes(type) ? "selected" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={types.includes(type)}
                    onChange={(event) => {
                      setTypes(
                        event.target.checked
                          ? [...types, type]
                          : types.filter((t) => t !== type),
                      );
                      reuse.reset();
                    }}
                  />
                  <span>
                    <strong>{exerciseTypes[type]}</strong>
                    <small>Depuis votre réserve de phrases</small>
                  </span>
                </label>
              ),
            )}
          </div>
        </fieldset>
        <ErrorNotice error={pool.error} retry={() => void pool.refetch()} />
        {pool.isPending && (
          <p role="status">Recherche des phrases enregistrées…</p>
        )}
        {pool.isSuccess && (
          <p role="status">
            {available} phrase{available !== 1 ? "s" : ""} disponible
            {available !== 1 ? "s" : ""} pour ces critères.
          </p>
        )}
        {pool.isSuccess && available === 0 && types.length > 0 && (
          <p className="notice">
            Aucune phrase disponible. Changez les filtres ou créez d’abord des
            traductions de phrases ou des phrases à compléter dans « Nouveaux
            exercices », avec OpenAI activé.
          </p>
        )}
      </section>
      <aside className="card session-config">
        <h2>Votre séance de révision</h2>
        <label>
          Nombre d’exercices <strong>{count}</strong>
          <input
            type="range"
            min="1"
            max="20"
            value={count}
            disabled={reuse.isPending}
            onChange={(event) => setCount(Number(event.target.value))}
          />
        </label>
        <div className="range-labels">
          <span>1 exercice</span>
          <span>20 exercices</span>
        </div>
        <label>
          Difficulté des phrases
          <select
            value={difficulty}
            disabled={reuse.isPending}
            onChange={(event) => {
              setDifficulty(Number(event.target.value));
              reuse.reset();
            }}
          >
            <option value={0}>Tous les niveaux</option>
            {[1, 2, 3, 4, 5].map((level) => (
              <option key={level} value={level}>
                Niveau {level} / 5
              </option>
            ))}
          </select>
        </label>
        {pool.isSuccess && available > 0 && (
          <p className="muted">
            La séance contiendra {Math.min(count, available)} exercice
            {Math.min(count, available) > 1 ? "s" : ""}, sans répétition de la
            même phrase pour un même type. Les phrases sont choisies au hasard.
          </p>
        )}
        {!types.length && (
          <p role="status">Sélectionnez au moins un type de phrase.</p>
        )}
        <ErrorNotice error={reuse.error} />
        <button
          className="primary full"
          disabled={
            !types.length ||
            available === 0 ||
            pool.isPending ||
            pool.isError ||
            reuse.isPending
          }
        >
          {reuse.isPending
            ? "Préparation de la séance…"
            : "Réviser ces phrases"}
          <ArrowRight size={17} />
        </button>
        <p className="small muted">
          Une nouvelle séance remplace la sauvegarde locale précédente.
        </p>
      </aside>
    </form>
  );
}
