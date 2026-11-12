import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, Sparkles, Zap, RotateCcw } from "lucide-react";
import { api } from "../lib/api/client";
import { exerciseTypes, type Generation } from "../types/models";
import { ErrorNotice, Heading } from "../components/ui";
import { startSession, useSession } from "./session-store";
import ReusePractice from "./ReusePractice";
export default function Practice() {
  const [mode, setMode] = useState<"generate" | "reuse">("generate");
  const navigate = useNavigate();
  const session = useSession();
  const [count, setCount] = useState(10);
  const [difficulty, setDifficulty] = useState(2);
  const [types, setTypes] = useState<Generation["types"]>(["HANZI_TO_FRENCH"]);
  const [strategy, setStrategy] = useState<Generation["strategy"]>("DUE");
  const generate = useMutation({
    mutationFn: async () => {
      const batch = await api.generate({ count, difficulty, types, strategy });
      startSession(batch);
    },
    onSuccess: () => navigate("/practice/session"),
  });
  return (
    <>
      <Heading
        eyebrow="UN PEU DE PRATIQUE, BEAUCOUP DE PROGRÈS"
        title="À vous de jouer"
      />
      <p className="subtitle">
        Composez une séance à votre rythme. Chaque réponse fait avancer votre
        apprentissage.
      </p>
      {session && (
        <div className="notice">
          <RotateCcw size={20} />
          <span>Une séance est enregistrée sur cet appareil.</span>
          <Link to="/practice/session">Reprendre la séance →</Link>
        </div>
      )}
      <div className="practice-modes" role="group" aria-label="Mode de séance">
        <button
          type="button"
          className={mode === "generate" ? "primary" : "secondary"}
          aria-pressed={mode === "generate"}
          onClick={() => setMode("generate")}
        >
          Nouveaux exercices
        </button>
        <button
          type="button"
          className={mode === "reuse" ? "primary" : "secondary"}
          aria-pressed={mode === "reuse"}
          onClick={() => setMode("reuse")}
        >
          Phrases enregistrées — sans IA
        </button>
      </div>
      {mode === "reuse" ? (
        <ReusePractice />
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (types.length && !generate.isPending) generate.mutate();
          }}
          className="practice-layout"
        >
          <section className="card">
            <span className="step">01</span>
            <h2>Que souhaitez-vous travailler ?</h2>
            <div className="type-grid">
              {Object.entries(exerciseTypes).map(([value, label], i) => (
                <label
                  key={value}
                  className={`type-option ${types.includes(value as Generation["types"][number]) ? "selected" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={types.includes(
                      value as Generation["types"][number],
                    )}
                    onChange={(e) =>
                      setTypes(
                        e.target.checked
                          ? [...types, value as Generation["types"][number]]
                          : types.filter((t) => t !== value),
                      )
                    }
                  />
                  <span>
                    <strong>{label}</strong>
                    <small>
                      {i >= 4
                        ? "OpenAI requis"
                        : "Disponible en génération locale"}
                    </small>
                  </span>
                  {i >= 4 && <Sparkles size={16} />}
                </label>
              ))}
            </div>
            <p className="muted">
              Les exercices avancés nécessitent OpenAI activé sur le serveur.
              Leur disponibilité sera vérifiée lors de la génération.
            </p>
            <span className="step">02</span>
            <h2>Choisissez vos mots</h2>
            <div className="strategy-grid">
              {(
                [
                  {
                    value: "DUE",
                    label: "À réviser",
                    text: "Ancrez vos acquis",
                  },
                  {
                    value: "NEW",
                    label: "Nouveaux mots",
                    text: "Élargissez vos horizons",
                  },
                  {
                    value: "DIFFICULT",
                    label: "Mots difficiles",
                    text: "Surmontez les obstacles",
                  },
                  {
                    value: "RANDOM",
                    label: "Au hasard",
                    text: "Variez les découvertes",
                  },
                ] as const
              ).map((s) => (
                <label
                  key={s.value}
                  className={`strategy ${strategy === s.value ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="strategy"
                    value={s.value}
                    checked={strategy === s.value}
                    onChange={() => setStrategy(s.value)}
                  />
                  <strong>{s.label}</strong>
                  <small>{s.text}</small>
                </label>
              ))}
            </div>
          </section>
          <aside className="card session-config">
            <div className="round-icon">
              <Zap />
            </div>
            <h2>Votre séance</h2>
            <label>
              Nombre d’exercices <strong>{count}</strong>
              <input
                type="range"
                min="1"
                max="20"
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              />
            </label>
            <div className="range-labels">
              <span>1 exercice</span>
              <span>20 exercices</span>
            </div>
            <label>
              Difficulté
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    Niveau {n} / 5
                  </option>
                ))}
              </select>
            </label>
            <p className="muted">
              En mode local, la difficulté est indicative et ne change pas la
              complexité linguistique.
            </p>
            <ErrorNotice error={generate.error} />
            <button
              className="primary full"
              disabled={!types.length || generate.isPending}
            >
              {generate.isPending
                ? "Préparation de la séance…"
                : "Commencer la séance"}
              <ArrowRight size={17} />
            </button>
            {!types.length && (
              <p role="status">Sélectionnez au moins un type.</p>
            )}
            <p className="small muted">
              Une nouvelle séance remplace la sauvegarde locale précédente.
            </p>
          </aside>
        </form>
      )}
    </>
  );
}
