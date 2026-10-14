import { useCallback, useEffect, useState } from "react";
import { KEY, seed, validate } from "../data.js";

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return { data: raw ? validate(JSON.parse(raw)) : seed(), error: "" };
  } catch {
    return {
      data: seed(),
      error: "Не удалось прочитать хранилище. Исходные данные не перезаписаны.",
    };
  }
}

export function useUniverse() {
  const [snapshot, setSnapshot] = useState(load);
  const [saveError, setSaveError] = useState("");
  useEffect(() => {
    function sync(event) {
      if (event.key === KEY || event.key === null) setSnapshot(load());
    }
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const update = useCallback(
    (change, { replace = false } = {}) => {
      if (snapshot.error && !replace) {
        setSaveError(snapshot.error);
        return false;
      }
      try {
        // Merge normal edits into the latest stored collection, including other tabs.
        const raw = localStorage.getItem(KEY);
        const current = replace
          ? snapshot.data
          : raw
            ? validate(JSON.parse(raw))
            : snapshot.data;
        const next = validate(
          typeof change === "function" ? change(current) : change,
        );
        localStorage.setItem(KEY, JSON.stringify(next));
        setSnapshot({ data: next, error: "" });
        setSaveError("");
        return true;
      } catch {
        setSaveError(
          "Не удалось сохранить. Проверь доступ к хранилищу и свободное место; сделай резервную копию.",
        );
        return false;
      }
    },
    [snapshot],
  );

  return { data: snapshot.data, update, error: saveError || snapshot.error };
}
