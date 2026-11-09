import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api/client";
import { skills } from "../types/models";
import { date, ErrorNotice, Loading, Pagination } from "../components/ui";
export default function ReviewHistory() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const history = useQuery({
    queryKey: ["review-events"],
    queryFn: api.reviewEvents,
    enabled: open,
  });
  const rows = [...(history.data?.progress || [])]
    .filter((r) =>
      `${r.hanzi} ${r.pinyin}`
        .toLocaleLowerCase()
        .includes(q.toLocaleLowerCase()),
    )
    .sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt));
  return (
    <details
      className="card review-history"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>
        Historique des révisions, y compris les événements importés
      </summary>
      {open && (
        <>
          <p className="muted">
            Événements enregistrés par le serveur, accessibles via l’export de
            progression.
          </p>
          <label>
            Rechercher dans les révisions
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder="Hanzi ou pinyin"
            />
          </label>
          <ErrorNotice
            error={history.error}
            retry={() => void history.refetch()}
          />
          {history.isPending ? (
            <Loading />
          ) : (
            history.data && (
              <>
                {!rows.length ? (
                  <p>Aucune révision dans cette sélection.</p>
                ) : (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Mot</th>
                          <th>Compétence</th>
                          <th>Réponse donnée</th>
                          <th>Résultat</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(page * 20, page * 20 + 20).map((r) => (
                          <tr key={r.id}>
                            <td>
                              <span lang="zh" className="hanzi compact">
                                {r.hanzi}
                              </span>
                              {r.pinyin}
                            </td>
                            <td>{skills[r.skill]}</td>
                            <td>{r.answer || "—"}</td>
                            <td>{r.correct ? "Réussite" : "Erreur"}</td>
                            <td>{date(r.reviewedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <Pagination
                  page={page}
                  pages={Math.ceil(rows.length / 20)}
                  onChange={setPage}
                />
              </>
            )
          )}
        </>
      )}
    </details>
  );
}
