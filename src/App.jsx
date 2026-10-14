import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowUpRight,
  AudioLines,
  Brain,
  Check,
  ChevronRight,
  CircleHelp,
  Expand,
  FileText,
  FolderOpen,
  Heart,
  LayoutGrid,
  Menu,
  Minus,
  Network,
  Play,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  X,
} from "lucide-react";
import { validate } from "./data.js";
import { useUniverse } from "./hooks/useUniverse.js";
import BrainGraph from "./components/BrainGraph.jsx";
import NoteEditor from "./components/NoteEditor.jsx";
import Modal from "./components/Modal.jsx";

const sphereIcons = {
  work: FolderOpen,
  health: Heart,
  projects: LayoutGrid,
  goals: Target,
  growth: Sparkles,
};
function SphereIcon({ id, size = 16 }) {
  const Icon = sphereIcons[id] || Network;
  return <Icon size={size} strokeWidth={1.6} />;
}
const date = (value) =>
  new Date(value).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });

export default function App() {
  const { data, update, error } = useUniverse();
  const [mode, setMode] = useState("graph");
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState(null);
  const [sphereModal, setSphereModal] = useState(false);
  const [sphereName, setSphereName] = useState("");
  const [sphereColor, setSphereColor] = useState("#d9ed92");
  const [sphereError, setSphereError] = useState("");
  const [toast, setToast] = useState("");
  const [zoom, setZoom] = useState(1);
  const [paused, setPaused] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [help, setHelp] = useState(false);
  const [pendingImport, setPendingImport] = useState(null);
  const importRef = useRef(null);
  const searchRef = useRef(null);
  const selectedSphere = data.spheres.find((s) => s.id === selected);
  const notes = useMemo(
    () =>
      data.notes
        .filter(
          (n) =>
            (!selected || n.sphere === selected) &&
            (mode !== "favorites" || n.favorite) &&
            `${n.title} ${n.body}`
              .toLocaleLowerCase()
              .includes(query.toLocaleLowerCase()),
        )
        .sort((a, b) => b.updated - a.updated),
    [data, selected, mode, query],
  );
  const sphereNotes = selected
    ? data.notes.filter((n) => n.sphere === selected)
    : data.notes;
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3600);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    function keyboard(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setExpanded(false);
        setMobileMenu(false);
      }
    }
    document.addEventListener("keydown", keyboard);
    return () => document.removeEventListener("keydown", keyboard);
  }, []);
  useEffect(() => {
    if (selected && !data.spheres.some((s) => s.id === selected))
      setSelected(null);
  }, [data.spheres, selected]);

  function navigate(next) {
    setMode(next);
    setSelected(null);
    setQuery("");
    setMobileMenu(false);
  }
  function selectSphere(id) {
    setSelected((current) => (current === id ? null : id));
    setMode("graph");
    setMobileMenu(false);
  }
  function createNote() {
    setEditor({ note: null });
  }
  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mind-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast("Резервная копия скачана");
  }
  async function importFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      if (file.size > 20_000_000)
        throw Error("Максимальный размер файла — 20 МБ");
      setPendingImport(validate(JSON.parse(await file.text())));
    } catch (reason) {
      setToast(`Импорт не выполнен: ${reason.message}`);
    }
  }
  function saveNote(note) {
    const ok = update((current) => ({
      ...current,
      notes: current.notes.some((n) => n.id === note.id)
        ? current.notes.map((n) => (n.id === note.id ? note : n))
        : [...current.notes, note],
    }));
    if (ok) {
      setEditor(null);
      setToast("Мысль сохранена на устройстве");
    }
    return ok;
  }
  function newSphere(e) {
    e.preventDefault();
    const name = sphereName.trim();
    if (!name) return setSphereError("Введи название сферы.");
    if (
      data.spheres.some(
        (s) => s.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
      )
    )
      return setSphereError("Сфера с таким названием уже есть.");
    if (data.spheres.length >= 100)
      return setSphereError("Можно создать до 100 сфер.");
    const sphere = {
      id: crypto.randomUUID(),
      name,
      color: sphereColor,
      icon: "✧",
    };
    if (
      update((current) => ({
        ...current,
        spheres: [...current.spheres, sphere],
      }))
    ) {
      setSphereModal(false);
      setSphereName("");
      setSphereError("");
      selectSphere(sphere.id);
      setToast("Новая сфера появилась на карте");
    } else
      setSphereError(
        "Не удалось сохранить сферу. Проверь локальное хранилище.",
      );
  }
  const openSphereModal = () => {
    setSphereError("");
    setSphereModal(true);
  };

  return (
    <div className="app-shell">
      {mobileMenu && (
        <button
          className="sidebar-scrim"
          aria-label="Закрыть меню"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <aside className={`sidebar ${mobileMenu ? "open" : ""}`}>
        <button
          className="brand"
          onClick={() => navigate("graph")}
          aria-label="MIND — главная"
        >
          <span className="brand-mark">
            <Brain size={23} />
          </span>
          <span>
            mind<span className="brand-period">.</span>
          </span>
          <small>PERSONAL SPACE</small>
        </button>
        <div className="space-switch">
          <span className="user-avatar">Я</span>
          <div>
            Моё пространство<small>Место быть собой</small>
          </div>
          <ChevronRight size={14} />
        </div>
        <span className="sidebar-label">ОБЗОР</span>
        <nav className="main-nav" aria-label="Основная навигация">
          <button
            className={mode === "graph" && !selected ? "active" : ""}
            onClick={() => navigate("graph")}
          >
            <Network size={17} /> Нейронная карта{" "}
            <span className="nav-indicator" />
          </button>
          <button
            className={mode === "all" ? "active" : ""}
            onClick={() => navigate("all")}
          >
            <FileText size={17} /> Все заметки{" "}
            <small>{data.notes.length}</small>
          </button>
          <button
            className={mode === "favorites" ? "active" : ""}
            onClick={() => navigate("favorites")}
          >
            <Star size={17} /> Избранное{" "}
            <small>{data.notes.filter((n) => n.favorite).length}</small>
          </button>
        </nav>
        <div className="sidebar-label sphere-label">
          СФЕРЫ ЖИЗНИ
          <button aria-label="Добавить сферу" onClick={openSphereModal}>
            <Plus size={15} />
          </button>
        </div>
        <nav className="sphere-list" aria-label="Сферы жизни">
          {data.spheres.map((s) => (
            <button
              key={s.id}
              className={selected === s.id ? "active" : ""}
              onClick={() => selectSphere(s.id)}
              style={{ "--sphere": s.color }}
            >
              <i />
              <span>{s.name}</span>
              <small>
                {data.notes
                  .filter((n) => n.sphere === s.id)
                  .length.toString()
                  .padStart(2, "0")}
              </small>
            </button>
          ))}
        </nav>
        <button className="add-sphere" onClick={openSphereModal}>
          <Plus size={14} /> Добавить свою сферу
        </button>
        <div className="local-card">
          <ShieldCheck size={19} />
          <strong>Только твоё.</strong>
          <p>
            Мысли остаются на устройстве.
            <br />
            Твоё пространство — твои правила.
          </p>
          <div>
            <button aria-label="Экспорт данных" onClick={exportData}>
              <ArrowDownToLine size={13} /> Экспорт
            </button>
            <button
              aria-label="Импорт данных"
              onClick={() => importRef.current.click()}
            >
              <ArrowUpFromLine size={13} /> Импорт
            </button>
          </div>
        </div>
        <button className="help-button" onClick={() => setHelp(true)}>
          <CircleHelp size={15} /> О пространстве <span>v.02</span>
        </button>
      </aside>

      <main>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="Открыть меню"
              onClick={() => setMobileMenu(true)}
            >
              <Menu size={20} />
            </button>
            <span>Моё пространство</span>
            <ChevronRight size={12} />
            <strong>
              {mode === "graph"
                ? "Нейронная карта"
                : mode === "favorites"
                  ? "Избранное"
                  : "Все заметки"}
            </strong>
          </div>
          <div className="topbar-right">
            <span className={`save-status ${error ? "error" : ""}`}>
              {error ? <CircleHelp size={13} /> : <Check size={13} />}
              {error ? "Ошибка сохранения" : "Локальное пространство"}
            </span>
            <span className="user-avatar small">Я</span>
          </div>
        </header>
        {error && (
          <div className="storage-error" role="alert">
            {error}
          </div>
        )}
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              <span /> МЫСЛИ. СВЯЗИ. ТЫ.
            </div>
            <h1>
              {mode === "graph" ? (
                <>
                  Твой второй <em>мозг.</em>
                </>
              ) : mode === "favorites" ? (
                <>
                  Сохрани <em>важное.</em>
                </>
              ) : (
                <>
                  Всё, о чём <em>думаешь.</em>
                </>
              )}
            </h1>
            <p>
              {mode === "graph"
                ? "У каждой мысли есть место. У каждой связи — смысл."
                : "Идеи, планы и маленькие открытия. В одном пространстве."}
            </p>
          </div>
          <button className="primary new-note" onClick={createNote}>
            <Plus size={17} /> Новая заметка
          </button>
        </div>

        <div
          className={`workspace-grid ${mode !== "graph" ? "notes-only" : ""}`}
        >
          <section
            className={`neural-stage ${expanded ? "expanded" : ""}`}
            hidden={mode !== "graph"}
            aria-label="Нейронная карта"
          >
            <div className="stage-heading">
              <span>
                <i /> NEURAL SPACE <small>01</small>
              </span>
              <button
                className="stage-mode"
                onClick={() => setPaused(!paused)}
                aria-label={
                  paused ? "Включить анимацию" : "Приостановить анимацию"
                }
              >
                {paused ? <Play size={12} /> : <AudioLines size={12} />}
                {paused ? "Пауза" : "Живая карта"}
              </button>
            </div>
            <div className="stage-coordinate">
              YOUR INNER UNIVERSE <span>↘</span>
            </div>
            <BrainGraph
              spheres={data.spheres}
              selected={selected}
              onSelect={selectSphere}
              zoom={zoom}
              paused={paused}
            >
              <div className="brain-floor">
                <span />
                <span />
                <span />
              </div>
              <div className="brain-caption">
                <span className="tiny-cross">+</span>{" "}
                {selectedSphere
                  ? selectedSphere.name.toLocaleUpperCase()
                  : "ВСЁ НАЧИНАЕТСЯ С ОДНОЙ МЫСЛИ"}{" "}
                <span className="tiny-cross">+</span>
              </div>
            </BrainGraph>
            <div className="graph-instruction">
              <span className="mouse-symbol" /> Выбери нейрон, чтобы открыть
              сферу
            </div>
            <div className="stage-bottom">
              <div className="stage-stats">
                <span>
                  <b>{data.spheres.length.toString().padStart(2, "0")}</b> сфер
                  жизни
                </span>
                <i />
                <span>
                  <b>{data.notes.length.toString().padStart(2, "0")}</b> заметок
                </span>
              </div>
              <div className="graph-controls">
                <button
                  aria-label="Уменьшить"
                  onClick={() => setZoom((z) => Math.max(0.65, z - 0.1))}
                >
                  <Minus size={14} />
                </button>
                <span>{Math.round(zoom * 100)}%</span>
                <button
                  aria-label="Увеличить"
                  onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}
                >
                  <Plus size={14} />
                </button>
                <button
                  aria-label="Сбросить масштаб"
                  onClick={() => setZoom(1)}
                >
                  <RotateCcw size={13} />
                </button>
                <button
                  aria-label={expanded ? "Свернуть карту" : "Развернуть карту"}
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? <X size={14} /> : <Expand size={14} />}
                </button>
              </div>
            </div>
          </section>

          <aside className="insight-panel" hidden={mode !== "graph"}>
            <div className="insight-top">
              <span>В ФОКУСЕ</span>
              <span className="live-label">
                <i /> СЕЙЧАС
              </span>
            </div>
            <div
              className="focus-symbol"
              style={{ "--focus-color": selectedSphere?.color || "#dcea9c" }}
            >
              {selectedSphere ? (
                <SphereIcon id={selectedSphere.id} size={29} />
              ) : (
                <Brain size={32} strokeWidth={1.2} />
              )}
            </div>
            <h2>{selectedSphere?.name || "Всё — часть тебя."}</h2>
            <p className="focus-description">
              {selectedSphere
                ? "Собери здесь мысли, которые помогают этой части жизни расти."
                : "Работа, мечты, привычки и идеи. Не отдельные списки, а одна живая система."}
            </p>
            <div className="focus-divider" />
            <div className="focus-count">
              <span>Мыслей в {selectedSphere ? "сфере" : "пространстве"}</span>
              <strong>{sphereNotes.length.toString().padStart(2, "0")}</strong>
            </div>
            <div className="focus-count">
              <span>В избранном</span>
              <strong>
                {sphereNotes
                  .filter((n) => n.favorite)
                  .length.toString()
                  .padStart(2, "0")}
              </strong>
            </div>
            <button className="outline-button" onClick={createNote}>
              <Plus size={14} /> Добавить мысль <ArrowUpRight size={14} />
            </button>
            <div className="thought-prompt">
              <Sparkles size={17} />
              <span>ВОПРОС ДЛЯ СЕБЯ</span>
              <p>
                {selectedSphere
                  ? `Что я могу сделать для сферы «${selectedSphere.name}» уже сегодня?`
                  : "Какая маленькая мысль сегодня может стать чем-то большим?"}
              </p>
              <button onClick={() => setEditor({ note: null })}>
                Записать ответ <ArrowUpRight size={13} />
              </button>
            </div>
            <div className="insight-foot">
              <span /> Пространство растёт вместе с тобой
            </div>
          </aside>
        </div>

        <section className="notes-section" aria-label="Заметки">
          <div className="notes-heading">
            <div>
              <h2>
                {selectedSphere
                  ? selectedSphere.name
                  : mode === "favorites"
                    ? "Избранные мысли"
                    : mode === "all"
                      ? "Все заметки"
                      : "Последние мысли"}
              </h2>
              <span className="count-pill">{notes.length}</span>
              {selected && (
                <button
                  className="clear-filter"
                  onClick={() => setSelected(null)}
                  aria-label="Сбросить фильтр"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <label className="search">
              <Search size={15} />
              <input
                ref={searchRef}
                aria-label="Поиск заметок"
                placeholder="Найти мысль…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <kbd>⌘ K</kbd>
            </label>
          </div>
          <div className="notes-grid">
            {notes.map((n) => {
              const sphere = data.spheres.find((s) => s.id === n.sphere);
              return (
                <button
                  className="note-card"
                  key={n.id}
                  onClick={() => setEditor({ note: n })}
                  style={{ "--sphere": sphere.color }}
                >
                  <div className="note-card-top">
                    <span className="note-badge">
                      <SphereIcon id={sphere.id} size={12} />
                      {sphere.name}
                    </span>
                    {n.favorite ? (
                      <Star size={13} className="note-star" />
                    ) : (
                      <ArrowUpRight size={15} className="note-arrow" />
                    )}
                  </div>
                  <h3>{n.title}</h3>
                  <p>{n.body || "Место для твоих мыслей…"}</p>
                  <div className="note-card-footer">
                    <span>{date(n.updated)}</span>
                    <span>
                      <FileText size={11} /> Заметка
                    </span>
                  </div>
                </button>
              );
            })}
            {!notes.length && (
              <div className="empty-state">
                <Sparkles size={26} />
                <h3>
                  {query
                    ? "Эта мысль пока не нашлась"
                    : "Здесь начинается что-то новое"}
                </h3>
                <p>
                  {query
                    ? "Попробуй другие слова или сбрось фильтр."
                    : "Не нужно идеальных слов. Начни с одной строки."}
                </p>
                {!query && (
                  <button className="outline-button" onClick={createNote}>
                    <Plus size={15} /> Первая заметка
                  </button>
                )}
              </div>
            )}
            {mode === "graph" &&
              !query &&
              notes.length > 0 &&
              notes.length < 4 && (
                <button className="new-note-card" onClick={createNote}>
                  <span>
                    <Plus size={20} />
                  </span>
                  <strong>Освободи место в голове</strong>
                  <small>Сохрани новую мысль</small>
                </button>
              )}
          </div>
        </section>
        <footer>
          <span>Меньше шума. Больше смысла.</span>
          <span>
            MADE FOR YOUR MIND <span className="footer-spark">✧</span>
          </span>
        </footer>
      </main>
      <input
        ref={importRef}
        hidden
        type="file"
        accept="application/json,.json"
        onChange={importFile}
        aria-label="Файл резервной копии"
      />
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
      {editor && (
        <NoteEditor
          note={editor.note}
          spheres={data.spheres}
          defaultSphere={selected}
          onSave={saveNote}
          onClose={() => setEditor(null)}
          onDelete={(id) => {
            if (
              update((current) => ({
                ...current,
                notes: current.notes.filter((n) => n.id !== id),
              }))
            ) {
              setEditor(null);
              setToast("Заметка удалена");
            }
          }}
        />
      )}
      {sphereModal && (
        <Modal title="НОВАЯ СФЕРА ЖИЗНИ" onClose={() => setSphereModal(false)}>
          <form className="sphere-form" onSubmit={newSphere}>
            <h2>
              Твоё пространство.
              <br />
              Твои правила.
            </h2>
            <p>Добавь то, что важно именно тебе.</p>
            <label>
              Название
              <input
                autoFocus
                value={sphereName}
                onChange={(e) => setSphereName(e.target.value)}
                maxLength={32}
                required
                placeholder="Например, путешествия"
              />
            </label>
            <label>
              Цвет нейрона
              <div className="color-picker">
                <input
                  aria-label="Цвет нейрона"
                  type="color"
                  value={sphereColor}
                  onChange={(e) => setSphereColor(e.target.value)}
                />
                <span>{sphereColor}</span>
              </div>
            </label>
            {sphereError && (
              <p className="form-error" role="alert">
                {sphereError}
              </p>
            )}
            <button type="submit" className="primary">
              Создать сферу <Plus size={16} />
            </button>
          </form>
        </Modal>
      )}
      {pendingImport && (
        <Modal
          title="ВОССТАНОВЛЕНИЕ КОПИИ"
          onClose={() => setPendingImport(null)}
        >
          <div className="info-content">
            <h2>Вернуть свои мысли</h2>
            <p>
              В копии {pendingImport.notes.length} заметок и{" "}
              {pendingImport.spheres.length} сфер. Импорт заменит текущую
              коллекцию. Сначала сохрани её, если она ещё нужна.
            </p>
            <div className="import-actions">
              <button className="outline-button" onClick={exportData}>
                Скачать текущую копию
              </button>
              <button
                className="primary"
                onClick={() => {
                  if (update(pendingImport, { replace: true })) {
                    setPendingImport(null);
                    setSelected(null);
                    setQuery("");
                    setToast("Данные восстановлены");
                  }
                }}
              >
                Заменить данные
              </button>
            </div>
            {error && <p role="alert">{error}</p>}
          </div>
        </Modal>
      )}
      {help && (
        <Modal title="ТВОЁ ЛИЧНОЕ ПРОСТРАНСТВО" onClose={() => setHelp(false)}>
          <div className="info-content">
            <h2>Только ты и твои мысли.</h2>
            <p>
              Заметки хранятся в этом браузере, на этом устройстве. Очистка
              данных сайта удалит их. Экспортируй JSON-копии для резервного
              хранения и переноса на телефон или компьютер.
            </p>
            <p>
              Карта показывает сферы жизни. Линии — визуализация нейронной сети;
              ручные связи между заметками пока не добавлены.
            </p>
            <p>
              После первой загрузки production-версии приложение доступно
              офлайн. Установка на домашний экран зависит от браузера и требует
              HTTPS либо localhost.
            </p>
            <button className="primary" onClick={exportData}>
              <ArrowDownToLine size={15} /> Сделать резервную копию
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
