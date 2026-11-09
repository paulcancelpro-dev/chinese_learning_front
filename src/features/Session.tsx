import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { api, ApiError } from "../lib/api/client";
import { exerciseTypes, type Exercise, type Correction } from "../types/models";
import { Empty, ErrorNotice, Heading } from "../components/ui";
import {
  clearPending,
  getStorageWarning,
  markPending,
  saveCorrection,
  setSession,
  updateAnswer,
  useSession,
} from "./session-store";
export function CorrectionPanel({ correction }: { correction: Correction }) {
  return (
    <section
      className={`correction ${correction.correct ? "success" : "error"}`}
      role="status"
    >
      <h2>
        {correction.correct ? <CheckCircle2 /> : <XCircle />}
        {correction.correct ? "Bien joué !" : "Une occasion d’apprendre"}
      </h2>
      <p>
        <strong>Réponses acceptées : </strong>
        {correction.acceptedAnswers.join(" · ")}
      </p>
      <p>{correction.explanation}</p>
    </section>
  );
}
function Question({ exercise }: { exercise: Exercise }) {
  const session = useSession()!;
  const client = useQueryClient();
  const navigate = useNavigate();
  const locked = useRef(false);
  const [conflict, setConflict] = useState(false);
  const id = exercise.id;
  const correction = session.corrections[id];
  const answer = session.answers[id] || "";
  const uncertain = session.pending[id];
  const send = useMutation({
    mutationFn: async () => {
      const value = uncertain ?? answer;
      markPending(id, value);
      return api.answer(id, value);
    },
    onSuccess: (result) => {
      saveCorrection(id, result);
      void client.invalidateQueries();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        setConflict(true);
        clearPending(id);
      } else if (
        error instanceof ApiError &&
        error.status >= 400 &&
        error.status < 500
      )
        clearPending(id);
    },
    onSettled: () => {
      locked.current = false;
    },
  });
  const isLast = session.index === session.exercises.length - 1;
  return (
    <>
      <div className="exercise-meta">
        <span>{exerciseTypes[exercise.type]}</span>
        <span>Niveau {exercise.difficulty}</span>
      </div>
      <section className="card question-card">
        <p className="eyebrow">
          {exercise.type === "HANZI_TO_FRENCH"
            ? "QUE SIGNIFIENT CES CARACTÈRES ?"
            : exercise.type === "HANZI_TO_PINYIN"
              ? "COMMENT SE PRONONCENT CES CARACTÈRES ?"
              : "À VOUS DE RÉPONDRE"}
        </p>
        <h1
          lang="zh"
          className={`question ${exercise.question.length > 30 ? "long" : ""}`}
        >
          {exercise.question}
        </h1>
        {exercise.newVocabulary.length > 0 && (
          <p className="muted">
            Vocabulaire de la phrase : {exercise.newVocabulary.join(" · ")}
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!locked.current && !correction && !conflict && answer.trim()) {
              locked.current = true;
              send.mutate();
            }
          }}
        >
          <fieldset
            disabled={
              send.isPending ||
              !!correction ||
              conflict ||
              uncertain !== undefined
            }
          >
            <legend className="sr-only">Votre réponse</legend>
            {exercise.type === "MULTIPLE_CHOICE" ? (
              <div className="choices">
                {exercise.choices.map((choice, i) => (
                  <label
                    className={`choice ${answer === choice ? "selected" : ""}`}
                    key={`${choice}-${i}`}
                  >
                    <input
                      type="radio"
                      name="answer"
                      value={choice}
                      checked={answer === choice}
                      onChange={() => updateAnswer(id, choice)}
                    />
                    <span className="choice-letter">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {choice}
                  </label>
                ))}
              </div>
            ) : (
              <label className="answer-label">
                Votre réponse
                {exercise.type === "SENTENCE_TRANSLATION" ||
                exercise.type === "FILL_IN_THE_BLANK" ? (
                  <textarea
                    autoFocus
                    maxLength={2000}
                    value={answer}
                    onChange={(e) => updateAnswer(id, e.target.value)}
                    placeholder="Écrivez votre réponse…"
                  />
                ) : (
                  <input
                    autoFocus
                    autoComplete="off"
                    maxLength={2000}
                    value={answer}
                    onChange={(e) => updateAnswer(id, e.target.value)}
                    placeholder={
                      exercise.type === "HANZI_TO_PINYIN"
                        ? "Pinyin avec les tons…"
                        : "Écrivez votre réponse…"
                    }
                  />
                )}
              </label>
            )}
          </fieldset>
          <ErrorNotice error={send.error} />
          {uncertain !== undefined && !send.isPending && !conflict && (
            <p className="notice">
              L’enregistrement n’a pas été confirmé. Réessayez avec la même
              réponse : le serveur ne la comptera qu’une fois.
            </p>
          )}
          {conflict && (
            <div className="notice error">
              Cet exercice a déjà reçu une autre réponse. Consultez l’historique
              pour sa correction.<Link to="/history">Voir l’historique</Link>
            </div>
          )}
          {!correction && !conflict && (
            <button
              className="primary full"
              disabled={send.isPending || !answer.trim()}
            >
              {send.isPending
                ? "Vérification…"
                : uncertain !== undefined
                  ? "Réessayer la même réponse"
                  : "Valider ma réponse"}
              <ArrowRight size={18} />
            </button>
          )}
        </form>
      </section>
      {correction && (
        <>
          <CorrectionPanel correction={correction} />
          <button
            className="primary next"
            onClick={() => {
              if (isLast) navigate("/practice/results");
              else setSession({ ...session, index: session.index + 1 });
            }}
          >
            {isLast ? "Voir mes résultats" : "Question suivante"}
            <ArrowRight size={18} />
          </button>
        </>
      )}
      {conflict && (
        <button
          className="secondary"
          onClick={() =>
            isLast
              ? navigate("/practice/results")
              : setSession({ ...session, index: session.index + 1 })
          }
        >
          Continuer sans résultat local pour cet exercice
        </button>
      )}
    </>
  );
}
export default function SessionPage() {
  const session = useSession();
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (
        session &&
        Object.keys(session.corrections).length < session.exercises.length
      )
        event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [session]);
  if (!session)
    return (
      <Empty>
        <h1>Aucune séance à reprendre</h1>
        <p>
          Les données de la séance ne sont pas disponibles sur cet appareil.
        </p>
        <Link className="primary" to="/practice">
          Configurer une séance
        </Link>
      </Empty>
    );
  return (
    <div className="session-page">
      {getStorageWarning() && (
        <div role="alert" className="notice error">
          {getStorageWarning()}
        </div>
      )}
      <div className="session-top">
        <Link to="/practice">← Quitter et conserver la séance</Link>
        <span>
          Question {session.index + 1} / {session.exercises.length}
        </span>
      </div>
      <progress
        aria-label="Progression de la séance"
        max={session.exercises.length}
        value={Object.keys(session.corrections).length}
      />
      <p className="source">
        Génération :{" "}
        {(
          {
            local: "locale",
            openai: "OpenAI",
            local_fallback: "secours local",
          } as Record<string, string>
        )[session.source] || session.source}
      </p>
      <Question
        key={session.exercises[session.index].id}
        exercise={session.exercises[session.index]}
      />
    </div>
  );
}
export function Results() {
  const session = useSession();
  if (!session)
    return (
      <Empty>
        <h1>Aucun résultat de séance disponible</h1>
        <Link to="/history">Consulter l’historique enregistré</Link>
      </Empty>
    );
  const corrections = Object.values(session.corrections);
  const correct = corrections.filter((c) => c.correct).length;
  return (
    <>
      <Heading eyebrow="CHAQUE PAS COMPTE" title="Votre bilan de séance">
        <Link className="primary" to="/practice">
          Nouvel entraînement
          <ArrowRight size={17} />
        </Link>
      </Heading>
      <div className="results-banner">
        <span lang="zh">加油</span>
        <div>
          <h2>
            {corrections.length === session.exercises.length
              ? "Séance terminée. Bravo pour votre régularité !"
              : "Bilan des réponses enregistrées localement"}
          </h2>
          <p>
            Une bonne réponse renforce vos acquis. La maîtrise reste calculée
            par le serveur.
          </p>
        </div>
      </div>
      <div className="stats-grid">
        <div className="card metric">
          <span>Bonnes réponses</span>
          <strong>{correct}</strong>
        </div>
        <div className="card metric">
          <span>Erreurs</span>
          <strong>{corrections.length - correct}</strong>
        </div>
        <div className="card metric">
          <span>Taux de réussite</span>
          <strong>
            {corrections.length
              ? Math.round((correct / corrections.length) * 100) + "%"
              : "—"}
          </strong>
        </div>
        <div className="card metric">
          <span>Réponses corrigées</span>
          <strong>
            {corrections.length} / {session.exercises.length}
          </strong>
        </div>
      </div>
      <h2>Vos exercices et corrections</h2>
      {session.exercises.map((exercise, i) => (
        <article className="card result-card" key={exercise.id}>
          <div className="section-label">
            Exercice {i + 1} · {exerciseTypes[exercise.type]}
          </div>
          <h3 lang="zh">{exercise.question}</h3>
          <p>Votre réponse : {session.answers[exercise.id] || "—"}</p>
          {session.corrections[exercise.id] ? (
            <CorrectionPanel correction={session.corrections[exercise.id]} />
          ) : (
            <p>
              Correction non disponible localement.{" "}
              <Link to="/history">Consulter l’historique</Link>
            </p>
          )}
        </article>
      ))}
      <div className="card">
        <h2>À retravailler</h2>
        {session.exercises
          .filter((e) => session.corrections[e.id]?.correct === false)
          .map((e) => (
            <p key={e.id}>
              {e.question} →{" "}
              {session.corrections[e.id].acceptedAnswers.join(" · ")}
            </p>
          ))}
        {corrections.every((c) => c.correct) && (
          <p>Aucune erreur parmi les réponses corrigées.</p>
        )}
        <Link to="/progress">Voir ma progression réelle →</Link>
      </div>
    </>
  );
}
