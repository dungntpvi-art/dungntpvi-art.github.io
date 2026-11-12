const { test, before, after } = require("node:test");
const { readFileSync } = require("node:fs");
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require("@firebase/rules-unit-testing");
const {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  updateDoc,
  writeBatch,
} = require("firebase/firestore");
let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-sa-ban-coaching",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    for (const [uid, role] of Object.entries({
      coach: "coach",
      assistant: "assistant",
      parent1: "viewer",
      parent2: "viewer",
      other: "coach",
      pending: "pending",
    }))
      await setDoc(doc(db, "users", uid), { role, name: uid });
    await setDoc(doc(db, "teams", "team1"), {
      members: ["coach", "assistant", "parent1", "parent2"],
    });
    await setDoc(doc(db, "teams", "team2"), { members: ["other"] });
    await setDoc(doc(db, "teams", "team1", "development", "kid1"), {
      kid: "An",
      name: "An",
      guardianUids: ["parent1"],
      entries: [],
      updatedBy: "coach",
    });
    await setDoc(doc(db, "teams", "team1", "development", "kid2"), {
      kid: "Bình",
      name: "Bình",
      guardianUids: ["parent2"],
      entries: [],
      updatedBy: "coach",
    });
    await setDoc(doc(db, "teams", "team1", "scouting", "kid1"), {
      kid: "An",
      skill: 3,
      position: "middle",
    });
  });
});
after(async () => {
  await env?.cleanup();
});
const db = (uid) => env.authenticatedContext(uid).firestore();
const progress = (uid, id = "kid1") =>
  doc(db(uid), "teams", "team1", "development", id);
test("assigned parent can read own child but cannot read another child", async () => {
  await assertSucceeds(getDoc(progress("parent1")));
  await assertFails(getDoc(progress("parent1", "kid2")));
});
test("parent query must filter by authenticated UID", async () => {
  await assertSucceeds(
    getDocs(
      query(
        collection(db("parent1"), "teams", "team1", "development"),
        where("guardianUids", "array-contains", "parent1"),
      ),
    ),
  );
  await assertFails(
    getDocs(collection(db("parent1"), "teams", "team1", "development")),
  );
});
test("parents cannot grant themselves access or change progress", async () => {
  await assertFails(
    updateDoc(progress("parent2"), { guardianUids: ["parent2"] }),
  );
  await assertFails(updateDoc(progress("parent1"), { entries: [] }));
});
test("parents cannot read private skill assessments", async () => {
  await assertFails(
    getDoc(doc(db("parent1"), "teams", "team1", "scouting", "kid1")),
  );
});
test("coach and assistant can read team progress and private skill assessments", async () => {
  for (const uid of ["coach", "assistant"]) {
    await assertSucceeds(getDoc(progress(uid)));
    await assertSucceeds(
      getDoc(doc(db(uid), "teams", "team1", "scouting", "kid1")),
    );
  }
});
test("coach can write a valid progress record and assign approved team members", async () => {
  await assertSucceeds(
    setDoc(progress("coach", "new"), {
      kid: "C",
      name: "C",
      guardianUids: ["parent1"],
      entries: [
        { date: "2026-11-12", ball: 3, team: 4, spirit: 4, note: "Có tiến bộ" },
      ],
      updatedBy: "coach",
    }),
  );
});
test("coach cannot assign an outsider or add arbitrary private fields", async () => {
  await assertFails(updateDoc(progress("coach"), { guardianUids: ["other"] }));
  await assertFails(updateDoc(progress("coach"), { secret: "unexpected" }));
});
test("other-team coach, pending user and signed-out visitor cannot read child notes", async () => {
  for (const uid of ["other", "pending"])
    await assertFails(getDoc(progress(uid)));
  await assertFails(
    getDoc(
      doc(
        env.unauthenticatedContext().firestore(),
        "teams",
        "team1",
        "development",
        "kid1",
      ),
    ),
  );
});
test("removing a parent from the team revokes progress access", async () => {
  await env.withSecurityRulesDisabled(async (c) =>
    updateDoc(doc(c.firestore(), "teams", "team1"), {
      members: ["coach", "assistant", "parent2"],
    }),
  );
  await assertFails(getDoc(progress("parent1")));
});

test('one person can be coach in A and viewer in B without cross-team writes',async()=>{
 await env.withSecurityRulesDisabled(async c=>{const d=c.firestore();await setDoc(doc(d,'teams','A'),{members:['coach','parent2']});await setDoc(doc(d,'teams','B'),{members:['coach','parent2']});await setDoc(doc(d,'teams','A','permissions','coach'),{role:'coach'});await setDoc(doc(d,'teams','B','permissions','coach'),{role:'viewer'});});
 await assertSucceeds(setDoc(doc(db('coach'),'teams','A','data','sample'),{data:'ok'}));
 await assertFails(setDoc(doc(db('coach'),'teams','B','data','sample'),{data:'forbidden'}));
 await assertSucceeds(setDoc(doc(db('coach'),'teams','A','permissions','parent2'),{role:'assistant'}));
 await assertFails(updateDoc(doc(db('coach'),'users','parent2'),{role:'assistant'}));
 await assertSucceeds(setDoc(doc(db('parent2'),'teams','A','data','sample'),{data:'assistant allowed'}));
 await assertFails(setDoc(doc(db('parent2'),'teams','B','data','sample'),{data:'still viewer'}));
});
test('assistant cannot manage members, change team grants or make themselves coach',async()=>{
 await assertFails(updateDoc(doc(db('assistant'),'teams','team1'),{members:['assistant']}));
 await assertFails(setDoc(doc(db('assistant'),'teams','team1','permissions','assistant'),{role:'coach'}));
 await assertFails(setDoc(doc(db('assistant'),'teams','team1','permissions','parent2'),{role:'assistant'}));
});
test('coach approval grants pending user only a team role atomically',async()=>{
 await env.withSecurityRulesDisabled(async c=>setDoc(doc(c.firestore(),'teams','A','requests','pending'),{code:'CODE'}));
 const d=db('coach'),b=writeBatch(d);
 b.set(doc(d,'teams','A','permissions','pending'),{role:'viewer'});
 b.update(doc(d,'teams','A'),{members:['coach','parent2','pending']});
 b.set(doc(d,'teams','A','people','pending'),{name:'New',email:'new@example.test',role:'viewer'});
 b.delete(doc(d,'teams','A','requests','pending'));
 await assertSucceeds(b.commit());
 await assertSucceeds(getDoc(doc(db('pending'),'teams','A')));
 await assertFails(setDoc(doc(db('pending'),'teams','A','data','sample'),{data:'forbidden'}));
});
test('team suspension affects only that team',async()=>{
 await assertSucceeds(setDoc(doc(db('coach'),'teams','A','permissions','parent2'),{role:'disabled'}));
 await assertFails(getDoc(doc(db('parent2'),'teams','A','data','sample')));
 await assertSucceeds(getDoc(doc(db('parent2'),'teams','B')));
});
