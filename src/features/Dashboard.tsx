import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  CheckCheck,
  Clock3,
  Sprout,
  Target,
  Upload,
  Zap,
} from "lucide-react";
import { api } from "../lib/api/client";
import type { Daily, Overview } from "../types/models";
import { Empty, ErrorNotice, Heading, Loading } from "../components/ui";
import { HistoryItem } from "./History";
import { ProgressRows } from "./Progress";
export function Metrics({ data }: { data: Overview }) {
  return (
    <div className="stats-grid">
      {[
        {
          label: "Mots dans ma collection",
          value: data.words,
          icon: BookOpen,
          note: "Votre vocabulaire personnel",
        },
        {
          label: "Compétences évaluées",
          value: data.evaluatedSkills,
          icon: Target,
          note: "Reconnaissance, pinyin, sens",
        },
        {
          label: "Compétences maîtrisées",
          value: data.masteredSkills,
          icon: CheckCheck,
          note: "Niveaux 4 et 5",
        },
        {
          label: "Compétences à réviser",
          value: data.dueSkills,
          icon: Clock3,
          note: "Dont les non évaluées",
        },
      ].map(({ label, value, icon: Icon, note }) => (
        <article className="card metric" key={label}>
          <div className="metric-top">
            <span>{label}</span>
            <Icon size={20} />
          </div>
          <strong>{value.toLocaleString("fr-FR")}</strong>
          <small>{note}</small>
        </article>
      ))}
    </div>
  );
}
export function RevisionChart({ days }: { days: Daily[] }) {
  const max = Math.max(1, ...days.flatMap((d) => [d.completed, d.due]));
  return (
    <section className="card chart-card">
      <div className="section-header">
        <div>
          <h2>Votre rythme de révision</h2>
          <p className="muted small">
            Révisions effectuées et prévues · jours UTC
          </p>
        </div>
        <div className="legend">
          <span>
            <i />
            Effectuées
          </span>
          <span>
            <i />
            Prévues
          </span>
        </div>
      </div>
      {!days.length ? (
        <p className="empty-chart">Aucune donnée de révision disponible.</p>
      ) : (
        <>
          <div
            className="chart"
            role="img"
            aria-label={`Révisions quotidiennes du ${days[0].date} au ${days[days.length - 1].date}. Valeurs exactes disponibles dans le tableau ci-dessous.`}
          >
            {days.map((day, i) => (
              <div
                className="chart-day"
                key={day.date}
                title={`${day.date} UTC : ${day.completed} effectuées, ${day.due} prévues`}
              >
                <div className="bars">
                  <div style={{ height: `${(day.completed / max) * 100}%` }} />
                  <div style={{ height: `${(day.due / max) * 100}%` }} />
                </div>
                <span>
                  {i % 7 === 0 || i === days.length - 1
                    ? day.date.slice(8) + "/" + day.date.slice(5, 7)
                    : ""}
                </span>
              </div>
            ))}
          </div>
          <details>
            <summary>Voir les valeurs quotidiennes</summary>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date UTC</th>
                    <th>Effectuées</th>
                    <th>Prévues</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map((d) => (
                    <tr key={d.date}>
                      <td>{d.date}</td>
                      <td>{d.completed}</td>
                      <td>{d.due}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
export default function Dashboard({
  statistics = false,
}: {
  statistics?: boolean;
}) {
  const overview = useQuery({ queryKey: ["overview"], queryFn: api.overview });
  const revisions = useQuery({
    queryKey: ["revisions"],
    queryFn: api.revisions,
  });
  const history = useQuery({
    queryKey: ["history", 0],
    queryFn: () => api.history(0),
    enabled: !statistics,
  });
  const weak = useQuery({ queryKey: ["weak"], queryFn: api.weak });
  const progress = useQuery({ queryKey: ["progress"], queryFn: api.progress });
  const evaluatedWords = new Set(
    progress.data?.filter((p) => p.level !== null).map((p) => p.wordId),
  ).size;
  const mastery = new Map<string, boolean>();
  progress.data?.forEach((p) =>
    mastery.set(
      p.wordId,
      (mastery.get(p.wordId) ?? true) && p.level !== null && p.level >= 4,
    ),
  );
  const masteredWords = [...mastery.values()].filter(Boolean).length;
  const rate =
    overview.data && overview.data.answers
      ? Math.round((overview.data.successes / overview.data.answers) * 100)
      : null;
  return (
    <>
      <Heading
        eyebrow={
          statistics
            ? "VOTRE PARCOURS EN CHIFFRES"
            : "UN NOUVEAU JOUR POUR APPRENDRE"
        }
        title={statistics ? "Mes statistiques" : "Bonjour, prêt à progresser ?"}
      >
        <Link className="secondary" to="/import">
          <Upload size={17} />
          Importer du vocabulaire
        </Link>
      </Heading>
      <p className="subtitle">
        {statistics
          ? "Des données réelles pour comprendre votre apprentissage."
          : "Cultivez votre mandarin. Un caractère, une découverte, un jour à la fois."}
      </p>
      {!statistics && (
        <section className="hero-banner">
          <div>
            <span className="hero-label">
              <span /> VOTRE MOMENT MANDARIN
            </span>
            <h2>
              De petits pas.
              <br />
              De grandes découvertes.
            </h2>
            <p>
              Quelques minutes de pratique pour transformer
              <br className="desktop-break" /> vos nouveaux mots en
              connaissances durables.
            </p>
            <Link to="/practice" className="primary">
              Commencer un entraînement
              <ArrowRight size={18} />
            </Link>
          </div>
          <div className="hanzi-art" aria-hidden="true">
            <div className="orbit one" />
            <div className="orbit two" />
            <div className="character">
              学<span>xué · apprendre</span>
            </div>
            <span className="stamp">
              每日
              <br />
              进步
            </span>
            <span className="art-note">L’apprentissage se cultive.</span>
          </div>
        </section>
      )}
      <ErrorNotice
        error={overview.error}
        retry={() => void overview.refetch()}
      />
      {overview.isPending ? (
        <Loading />
      ) : (
        overview.data && (
          <>
            <Metrics data={overview.data} />
            {overview.data.words === 0 && (
              <div className="notice">
                <Sprout />
                <div>
                  <strong>Bienvenue dans votre espace d’apprentissage.</strong>
                  <p>
                    Importez vos premiers mots pour démarrer votre parcours.
                  </p>
                </div>
                <Link to="/import">Importer →</Link>
              </div>
            )}
          </>
        )
      )}
      <div className="dashboard-grid">
        <div>
          <ErrorNotice
            error={revisions.error}
            retry={() => void revisions.refetch()}
          />
          {revisions.isPending ? (
            <Loading />
          ) : (
            revisions.data && <RevisionChart days={revisions.data} />
          )}
        </div>
        <section className="card success-card">
          <div className="section-header">
            <h2>Vos acquis</h2>
            <Sprout size={21} />
          </div>
          <div
            className="rate-ring"
            style={{ "--rate": `${rate ?? 0}%` } as React.CSSProperties}
          >
            <div>
              <strong>{rate === null ? "—" : `${rate}%`}</strong>
              <span>de réussite</span>
            </div>
          </div>
          <p className="muted small">
            {overview.data
              ? `${overview.data.successes} bonnes réponses sur ${overview.data.answers}`
              : "Données indisponibles"}
          </p>
          <ErrorNotice error={progress.error} />
          {progress.data && (
            <div className="acquired">
              <div>
                <span>Mots évalués</span>
                <strong>{evaluatedWords}</strong>
              </div>
              <div>
                <span>Mots maîtrisés*</span>
                <strong>{masteredWords}</strong>
              </div>
              <small>
                *Toutes les compétences retournées au niveau 4 ou 5.
              </small>
            </div>
          )}
        </section>
      </div>
      {statistics ? (
        <section className="card">
          <h2>Compétences à renforcer</h2>
          <ErrorNotice error={weak.error} retry={() => void weak.refetch()} />
          {weak.isPending ? (
            <Loading />
          ) : weak.data?.length ? (
            <>
              <ProgressRows rows={weak.data.slice(0, 20)} />
              {weak.data.length > 20 && (
                <Link to="/progress">
                  Voir toutes les compétences dans la progression →
                </Link>
              )}
            </>
          ) : (
            <p>Aucune compétence difficile retournée par le serveur.</p>
          )}
        </section>
      ) : (
        <div className="dashboard-grid">
          <section className="card">
            <div className="section-header">
              <h2>Votre activité récente</h2>
              <Link to="/history">Tout voir →</Link>
            </div>
            <ErrorNotice error={history.error} />
            {history.isPending ? (
              <Loading />
            ) : history.data?.content.length ? (
              history.data.content
                .slice(0, 3)
                .map((c, i) => (
                  <HistoryItem key={`${c.exerciseId}-${i}`} correction={c} />
                ))
            ) : (
              <Empty>
                <p>Vos prochaines réponses écriront la suite.</p>
              </Empty>
            )}
          </section>
          <section className="card daily-tip">
            <div className="round-icon">
              <Zap size={21} />
            </div>
            <span className="eyebrow">LE CONSEIL DU JOUR</span>
            <h2>
              La régularité fait
              <br />
              la différence.
            </h2>
            <p>
              Mieux vaut quelques mots chaque jour qu’une longue séance de temps
              en temps. Revenez sur les caractères qui vous résistent.
            </p>
            <Link to="/progress">
              Explorer ma progression <ArrowRight size={16} />
            </Link>
          </section>
        </div>
      )}
      <p className="small muted">
        L’API fournit l’activité de révision, mais pas d’historique des niveaux
        de maîtrise. Aucune courbe d’évolution des niveaux n’est inventée.
      </p>
    </>
  );
}
