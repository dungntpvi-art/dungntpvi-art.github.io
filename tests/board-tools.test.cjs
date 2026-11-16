// Kiểm tra: link nhanh, làm sạch dữ liệu bài, tìm bài theo mô tả, cảnh báo chạy không kịp, sao lưu
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { JSDOM, VirtualConsole } = require("jsdom");
const html = fs.readFileSync("index.html", "utf8");
const json = (x) => JSON.parse(JSON.stringify(x));
function app() {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errors.push(e.message));
  const testHtml = html
    .replace(
      "/* =================== Routing =================== */",
      "window.__boardTest={sanitizeBoard,packBoard,unpackBoard,searchLib,libIndex,feasIssues,secOf,S,getState:()=>st(),setFmt:(f)=>setFormat(f),store};\n/* =================== Routing =================== */",
    )
    .replace("cloudInit();", "/* cloud mocked */");
  const dom = new JSDOM(testHtml, {
    url: "https://saban.test/",
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(w) {
      w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
      w.confirm = () => true;
      w.TextEncoder = TextEncoder;
      w.TextDecoder = TextDecoder;
    },
  });
  return { w: dom.window, api: dom.window.__boardTest, errors };
}

test("app boots with the new board tools", () => {
  const { api, errors, w } = app();
  assert.deepEqual(errors, []);
  assert(api);
  for (const id of ["#libQ", "#boardFile", "#fullExport", "#trailChk", "#tiltBtn", "#frameSec", "#trails"])
    assert(w.document.querySelector(id), id);
  assert(w.document.querySelector('#expChoices button[data-x="qlink"]'));
});

test("quick link round-trips a board and hides player names", async () => {
  const { api } = app();
  const s = api.getState();
  s.home.players[1].name = "Gia Huy";
  s.frames[0].sec = 4.5;
  const code = await api.packBoard("Bài thử");
  assert.match(code, /^[zj][A-Za-z0-9_-]+$/);
  const b = await api.unpackBoard(code);
  assert.equal(b.name, "Bài thử");
  assert.equal(b.data.frames.length, s.frames.length);
  assert.equal(b.data.frames[0].sec, 4.5);
  assert.equal(b.data.home.players[1].name, "");
  await assert.rejects(api.unpackBoard("jnot-json"));
});

test("shared data is sanitized before drawing", () => {
  const { api } = app();
  const evil = {
    home: { color: 'red" onload="x', players: [{ num: "<b>", name: "<img src=x onerror=1>" }] },
    away: { players: [] },
    pos: { h0: ["0.5", 0.5], ball: [9, 9], "<x>": [0.1, 0.1] },
    dr: [{ t: "script", x1: 0 }, { t: "run", x1: '"><svg', y1: 0, x2: 1, y2: 1 }, { t: "text", x: 0.5, y: 0.5, s: "a".repeat(99), c: "url(javascript:1)" }],
    frames: [{ pos: { h0: [0.2, 0.2] }, dr: [], note: "ok", sec: "abc" }],
  };
  const s = api.sanitizeBoard(evil);
  assert.equal(s.home.color, "#d63a3a");
  assert.equal(s.home.players[0].id, "h0");
  assert.equal(s.frames[0].sec, undefined);
  assert.deepEqual(json(Object.keys(s.frames[0].pos)), ["h0"]);
  const dr = api.sanitizeBoard({ ...evil, frames: [] }).dr;
  assert.deepEqual(json(dr.map((d) => d.t)), ["text"]);
  assert.equal(dr[0].s.length, 40);
  assert.equal(dr[0].c, "#f4f7f2");
  assert.equal(api.sanitizeBoard({ frames: "x" }), null);
});

test("search finds drills from a plain Vietnamese description", () => {
  const { api } = app();
  const items = api.libIndex();
  const names = (q) => api.searchLib(q, items).map((r) => r.x.name);
  assert.match(names("phản công sân 11")[0], /Phản công/);
  assert.match(names("khoi dong dan bong")[0], /zigzag/i);
  assert(names("thủ môn").some((n) => /Thủ môn/.test(n)));
  assert.equal(names("xyz không có").length, 0);
  assert(api.searchLib("sân 7", items).every((r) => r.x.fmt === "7"));
});

test("warns when a player cannot reach the next position in time", () => {
  const { api } = app();
  const s = api.getState();
  while (s.frames.length > 2) s.frames.pop();
  const id = s.home.players[1].id;
  s.frames[1].pos[id] = [s.frames[0].pos[id][0], s.frames[0].pos[id][1]];
  s.frames[0].sec = 3;
  assert.equal(api.feasIssues(s).filter((x) => x.id === id).length, 0);
  s.frames[1].pos[id] = [Math.min(1, s.frames[0].pos[id][0] + 0.9), s.frames[0].pos[id][1]];
  const iss = api.feasIssues(s).filter((x) => x.id === id);
  assert.equal(iss.length, 1);
  assert(iss[0].need > 3);
  s.frames[0].sec = Math.ceil(iss[0].need) + 1;
  assert.equal(api.feasIssues(s).filter((x) => x.id === id).length, 0);
});
