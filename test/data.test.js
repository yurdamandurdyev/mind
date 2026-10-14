import test from "node:test";
import assert from "node:assert/strict";
import { seed, validate } from "../src/data.js";
test("Initial universe includes 11 spheres and valid editable notes", () => {
  const data = validate(seed());
  assert.equal(data.spheres.length, 11);
  assert.equal(data.notes.length, 3);
});
test("Export/import preserves custom spheres, note content and favorites", () => {
  const data = seed();
  data.spheres.push({
    id: "custom",
    name: "Путешествия",
    color: "#abcdef",
    icon: "✧",
  });
  data.notes.push({
    id: "custom-note",
    title: "Маршрут",
    body: "Первая строка\nВторая строка",
    sphere: "custom",
    favorite: true,
    updated: Date.now(),
  });
  assert.deepEqual(validate(JSON.parse(JSON.stringify(data))), data);
});
test("Import rejects broken references, duplicate IDs and unsafe colors", () => {
  for (const mutate of [
    (d) => (d.notes[0].sphere = "missing"),
    (d) => d.spheres.push(d.spheres[0]),
    (d) => d.notes.push(d.notes[0]),
    (d) => (d.spheres[0].color = "red;display:none"),
    (d) => (d.notes[0].updated = "yesterday"),
  ]) {
    const d = seed();
    mutate(d);
    assert.throws(() => validate(d));
  }
});
