const { chromium } = require("playwright");
const { createServer } = require("node:http");
const { readFileSync, mkdirSync } = require("node:fs");
const assert = require("node:assert/strict");
const server = createServer((req, res) => {
  const path = req.url.split("?")[0];
  try {
    const f = path === "/" ? "index.html" : path.slice(1);
    if (f.includes("..")) throw Error();
    res.setHeader(
      "Content-Type",
      f.endsWith(".html")
        ? "text/html; charset=utf-8"
        : f.endsWith(".js")
          ? "text/javascript"
          : "application/octet-stream",
    );
    res.end(readFileSync(f));
  } catch {
    res.statusCode = 404;
    res.end();
  }
});
(async () => {
  await new Promise((r) => server.listen(8765, "127.0.0.1", r));
  const browser = await chromium.launch({ headless: true });
  try {
    mkdirSync("test-results", { recursive: true });
    for (const viewport of [
      { width: 1366, height: 900 },
      { width: 390, height: 844 },
    ]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage(),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.route("https://**/*", (route) => route.abort());
      await page.goto("http://127.0.0.1:8765");
      await page.locator("#tokens .tok").first().waitFor();
      await page.locator("#challengeCreate").click();
      await page
        .locator("#challengeExplanation")
        .fill("Chạy vào khoảng trống để nhận bóng.");
      await page.locator("#challengeSave").click();
      await page.locator("#challengeTry").click();
      await page.locator("#challengePitch").focus();
      await page.keyboard.press("Enter");
      assert(
        (await page.locator("#challengeFeedback").innerText()).includes(
          "khoảng trống",
        ),
      );
      await page.screenshot({
        path: `test-results/challenge-${viewport.width}.png`,
        fullPage: true,
      });
      await page.locator("#challengeClose").click();
      await page.locator("#fieldMode").click();
      assert(await page.locator("#fieldMode").isVisible());
      await page.screenshot({
        path: `test-results/field-${viewport.width}.png`,
      });
      await page.locator("#fieldMode").click();
      await page.locator('a[href="#huan-luyen"]').click();
      await page
        .locator("#developmentNote")
        .fill("Tự tin chuyền bóng và hỗ trợ bạn.");
      await page.locator("#developmentForm button").first().click();
      await page.locator(".development-entry").waitFor();
      assert(
        (await page.locator("#developmentList").innerText()).includes("Tự tin"),
      );
      await page.screenshot({
        path: `test-results/coaching-${viewport.width}.png`,
        fullPage: true,
      });
      await page.locator('a[href="#tran"]').click();
      await page.locator("#attAll").click();
      await page.locator('a[href="#huan-luyen"]').click();
      await page.locator("#balancedBtn").click();
      assert.equal(await page.locator(".coach-team").count(), 2);
      await page.locator("[data-move]").first().selectOption("1");
      page.once("dialog", (d) => d.accept());
      await page.locator("#quickPlanForm button").click();
      await page.locator("#pTotal").waitFor();
      assert.equal(await page.locator("#pTotal").innerText(), "Tổng: 60 phút");
      await page.reload();
      assert.equal(await page.locator("#pTotal").innerText(), "Tổng: 60 phút");
      assert.deepEqual(errors, []);
      console.log(`Browser interactions passed at ${viewport.width}px`);
      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  server.close();
  process.exitCode = 1;
});
