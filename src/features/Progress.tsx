import { useState } from "react";
import ReviewHistory from "./ReviewHistory";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api/client";
import { skills, type Progress } from "../types/models";
import {
  date,
  Empty,
  ErrorNotice,
  Heading,
  Level,
  Loading,
  Pagination,
} from "../components/ui";
export function WordName({ id }: { id: string }) {
  const word = useQuery({
    queryKey: ["word", id],
    queryFn: () => api.word(id),
  });
  return word.data ? (
    <>
      <span className="hanzi compact" lang="zh">
        {word.data.hanzi}
      </span>
      <span className="pinyin">{word.data.pinyin}</span>
    </>
  ) : (
    <span>{word.isError ? "Mot indisponible" : "Chargement du mot…"}</span>
  );
}
export function ProgressRows({ rows }: { rows: Progress[] }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Mot</th>
            <th>Compétence</th>
            <th>Maîtrise</th>
            <th>Réussites / erreurs</th>
            <th>Dernière révision</th>
            <th>Prochaine révision</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={`${p.wordId}-${p.skill}`}>
              <td>
                <WordName id={p.wordId} />
              </td>
              <td>{skills[p.skill]}</td>
              <td>
                <Level level={p.level} />
              </td>
              <td>
                <span className="green-text">{p.successes}</span> / {p.errors}
              </td>
              <td>{date(p.lastReview)}</td>
              <td>{p.level === null ? "À découvrir" : date(p.nextReview)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export default function ProgressPage() {
  const [filter, setFilter] = useState("all");
  const [skill, setSkill] = useState("all");
  const [page, setPage] = useState(0);
  const progress = useQuery({ queryKey: ["progress"], queryFn: api.progress });
  const due = useQuery({ queryKey: ["due"], queryFn: api.due });
  const rows =
    (filter === "due" ? due.data : progress.data)?.filter(
      (p) =>
        (skill === "all" || p.skill === skill) &&
        (filter === "new"
          ? p.level === null
          : filter === "weak"
            ? p.level !== null && p.level <= 2
            : filter === "mastered"
              ? p.level !== null && p.level >= 4
              : true),
    ) || [];
  return (
    <>
      <Heading eyebrow="VOS ACQUIS PRENNENT RACINE" title="Ma progression">
        <Link className="primary" to="/practice">
          Réviser mes mots →
        </Link>
      </Heading>
      <p className="subtitle">
        Une vue par mot et par compétence, fidèle à votre apprentissage.
      </p>
      <div className="toolbar">
        <label>
          Afficher
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(0);
            }}
          >
            <option value="all">Toutes les compétences</option>
            <option value="due">À réviser</option>
            <option value="new">Non évaluées</option>
            <option value="weak">Difficiles (niveaux 0–2)</option>
            <option value="mastered">Maîtrisées (niveaux 4–5)</option>
          </select>
        </label>
        <label>
          Compétence
          <select
            value={skill}
            onChange={(e) => {
              setSkill(e.target.value);
              setPage(0);
            }}
          >
            <option value="all">Toutes</option>
            {Object.entries(skills).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ErrorNotice
        error={progress.error || due.error}
        retry={() => {
          void progress.refetch();
          void due.refetch();
        }}
      />
      {progress.isPending || (filter === "due" && due.isPending) ? (
        <Loading />
      ) : !rows.length ? (
        <Empty>
          <h2>Aucune compétence dans cette sélection</h2>
          <p>Importez des mots ou ajustez les filtres pour commencer.</p>
        </Empty>
      ) : (
        <section className="card table-card">
          <div className="section-label">{rows.length} compétences</div>
          <ProgressRows rows={rows.slice(page * 20, page * 20 + 20)} />
          <Pagination
            page={page}
            pages={Math.ceil(rows.length / 20)}
            onChange={setPage}
          />
        </section>
      )}
      <p className="muted small">
        « Non évalué » est différent du niveau 0. Les niveaux sont fournis par
        le serveur. L’écriture est réservée aux évolutions du backend et
        n’apparaît pas dans sa liste actuelle.
      </p>
      <ReviewHistory />
      <Link to="/history">Consulter l’historique des exercices →</Link>
    </>
  );
}
