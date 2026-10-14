import { test, expect } from "@playwright/test";
import { seed, KEY } from "../src/data.js";

const legacy = seed();
legacy.notes.push({
  id: "legacy-note",
  title: "Моя старая заметка",
  body: "До React",
  sphere: "work",
  favorite: true,
  updated: Date.now(),
});

test("preserves legacy data and edits notes through React", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(
    ({ key, data }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(data));
    },
    { key: KEY, data: legacy },
  );
  await page.goto("/");
  await expect(page.locator(".neuron")).toHaveCount(11);
  await page.getByRole("heading", { name: "Моя старая заметка" }).click();
  await expect(
    page.getByRole("textbox", { name: "Текст заметки" }),
  ).toHaveValue("До React");
  await page
    .getByRole("textbox", { name: "Текст заметки" })
    .fill("После React");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await page.reload();
  await expect(page.getByText("После React", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Новая заметка", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Название заметки" })
    .fill("Новая идея");
  await page
    .getByRole("textbox", { name: "Текст заметки" })
    .fill("Заметка из React");
  await page
    .getByRole("button", { name: "Добавить в избранное", exact: true })
    .click();
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("button", { name: /Избранное/ })
    .click();
  await expect(page.getByRole("heading", { name: "Новая идея" })).toBeVisible();
  await page
    .getByRole("textbox", { name: "Поиск заметок" })
    .fill("После React");
  await expect(page.locator(".note-card")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "Моя старая заметка" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("creates a custom sphere, filters its notes, and deletes a note", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Добавить сферу", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Название", exact: true })
    .fill("Путешествия");
  await page.getByRole("button", { name: "Создать сферу" }).click();
  await expect(page.locator(".neuron")).toHaveCount(12);
  await page
    .getByRole("button", { name: "Новая заметка", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Сфера жизни" }),
  ).not.toHaveValue("work");
  await page.getByRole("textbox", { name: "Название заметки" }).fill("Поездка");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(page.locator(".note-card")).toHaveCount(1);
  await page.getByRole("heading", { name: "Поездка" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Удалить заметку", exact: true })
    .click();
  await expect(page.locator(".note-card")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".neuron")).toHaveCount(12);
  await expect(page.getByRole("heading", { name: "Поездка" })).toHaveCount(0);
});

test("imports old backups, exports valid JSON, rejects corrupt backups", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Файл резервной копии")
    .setInputFiles({
      name: "mind.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(legacy)),
    });
  await page
    .getByRole("button", { name: "Заменить данные", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Моя старая заметка" }),
  ).toBeVisible();
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Экспорт данных", exact: true })
    .click();
  const download = await downloading;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  expect(JSON.parse(Buffer.concat(chunks).toString())).toEqual(legacy);
  await page
    .getByLabel("Файл резервной копии")
    .setInputFiles({
      name: "broken.json",
      mimeType: "application/json",
      buffer: Buffer.from('{"version":1}'),
    });
  await expect(page.getByRole("status")).toContainText("Импорт не выполнен");
  await expect(
    page.getByRole("heading", { name: "Моя старая заметка" }),
  ).toBeVisible();
});

test("works offline after loading the production shell", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Новая заметка", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Название заметки" })
    .fill("Офлайн мысль");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", resolve, {
          once: true,
        }),
      );
  });
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Офлайн мысль" }),
  ).toBeVisible();
  await page.getByRole("heading", { name: "Офлайн мысль" }).click();
  await page
    .getByRole("textbox", { name: "Текст заметки" })
    .fill("Без интернета");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await page.reload();
  await expect(page.getByText("Без интернета", { exact: true })).toBeVisible();
});

test("mobile navigation, keyboard dialog close and graph controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".neuron")).toHaveCount(11);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Увеличить", exact: true }).click();
  await expect(page.locator(".graph-controls")).toContainText("110%");
  await page
    .getByRole("button", { name: "Сбросить масштаб", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Развернуть карту", exact: true })
    .click();
  await expect(page.locator(".neural-stage")).toHaveClass(/expanded/);
  await page.keyboard.press("Escape");
  await expect(page.locator(".neural-stage")).not.toHaveClass(/expanded/);
  await page.getByRole("button", { name: "Открыть меню", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Основная навигация" })
    .getByRole("button", { name: /Избранное/ })
    .click();
  await expect(page.locator(".note-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Новая заметка", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("failed storage writes leave the note editor and content intact", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Storage full", "QuotaExceededError");
    };
  });
  await page
    .getByRole("button", { name: "Новая заметка", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Название заметки" })
    .fill("Не потерять");
  await page
    .getByRole("textbox", { name: "Текст заметки" })
    .fill("Очень важная мысль");
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Текст заметки" }),
  ).toHaveValue("Очень важная мысль");
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Сохранить не удалось",
  );
});
