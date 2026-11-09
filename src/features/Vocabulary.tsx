import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Download, Plus, Search, Pencil, Trash2, Upload } from "lucide-react";
import { api, download } from "../lib/api/client";
import { wordSchema, type WordForm } from "../lib/validation";
import type { Word } from "../types/models";
import { skills } from "../types/models";
import {
  Empty,
  ErrorNotice,
  Heading,
  Level,
  Loading,
  Modal,
  Pagination,
} from "../components/ui";
function Editor({
  word,
  close,
  saved,
}: {
  word?: Word;
  close: () => void;
  saved: () => void;
}) {
  const client = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WordForm>({
    resolver: zodResolver(wordSchema),
    defaultValues: {
      hanzi: word?.hanzi ?? "",
      pinyin: word?.pinyin ?? "",
      translations: word?.traductions_fr.join("\n") ?? "",
    },
  });
  const save = useMutation({
    mutationFn: (v: WordForm) =>
      api.saveWord(
        {
          hanzi: v.hanzi,
          pinyin: v.pinyin,
          traductions_fr: v.translations
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
        },
        word?.id,
      ),
    onSuccess: () => {
      void client.invalidateQueries();
      saved();
      close();
    },
  });
  return (
    <Modal
      title={word ? "Modifier le mot" : "Ajouter un mot"}
      description="Une entrée associe les hanzi, leur prononciation et leurs traductions."
      onClose={close}
    >
      <form onSubmit={handleSubmit((v) => save.mutate(v))}>
        <label>
          Hanzi
          <input
            lang="zh"
            aria-invalid={!!errors.hanzi}
            aria-describedby={errors.hanzi ? "hanzi-error" : undefined}
            {...register("hanzi")}
          />
        </label>
        {errors.hanzi && (
          <p id="hanzi-error" role="alert">
            {errors.hanzi.message}
          </p>
        )}
        <label>
          Pinyin
          <input
            aria-invalid={!!errors.pinyin}
            aria-describedby={errors.pinyin ? "pinyin-error" : undefined}
            {...register("pinyin")}
          />
        </label>
        {errors.pinyin && (
          <p id="pinyin-error" role="alert">
            {errors.pinyin.message}
          </p>
        )}
        <label>
          Traductions françaises
          <textarea
            aria-invalid={!!errors.translations}
            aria-describedby={
              errors.translations ? "translations-error" : undefined
            }
            {...register("translations")}
            placeholder="Une traduction par ligne"
          />
        </label>
        {errors.translations && (
          <p id="translations-error" role="alert">
            {errors.translations.message}
          </p>
        )}
        <ErrorNotice error={save.error} />
        <button disabled={save.isPending} className="primary">
          {save.isPending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>
    </Modal>
  );
}
export default function Vocabulary() {
  const [notice, setNotice] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [edit, setEdit] = useState<Word | "new" | null>(null);
  const [remove, setRemove] = useState<Word | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const client = useQueryClient();
  const words = useQuery({
    queryKey: ["vocabulary", q, page],
    queryFn: () => api.vocabulary(q, page),
  });
  const progress = useQuery({ queryKey: ["progress"], queryFn: api.progress });
  const selected = useQuery({
    queryKey: ["word", detail],
    queryFn: () => api.word(detail!),
    enabled: !!detail,
  });
  const deletion = useMutation({
    mutationFn: api.deleteWord,
    onSuccess: () => {
      void client.invalidateQueries();
      setNotice("Le mot et ses données associées ont été supprimés.");
      setRemove(null);
      setPage(0);
    },
  });
  const exporting = useMutation({
    mutationFn: () => download("vocabulary"),
    onSuccess: () =>
      setNotice(
        "Votre fichier de vocabulaire a été préparé pour le téléchargement.",
      ),
  });
  return (
    <>
      <Heading eyebrow="VOTRE COLLECTION" title="Mon vocabulaire">
        <button className="primary" onClick={() => setEdit("new")}>
          <Plus size={18} />
          Ajouter un mot
        </button>
      </Heading>
      <p className="subtitle">
        Des caractères qui deviennent familiers, un mot à la fois.
      </p>
      <div className="toolbar">
        <label className="search">
          <Search size={18} />
          <input
            aria-label="Rechercher un mot"
            placeholder="Rechercher un hanzi, un pinyin, une traduction…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <Link className="secondary" to="/import">
          <Upload size={17} />
          Importer
        </Link>
        <button
          className="secondary"
          disabled={exporting.isPending}
          onClick={() => exporting.mutate()}
        >
          <Download size={17} />
          Exporter
        </button>
      </div>
      {notice && (
        <div role="status" className="notice success">
          {notice}
        </div>
      )}
      <ErrorNotice error={words.error} retry={() => void words.refetch()} />
      <ErrorNotice error={progress.error} />
      <ErrorNotice error={exporting.error} />
      {words.isPending ? (
        <Loading />
      ) : (
        words.data && (
          <>
            <div className="section-label">
              {words.data.totalElements} mots dans votre collection
            </div>
            {!words.data.content.length ? (
              <Empty>
                <h2>Aucun mot pour le moment</h2>
                <p>
                  Ajoutez votre premier mot ou importez votre vocabulaire
                  HelloChinese.
                </p>
                <Link className="primary" to="/import">
                  Importer mon vocabulaire
                </Link>
              </Empty>
            ) : (
              <div className="word-grid">
                {words.data.content.map((word) => (
                  <article className="card word-card" key={word.id}>
                    <div className="word-top">
                      <button
                        className="hanzi word-link"
                        lang="zh"
                        onClick={() => setDetail(word.id)}
                      >
                        {word.hanzi}
                      </button>
                      <div>
                        <button
                          className="icon-button"
                          aria-label={`Modifier ${word.hanzi}`}
                          onClick={() => setEdit(word)}
                        >
                          <Pencil size={17} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`Supprimer ${word.hanzi}`}
                          onClick={() => {
                            deletion.reset();
                            setRemove(word);
                          }}
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>
                    <div className="pinyin">{word.pinyin}</div>
                    <p>{word.traductions_fr.join(" · ")}</p>
                    <div className="word-levels">
                      {progress.data
                        ?.filter((p) => p.wordId === word.id)
                        .map((p) => (
                          <div key={p.skill}>
                            <span>{skills[p.skill]}</span>
                            <Level level={p.level} />
                          </div>
                        ))}
                    </div>
                  </article>
                ))}
              </div>
            )}
            <Pagination
              page={page}
              pages={words.data.totalPages}
              onChange={setPage}
            />
          </>
        )
      )}
      {edit && (
        <Editor
          word={edit === "new" ? undefined : edit}
          saved={() => setNotice("Le mot a été enregistré.")}
          close={() => setEdit(null)}
        />
      )}
      {remove && (
        <Modal
          title={`Supprimer « ${remove.hanzi} » ?`}
          description="Cette action supprime également la progression, les exercices et les événements associés à ce mot."
          onClose={() => setRemove(null)}
        >
          <ErrorNotice error={deletion.error} />
          <div className="actions">
            <button className="secondary" onClick={() => setRemove(null)}>
              Annuler
            </button>
            <button
              className="danger"
              disabled={deletion.isPending}
              onClick={() => deletion.mutate(remove.id)}
            >
              Confirmer la suppression
            </button>
          </div>
        </Modal>
      )}
      {detail && (
        <Modal
          title="Détail du mot"
          description="Vocabulaire enregistré sur le serveur."
          onClose={() => setDetail(null)}
        >
          {selected.isPending && <Loading />}
          <ErrorNotice error={selected.error} />
          {selected.data && (
            <>
              <div className="hanzi" lang="zh">
                {selected.data.hanzi}
              </div>
              <p className="pinyin">{selected.data.pinyin}</p>
              <p>{selected.data.traductions_fr.join(" · ")}</p>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
