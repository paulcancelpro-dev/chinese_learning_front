import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileJson, Upload, CheckCircle2, Download } from "lucide-react";
import { api, download } from "../lib/api/client";
import { parseImport } from "../lib/validation";
import { ErrorNotice, Heading } from "../components/ui";
export default function ImportPage() {
  const [kind, setKind] = useState<"vocabulary" | "progress">("vocabulary");
  const [file, setFile] = useState<{
    name: string;
    size: number;
    data: unknown;
  } | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const sequence = useRef(0);
  const client = useQueryClient();
  const importing = useMutation({
    mutationFn: () => api.import(kind, file!.data),
    onSuccess: () => {
      void client.invalidateQueries();
      setFile(null);
      setConfirmed(false);
    },
  });
  const exporting = useMutation({ mutationFn: () => download("progress") });
  async function select(selected?: File) {
    const token = ++sequence.current;
    setFile(null);
    setConfirmed(false);
    setError(null);
    importing.reset();
    if (!selected) return;
    try {
      const data = parseImport(selected.name, await selected.text());
      if (token === sequence.current)
        setFile({ name: selected.name, size: selected.size, data });
    } catch (e) {
      if (token === sequence.current) setError(e as Error);
    }
  }
  return (
    <>
      <Heading
        eyebrow="VOS DONNÉES, VOTRE PARCOURS"
        title="Importer mes données"
      />
      <p className="subtitle">
        Retrouvez vos mots et poursuivez votre apprentissage ici.
      </p>
      <div className="import-layout">
        <section className="card">
          <div className="tabs">
            {(["vocabulary", "progress"] as const).map((k) => (
              <button
                disabled={importing.isPending}
                className={kind === k ? "active" : ""}
                key={k}
                onClick={() => {
                  setKind(k);
                  void select();
                }}
              >
                {k === "vocabulary" ? "Vocabulaire" : "Progression"}
              </button>
            ))}
          </div>
          <h2>
            {kind === "vocabulary"
              ? "Votre vocabulaire HelloChinese"
              : "Votre historique de progression"}
          </h2>
          <p className="muted">
            {kind === "vocabulary"
              ? "Importez un tableau de mots ou une enveloppe « vocabulary »."
              : "Importez des événements de révision, après avoir importé les mots correspondants."}
          </p>
          <div
            className="dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (!importing.isPending) void select(e.dataTransfer.files[0]);
            }}
          >
            <Upload size={30} />
            <h3>Glissez votre fichier JSON ici</h3>
            <p>ou choisissez un fichier sur votre appareil</p>
            <input
              ref={input}
              type="file"
              accept=".json,application/json"
              aria-label="Fichier JSON"
              disabled={importing.isPending}
              onChange={(e) => void select(e.target.files?.[0])}
            />
          </div>
          <ErrorNotice error={error || importing.error} />
          {file && (
            <div className="file-preview">
              <FileJson />
              <div>
                <strong>{file.name}</strong>
                <p>{(file.size / 1024).toFixed(1)} Ko · JSON valide</p>
              </div>
            </div>
          )}
          {file && (
            <>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                Je confirme l’import de ce fichier dans ma base de données.
              </label>
              <button
                className="primary"
                disabled={!confirmed || importing.isPending}
                onClick={() => importing.mutate()}
              >
                {importing.isPending ? "Importation…" : "Confirmer l’import"}
              </button>
            </>
          )}
          {importing.data && (
            <div className="notice success" role="status">
              <CheckCircle2 />
              <div>
                <strong>Import terminé</strong>
                {Object.entries(importing.data).map(([key, value]) => (
                  <p key={key}>
                    {(
                      {
                        created: "Entrées créées",
                        merged: "Entrées fusionnées",
                        ignored: "Entrées ignorées",
                      } as Record<string, string>
                    )[key] || key}{" "}
                    : {value}
                  </p>
                ))}
              </div>
            </div>
          )}
        </section>
        <aside>
          <div className="card tip">
            <span className="eyebrow">BON À SAVOIR</span>
            <h2>
              Un nouveau départ,
              <br />
              sans repartir de zéro.
            </h2>
            <p>
              Le contenu est transmis tel quel au serveur. Les doublons de
              vocabulaire sont fusionnés ; les événements déjà importés sont
              ignorés.
            </p>
            <p>
              Un fichier de progression doit contenir des événements datés, pas
              uniquement des niveaux de maîtrise.
            </p>
            <p>
              Le serveur valide tout le fichier avant l’enregistrement. Une
              erreur annule l’ensemble de l’import.
            </p>
          </div>
          <button
            className="secondary full"
            disabled={exporting.isPending}
            onClick={() => exporting.mutate()}
          >
            <Download size={17} />
            Exporter ma progression
          </button>
          <ErrorNotice error={exporting.error} />
        </aside>
      </div>
    </>
  );
}
