import { test, expect } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { mkdtemp, copyFile, rm, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

for (const transport of ["file", "isolated-document"]) {
  test(`standalone ${transport}: offline editing and persistence`, async ({
    page,
    context,
  }) => {
    // Copy only this file: no dist/, modules, source files or running app server.
    const directory = await mkdtemp(path.join(os.tmpdir(), "mind standalone "));
    const target = path.join(directory, "MIND.html");
    await copyFile("MIND.html", target);
    const errors = [];
    const remoteRequests = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      if (/^https?:/.test(request.url())) remoteRequests.push(request.url());
    });
    try {
      await context.setOffline(true);
      if (transport === "file") {
        try {
          await page.goto(pathToFileURL(target).href);
        } catch (error) {
          test.skip(
            error.message.includes("ERR_BLOCKED_BY_ADMINISTRATOR"),
            "Cloud Chromium policy blocks file:// navigation; standalone document is tested separately.",
          );
          throw error;
        }
      } else {
        const html = await readFile(target, "utf8");
        // The document is supplied in memory; there is no server or asset access.
        await page.route("**/*", async (route) => {
          if (route.request().url() === "http://127.0.0.1:4173/MIND.html") {
            await route.fulfill({
              status: 200,
              contentType: "text/html",
              body: html,
            });
          } else {
            await route.abort();
          }
        });
        await page.goto("http://127.0.0.1:4173/MIND.html");
      }
      await expect(
        page.getByRole("heading", { name: "Твой второй мозг." }),
      ).toBeVisible();
      await expect(page.locator(".neuron")).toHaveCount(11);
      await page
        .getByRole("button", { name: "Новая заметка", exact: true })
        .click();
      await page
        .getByRole("textbox", { name: "Название заметки" })
        .fill("Из HTML-архива");
      await page
        .getByRole("textbox", { name: "Текст заметки" })
        .fill("Без сервера и интернета");
      await page
        .getByRole("button", { name: "Сохранить", exact: true })
        .click();
      await page.reload();
      await expect(
        page.getByRole("heading", { name: "Из HTML-архива" }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Добавить сферу", exact: true })
        .click();
      await page
        .getByRole("textbox", { name: "Название", exact: true })
        .fill("Архив");
      await page.getByRole("button", { name: "Создать сферу" }).click();
      await expect(page.locator(".neuron")).toHaveCount(12);
      const downloading = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "Экспорт данных", exact: true })
        .click();
      const stream = await (await downloading).createReadStream();
      const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const data = JSON.parse(Buffer.concat(chunks).toString());
      expect(data.notes.some((note) => note.title === "Из HTML-архива")).toBe(
        true,
      );
      await page.setViewportSize({ width: 390, height: 844 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(errors).toEqual([]);
      expect(
        remoteRequests.filter(
          (url) => url !== "http://127.0.0.1:4173/MIND.html",
        ),
      ).toEqual([]);
    } finally {
      await page.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
}
