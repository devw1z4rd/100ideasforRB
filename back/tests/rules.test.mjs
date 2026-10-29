// Проверка API rules и хуков (CLAUDE.md §8): запросы от анонима, пользователя, модератора и админа.
// Нужен запущенный PocketBase с миграциями и хуками из back/:
//   PB_URL=http://127.0.0.1:8090 PB_SUPERUSER_EMAIL=… PB_SUPERUSER_PASSWORD=… node --test back/tests/rules.test.mjs
// Тест создаёт свои записи с уникальными именами и удаляет их в конце.
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

const PB = process.env.PB_URL ?? "http://127.0.0.1:8090";
const RUN = Date.now().toString(36);
const created = []; // [collection, id] для очистки суперпользователем

async function call(token, method, path, body) {
  const headers = token ? { Authorization: token } : {};
  if (body) headers["content-type"] = "application/json";
  const res = await fetch(PB + path, { method, headers, body: body && JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, ok: res.ok, data: text ? JSON.parse(text) : null };
}

async function must(token, method, path, body) {
  const res = await call(token, method, path, body);
  assert.ok(res.ok, `${method} ${path} → ${res.status} ${JSON.stringify(res.data)}`);
  return res.data;
}

async function login(collection, identity, password) {
  const res = await must(null, "POST", `/api/collections/${collection}/auth-with-password`, { identity, password });
  return res.token;
}

const su = {};
const tok = {}; // anon — undefined
const ids = {};

async function createUser(name, role) {
  const email = `${name}-${RUN}@test.local`;
  const user = await must(null, "POST", "/api/collections/users/records", {
    email,
    password: "testpassword123",
    passwordConfirm: "testpassword123",
    name,
  });
  created.push(["users", user.id]);
  if (role) await must(su.token, "PATCH", `/api/collections/users/records/${user.id}`, { role });
  ids[name] = user.id;
  tok[name] = await login("users", email, "testpassword123");
  return user;
}

const reportsUrl = "/api/collections/reports/records";
const eventsOf = (id) => `/api/collections/report_events/records?filter=${encodeURIComponent(`report = "${id}"`)}&sort=created`;
const GOMEL = { lat: 52.4345, lon: 30.9754 };

before(async () => {
  su.token = await login("_superusers", process.env.PB_SUPERUSER_EMAIL, process.env.PB_SUPERUSER_PASSWORD);
  for (const [name, center] of [
    [`Тест-Гомель-${RUN}`, GOMEL],
    [`Тест-Мозырь-${RUN}`, { lat: 52.0495, lon: 29.2456 }],
  ]) {
    const d = await must(su.token, "POST", "/api/collections/districts/records", { name, center });
    created.push(["districts", d.id]);
    ids[name.split("-")[1]] = d.id;
  }
  await createUser("author");
  await createUser("other");
  await createUser("moder", "moderator");
  await createUser("admin", "admin");
});

after(async () => {
  for (const [collection, id] of created.reverse()) {
    await call(su.token, "DELETE", `/api/collections/${collection}/records/${id}`);
  }
});

describe("users", () => {
  test("регистрация получает роль user, выбрать другую нельзя", async () => {
    const me = await must(tok.author, "GET", `/api/collections/users/records/${ids.author}`);
    assert.equal(me.role, "user");
    const res = await call(null, "POST", "/api/collections/users/records", {
      email: `hacker-${RUN}@test.local`,
      password: "testpassword123",
      passwordConfirm: "testpassword123",
      role: "admin",
    });
    assert.equal(res.ok, false);
  });

  test("пользователь не меняет себе роль и telegram_id, имя — меняет", async () => {
    assert.equal((await call(tok.author, "PATCH", `/api/collections/users/records/${ids.author}`, { role: "admin" })).ok, false);
    assert.equal((await call(tok.author, "PATCH", `/api/collections/users/records/${ids.author}`, { telegram_id: "1" })).ok, false);
    const me = await must(tok.author, "PATCH", `/api/collections/users/records/${ids.author}`, { name: "Автор" });
    assert.equal(me.role, "user");
  });

  test("список пользователей: сам себя, админ — всех", async () => {
    const own = await must(tok.author, "GET", "/api/collections/users/records?perPage=500");
    assert.deepEqual(own.items.map((u) => u.id), [ids.author]);
    const all = await must(tok.admin, "GET", "/api/collections/users/records?perPage=500");
    assert.ok(all.items.some((u) => u.id === ids.other));
  });
});

describe("reports", () => {
  let report;

  test("аноним не создаёт обращение", async () => {
    const res = await call(null, "POST", reportsUrl, { location: GOMEL, category: "dump", description: "x" });
    assert.equal(res.ok, false);
  });

  test("точка вне области отклоняется", async () => {
    const res = await call(tok.author, "POST", reportsUrl, { location: { lat: 53.9, lon: 27.56 }, category: "dump", description: "Минск" });
    assert.equal(res.status, 400);
  });

  test("автор и статус задаёт сервер, район — по ближайшему райцентру", async () => {
    report = await must(tok.author, "POST", reportsUrl, {
      location: { lat: 52.45, lon: 30.9 },
      category: "dump",
      description: "Свалка у дороги",
      author: ids.other,
      status: "resolved",
      moderator_comment: "подделка",
    });
    created.push(["reports", report.id]);
    assert.equal(report.author, ids.author);
    assert.equal(report.status, "new");
    assert.equal(report.moderator_comment, "");
    assert.equal(report.district, ids["Гомель"]);
  });

  test("новое обращение видят автор и модератор, но не аноним и не другой пользователь", async () => {
    const path = `${reportsUrl}/${report.id}`;
    assert.equal((await call(null, "GET", path)).status, 404);
    assert.equal((await call(tok.other, "GET", path)).status, 404);
    await must(tok.author, "GET", path);
    await must(tok.moder, "GET", path);
  });

  test("создание пишет событие ∅ → new", async () => {
    const events = await must(tok.author, "GET", eventsOf(report.id));
    assert.equal(events.items.length, 1);
    assert.equal(events.items[0].from_status, "");
    assert.equal(events.items[0].to_status, "new");
    assert.equal(events.items[0].actor, ids.author);
  });

  test("автор меняет только описание", async () => {
    const path = `${reportsUrl}/${report.id}`;
    await must(tok.author, "PATCH", path, { description: "Свалка у дороги, много пластика" });
    assert.equal((await call(tok.author, "PATCH", path, { status: "resolved" })).status, 403);
    assert.equal((await call(tok.author, "PATCH", path, { category: "smoke" })).status, 403);
    assert.equal((await call(tok.other, "PATCH", path, { description: "чужое" })).ok, false);
  });

  test("модератор: только допустимые переходы и свои поля", async () => {
    const path = `${reportsUrl}/${report.id}`;
    assert.equal((await call(tok.moder, "PATCH", path, { status: "resolved" })).status, 400);
    assert.equal((await call(tok.moder, "PATCH", path, { description: "правка" })).status, 403);
    const updated = await must(tok.moder, "PATCH", path, { status: "accepted", moderator_comment: "Передадим в райисполком" });
    assert.equal(updated.status, "accepted");
  });

  test("смена статуса пишет событие с автором и комментарием", async () => {
    const events = await must(null, "GET", eventsOf(report.id));
    assert.equal(events.items.length, 2);
    assert.deepEqual(
      { from: events.items[1].from_status, to: events.items[1].to_status, actor: events.items[1].actor, comment: events.items[1].comment },
      { from: "new", to: "accepted", actor: ids.moder, comment: "Передадим в райисполком" },
    );
  });

  test("принятое обращение публично, автор его больше не правит", async () => {
    const path = `${reportsUrl}/${report.id}`;
    await must(null, "GET", path);
    assert.equal((await call(tok.author, "PATCH", path, { description: "ещё правка" })).status, 404);
  });

  test("удаляет только админ, события уходят каскадом", async () => {
    const path = `${reportsUrl}/${report.id}`;
    assert.equal((await call(tok.moder, "DELETE", path)).ok, false);
    assert.equal((await call(tok.author, "DELETE", path)).ok, false);
    await must(tok.admin, "DELETE", path);
    const events = await must(su.token, "GET", eventsOf(report.id));
    assert.equal(events.items.length, 0);
  });

  test("события нельзя создать через API", async () => {
    const res = await call(tok.moder, "POST", "/api/collections/report_events/records", { report: "x", to_status: "new" });
    assert.equal(res.ok, false);
  });
});

describe("news", () => {
  test("черновик видит только админ", async () => {
    const draft = await must(su.token, "POST", "/api/collections/news/records", {
      title: "Черновик",
      slug: `draft-${RUN}`,
      body: "<p>текст</p>",
      is_published: false,
    });
    created.push(["news", draft.id]);
    const path = `/api/collections/news/records/${draft.id}`;
    assert.equal((await call(null, "GET", path)).status, 404);
    assert.equal((await call(tok.author, "GET", path)).status, 404);
    await must(tok.admin, "GET", path);
    assert.equal((await call(tok.admin, "PATCH", path, { is_published: true })).ok, false);
  });
});
