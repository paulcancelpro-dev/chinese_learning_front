import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertCircle, ArrowLeft, ArrowRight, X } from "lucide-react";
export function ErrorNotice({
  error,
  retry,
}: {
  error: Error | null;
  retry?: () => void;
}) {
  return error ? (
    <div className="notice error" role="alert">
      <AlertCircle size={20} />
      <div>
        {error.message}
        {retry && (
          <button className="text-button" onClick={retry}>
            Réessayer
          </button>
        )}
      </div>
    </div>
  ) : null;
}
export function Loading() {
  return (
    <div className="loading" role="status">
      Chargement des données…
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-hanzi" lang="zh">
        学
      </span>
      {children}
    </div>
  );
}
export function Heading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
      </div>
      {children}
    </header>
  );
}
export function Pagination({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (n: number) => void;
}) {
  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        className="secondary"
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
      >
        <ArrowLeft size={16} /> Précédent
      </button>
      <span>
        Page {page + 1} sur {Math.max(1, pages)}
      </span>
      <button
        className="secondary"
        disabled={page + 1 >= pages}
        onClick={() => onChange(page + 1)}
      >
        Suivant <ArrowRight size={16} />
      </button>
    </nav>
  );
}
export function Modal({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal">
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description>{description}</Dialog.Description>
          <Dialog.Close className="icon-button close" aria-label="Fermer">
            <X />
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Level({ level }: { level: number | null }) {
  return (
    <span
      className={`badge ${level === null ? "neutral" : level >= 4 ? "success" : level <= 2 ? "warm" : ""}`}
    >
      {level === null ? "Non évalué" : `Niveau ${level} / 5`}
    </span>
  );
}
export function date(value: string | null) {
  return value
    ? new Date(value).toLocaleString("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";
}
