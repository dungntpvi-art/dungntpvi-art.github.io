const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { JSDOM, VirtualConsole } = require("jsdom");
const html = fs.readFileSync("index.html", "utf8");
function app() {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errors.push(e.message));
  const testHtml = html
    .replace(
      "/* =================== Boot =================== */",
      `window.__coachTest={balancedTeams,quickPlanDraft,publicBoardState,challengeHit,trainingSync,renderTraining,renderBalanced,saveDevelopment,showChallenge,validChallenge,coachWritable,CT,CLOUD,S,teamList,store,getState:()=>st(),getPlan:()=>plan,getTeams:()=>CT.teams,reset:()=>{CLOUD.team=null;CLOUD.user=null;CLOUD.role='none';readOnly=false;trainingSync();},parent:()=>{CLOUD.user={uid:'parent1'};CLOUD.role='viewer';CLOUD.team='team1';readOnly=false;},publicView:()=>{readOnly=true;},setChallenge:()=>{st().challenge={frame:0,player:'h1',target:[.7,.5],question:'Chạy vào đâu?',explanation:'Tìm khoảng trống'};updateChallengeButtons();}};\n/* =================== Boot =================== */`,
    )
    .replace("cloudInit();", "/* Cloud is explicitly mocked in DOM tests. */");
  const dom = new JSDOM(testHtml, {
    url: "https://saban.test/",
    runScripts: "dangerously",
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(w) {
      w.matchMedia = () => ({
        matches: false,
        addEventListener() {},
        removeEventListener() {},
      });
      w.confirm = () => true;
      w.TextEncoder = TextEncoder;
    },
  });
  return { dom, w: dom.window, api: dom.window.__coachTest, errors };
}
const click = (w, id) => w.document.querySelector(id).click();
const json = (x) => JSON.parse(JSON.stringify(x));
test("app boots and local coaching tools are ready", () => {
  const { dom, api, errors } = app();
  try {
    assert.deepEqual(errors, []);
    assert(api);
    assert.equal(api.CT.ready, true);
  } finally {
    dom.window.close();
  }
});
test("balanced teams preserve every player, capacity and goalkeeper distribution", () => {
  const { dom, api } = app();
  try {
    for (let size = 2; size <= 30; size++)
      for (let n = 2; n <= Math.min(size, 4); n++) {
        const players = Array.from({ length: size }, (_, i) => ({
            key: "p" + i,
            gk: i < n,
          })),
          profiles = Object.fromEntries(
            players.map((p, i) => [
              p.key,
              { skill: (i % 5) + 1, position: p.gk ? "gk" : "middle" },
            ]),
          );
        const teams = api.balancedTeams(players, profiles, n);
        assert.equal(new Set(teams.flat().map((p) => p.key)).size, size);
        assert.equal(teams.flat().length, size);
        assert(
          Math.max(...teams.map((t) => t.length)) -
            Math.min(...teams.map((t) => t.length)) <=
            1,
        );
        assert(teams.every((t) => t.some((p) => p.gk)));
      }
  } finally {
    dom.window.close();
  }
});
test("quick plans use matching saved lessons and total exact requested minutes", () => {
  const { dom, api } = app();
  try {
    for (const minutes of [20, 37, 60, 90, 120]) {
      const p = api.quickPlanDraft(10, minutes, "pass", [
        { ref: "saved:one", name: "Chuyền theo cặp" },
        { ref: "drill:two", name: "Chạy nhanh" },
      ]);
      assert.equal(
        p.blocks.reduce((n, b) => n + b.min, 0),
        minutes,
      );
      assert.equal(p.blocks[1].ref, "saved:one");
      assert(p.blocks.every((b) => b.min > 0));
    }
  } finally {
    dom.window.close();
  }
});
test("public board removes roster names without mutating private original and retains challenge", () => {
  const { dom, api } = app();
  try {
    const s = {
      home: {
        players: [{ name: "Bé An", num: 1 }],
        bench: [{ name: "Bé Bình" }],
      },
      away: { players: [{ name: "Bé C" }], bench: [] },
      challenge: { question: "Chạy ở đâu?" },
    };
    const p = api.publicBoardState(s);
    assert.equal(p.home.players[0].name, "");
    assert.equal(p.home.bench[0].name, "");
    assert.equal(p.away.players[0].name, "");
    assert.equal(s.home.players[0].name, "Bé An");
    assert.equal(p.challenge.question, s.challenge.question);
  } finally {
    dom.window.close();
  }
});
test("coach authors a question, learner answers with keyboard, and retry clears the reveal", () => {
  const { dom, w, api, errors } = app();
  try {
    click(w, "#challengeCreate");
    w.document.querySelector("#challengeExplanation").value =
      "Chạy vào khoảng trống";
    click(w, "#challengeSave");
    assert(api.validChallenge(api.getState().challenge));
    click(w, "#challengeTry");
    const pitch = w.document.querySelector("#challengePitch");
    pitch.dispatchEvent(
      new w.KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    assert(
      w.document
        .querySelector("#challengeFeedback")
        .textContent.includes("Chạy vào khoảng trống"),
    );
    click(w, "#challengeRetry");
    assert.equal(
      w.document.querySelector("#challengeFeedback").textContent,
      "",
    );
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});
test("local development persists, replaces same-day assessment and escapes notes", async () => {
  const { dom, w, api } = app();
  try {
    w.document.querySelector("#developmentNote").value =
      "<img src=x onerror=alert(1)>";
    await api.saveDevelopment(true);
    assert.equal(api.CT.development.length, 1);
    assert.equal(api.CT.development[0].entries.length, 1);
    assert.equal(w.document.querySelector("#developmentList img"), null);
    w.document.querySelector("#developmentNote").value = "Buổi cập nhật";
    await api.saveDevelopment(true);
    assert.equal(api.CT.development[0].entries.length, 1);
    assert.equal(api.CT.development[0].entries[0].note, "Buổi cập nhật");
    assert(w.localStorage.getItem("sbct.coaching.local.v1"));
  } finally {
    dom.window.close();
  }
});
test("parent switch clears private local state and cannot write or see coach controls", () => {
  const { dom, w, api } = app();
  try {
    api.CT.development = [{ name: "Private child", entries: [] }];
    api.CT.profiles = { secret: { skill: 5 } };
    api.parent();
    api.trainingSync();
    assert.equal(api.coachWritable(), false);
    assert.equal(api.CT.development.length, 0);
    assert.equal(Object.keys(api.CT.profiles).length, 0);
    assert.equal(w.document.querySelector("#coachTools").hidden, true);
    assert.equal(w.document.querySelector("#developmentForm").hidden, true);
  } finally {
    dom.window.close();
  }
});
test("public viewers cannot author or open local lessons", () => {
  const { dom, w, api } = app();
  try {
    api.publicView();
    api.trainingSync();
    assert.equal(api.coachWritable(), false);
    assert.equal(w.document.querySelector("#fieldLessonSelect").hidden, true);
  } finally {
    dom.window.close();
  }
});
test("field session has an accessible exit and restores regular toolbar", () => {
  const { dom, w } = app();
  try {
    click(w, "#fieldMode");
    assert(w.document.body.classList.contains("field-session"));
    assert(w.document.querySelector("#boardStage .frames #fieldMode"));
    click(w, "#fieldMode");
    assert(!w.document.body.classList.contains("field-session"));
    assert(w.document.querySelector("#boardStage .toolbar #fieldMode"));
  } finally {
    dom.window.close();
  }
});
