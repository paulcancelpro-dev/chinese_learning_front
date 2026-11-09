import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api/client";
import type { Correction } from "../types/models";
import {
  date,
  Empty,
  ErrorNotice,
  Heading,
  Loading,
  Pagination,
} from "../components/ui";
export function HistoryItem({ correction }: { correction: Correction }) {
  const exercise = useQuery({
    queryKey: ["exercise", correction.exerciseId],
    queryFn: () => api.exercise(correction.exerciseId),
  });
  return (
    <article className="history-item">
      <div
        className={`result-symbol ${correction.correct ? "success" : "error"}`}
      >
        {correction.correct ? "✓" : "×"}
      </div>
      <div className="history-content">
        <h3>
          {exercise.data?.question ||
            (exercise.isError
              ? "Question indisponible"
              : "Chargement de la question…")}
        </h3>
        <p>{correction.acceptedAnswers.join(" · ")}</p>
        {correction.explanation && (
          <p className="muted">{correction.explanation}</p>
        )}
        <span className="small muted">{date(correction.answeredAt)}</span>
      </div>
      <span className={`badge ${correction.correct ? "success" : "warm"}`}>
        {correction.correct ? "Réussi" : "À retravailler"}
      </span>
    </article>
  );
}
export default function History() {
  const [page, setPage] = useState(0);
  const history = useQuery({
    queryKey: ["history", page],
    queryFn: () => api.history(page),
  });
  return (
    <>
      <Heading eyebrow="LES TRACES DE VOTRE APPRENTISSAGE" title="Historique" />
      <p className="subtitle">
        Vos corrections, de la plus récente à la plus ancienne.
      </p>
      <div className="notice">
        Le backend conserve vos résultats mais son API d’historique ne renvoie
        pas le texte de vos réponses. Les réponses saisies restent visibles dans
        le bilan de la séance conservée sur cet appareil.
      </div>
      <ErrorNotice error={history.error} retry={() => void history.refetch()} />
      {history.isPending ? (
        <Loading />
      ) : (
        history.data && (
          <>
            {history.data.content.length ? (
              <section className="card">
                {history.data.content.map((c, i) => (
                  <HistoryItem key={`${c.exerciseId}-${i}`} correction={c} />
                ))}
              </section>
            ) : (
              <Empty>
                <h2>Votre histoire commence ici</h2>
                <p>Terminez un exercice pour retrouver sa correction.</p>
              </Empty>
            )}
            <Pagination
              page={page}
              pages={history.data.totalPages}
              onChange={setPage}
            />
          </>
        )
      )}
    </>
  );
}
