import { useState } from "react";
import { ArrowUpRight, Star, Trash2 } from "lucide-react";
import Modal from "./Modal.jsx";

export default function NoteEditor({
  note,
  spheres,
  defaultSphere,
  onSave,
  onDelete,
  onClose,
}) {
  const [title, setTitle] = useState(note?.title || "");
  const [body, setBody] = useState(note?.body || "");
  const [sphere, setSphere] = useState(
    note?.sphere || defaultSphere || spheres[0].id,
  );
  const [favorite, setFavorite] = useState(note?.favorite || false);
  const [error, setError] = useState("");
  return (
    <Modal
      title={note ? "ТВОЯ МЫСЛЬ" : "НОВАЯ МЫСЛЬ"}
      onClose={onClose}
      className="note-modal"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return setError("Добавь название заметки.");
          const result = onSave({
            id: note?.id || crypto.randomUUID(),
            title: title.trim(),
            body,
            sphere,
            favorite,
            updated: Date.now(),
          });
          if (!result)
            setError(
              "Сохранить не удалось. Текст оставлен здесь — можно скопировать его и попробовать ещё раз.",
            );
        }}
      >
        <div className="editor-meta">
          <label>
            Сфера{" "}
            <select
              aria-label="Сфера жизни"
              value={sphere}
              onChange={(e) => setSphere(e.target.value)}
            >
              {spheres.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={`favorite-toggle ${favorite ? "on" : ""}`}
            aria-label="Добавить в избранное"
            aria-pressed={favorite}
            onClick={() => setFavorite(!favorite)}
          >
            <Star size={18} fill={favorite ? "currentColor" : "none"} />
          </button>
        </div>
        <input
          autoFocus
          className="note-title-input"
          aria-label="Название заметки"
          placeholder="Дай мысли имя…"
          value={title}
          maxLength={160}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          aria-label="Текст заметки"
          placeholder="Здесь можно думать вслух. Запиши идею, план или то, что не хочется забыть."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="editor-footer">
          <span>{body.length} символов · только на устройстве</span>
          <div>
            {note && (
              <button
                type="button"
                className="icon-button danger"
                aria-label="Удалить заметку"
                onClick={() => {
                  if (confirm("Удалить эту заметку?")) onDelete(note.id);
                }}
              >
                <Trash2 size={17} />
              </button>
            )}
            <button className="primary" type="submit">
              Сохранить <ArrowUpRight size={16} />
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
