import { test, expect } from "@playwright/test";
import { BRAIN_OUTLINE } from "../src/components/brainGeometry.js";
import { KEY, seed } from "../src/data.js";

async function labelsOutsideBrain(page) {
  return page.evaluate((outline) => {
    const svg = document.querySelector(".brain-scene");
    const inverse = svg.getScreenCTM().inverse();
    const path = new Path2D(outline);
    const ctx = document.createElement("canvas").getContext("2d");
    const contains = (point) => ctx.isPointInPath(path, point.x, point.y);
    return [...document.querySelectorAll(".brain-scene .neuron-label")]
      .filter((label) => {
        const r = label.getBoundingClientRect();
        return [
          [r.left, r.top],
          [r.right, r.top],
          [r.left, r.bottom],
          [r.right, r.bottom],
        ].some(
          ([x, y]) => !contains(new DOMPoint(x, y).matrixTransform(inverse)),
        );
      })
      .map((label) => label.textContent);
  }, BRAIN_OUTLINE);
}

test("all labels stay inside brain tissue on desktop, phone, and zoomed views", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".neuron")).toHaveCount(11);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect.poll(() => labelsOutsideBrain(page)).toEqual([]);
    await page.getByRole("button", { name: "Увеличить", exact: true }).click();
    await expect.poll(() => labelsOutsideBrain(page)).toEqual([]);
    await page
      .getByRole("button", { name: "Сбросить масштаб", exact: true })
      .click();
  }
  for (const node of await page.locator(".neuron").all()) {
    await node.click();
    await expect(node).toHaveAttribute("aria-pressed", "true");
  }
});

test("many custom spheres paginate without overlapping labels or leaving the brain", async ({
  page,
}) => {
  const data = seed();
  for (let i = data.spheres.length; i < 100; i++)
    data.spheres.push({
      id: `custom-${i}`,
      name: `Длинное название своей сферы ${i}`,
      color: "#aaccee",
      icon: "✧",
    });
  await page.addInitScript(
    ({ key, data }) => localStorage.setItem(key, JSON.stringify(data)),
    { key: KEY, data },
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.setViewportSize({ width: 390, height: 844 });
  const found = new Set();
  for (let i = 0; i < 9; i++) {
    await expect(page.locator(".brain-pagination")).toContainText(
      `${i + 1} / 9`,
    );
    await expect.poll(() => labelsOutsideBrain(page)).toEqual([]);
    for (const label of await page
      .locator(".neuron")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("aria-label")),
      ))
      found.add(label);
    if (i < 8)
      await page
        .getByRole("button", { name: "Следующие сферы", exact: true })
        .click();
  }
  expect(found.size).toBe(100);
  await expect(
    page.getByRole("button", { name: "Следующие сферы", exact: true }),
  ).toBeDisabled();
});

test("animation pauses explicitly, when hidden, and for reduced motion", async ({
  page,
}) => {
  await page.goto("/");
  const impulse = page.locator(".neural-impulse").first();
  await expect(impulse).toHaveCSS("animation-play-state", "running");
  await page
    .getByRole("button", { name: "Приостановить анимацию", exact: true })
    .click();
  await expect(impulse).toHaveCSS("animation-play-state", "paused");
  await page
    .getByRole("button", { name: "Включить анимацию", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("button", { name: /Все заметки/ })
    .click();
  await expect(impulse).toHaveCSS("animation-play-state", "paused");
  await page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("button", { name: /Нейронная карта/ })
    .click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(impulse).toHaveCSS("animation-name", "none");
});

test("every fiber bundle and category link has live moving light, and pause freezes it", async ({
  page,
}) => {
  await page.goto("/");
  const bundles = page.locator(".fiber-bundle");
  await expect(bundles).toHaveCount(12);
  for (const bundle of await bundles.all()) {
    await expect(bundle.locator(".fiber-halo")).toHaveCount(1);
    await expect(bundle.locator(".fiber-thread")).toHaveCount(1);
    await expect(bundle.locator(".fiber-current")).toHaveCSS(
      "animation-play-state",
      "running",
    );
    await expect(bundle.locator(".fiber-sway")).toHaveCSS(
      "animation-play-state",
      "running",
    );
  }
  await expect(page.locator(".brain-connections .neural-impulse")).toHaveCount(
    11,
  );
  const pulse = page.locator(".fiber-current").first();
  const offset = await pulse.evaluate(
    (el) => getComputedStyle(el).strokeDashoffset,
  );
  await expect
    .poll(() => pulse.evaluate((el) => getComputedStyle(el).strokeDashoffset))
    .not.toBe(offset);
  const sway = page.locator(".fiber-sway").first();
  const transform = await sway.evaluate((el) => getComputedStyle(el).transform);
  await expect
    .poll(() => sway.evaluate((el) => getComputedStyle(el).transform))
    .not.toBe(transform);
  await page
    .getByRole("button", { name: "Приостановить анимацию", exact: true })
    .click();
  const animations = page.locator(
    ".fiber-sway, .neural-impulse, .neuron-flare",
  );
  expect(
    await animations.evaluateAll((elements) =>
      elements.every(
        (el) => getComputedStyle(el).animationPlayState === "paused",
      ),
    ),
  ).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await animations.evaluateAll((elements) =>
      elements.every((el) => getComputedStyle(el).animationName === "none"),
    ),
  ).toBe(true);
});
