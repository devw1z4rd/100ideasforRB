// API rules and hooks as anonymous / user / moderator / admin. Needs a running PocketBase with migrations,
// hooks and seed data:
//   PB_URL=http://127.0.0.1:8090 PB_SUPERUSER_EMAIL=… PB_SUPERUSER_PASSWORD=… node --test
//   back/tests/rules.test.mjs
// Creates its own records and deletes them at the end.
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

const PB = process.env.PB_URL ?? "http://127.0.0.1:8090";
const RUN = Date.now().toString(36);
const created = [];

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
  const districts = await must(null, "GET", "/api/collections/districts/records?perPage=100&fields=id,name");
  for (const d of districts.items) ids[d.name] = d.id;
  assert.ok(ids["г. Гомель"] && ids["Гомельский"], "справочник районов не загружен: pocketbase seed");
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

  test("аноним создаёт обращение и открывает его только по своему ключу", async () => {
    const key = `k${RUN}abcdefghijklmnopqrstuvwxyz`;
    const res = await fetch(PB + reportsUrl, {
      method: "POST",
      headers: { "content-type": "application/json", "X-Report-Key": key },
      body: JSON.stringify({ location: GOMEL, category: "dump", description: "Без входа", author: ids.other }),
    });
    const anon = await res.json();
    assert.equal(res.status, 200, JSON.stringify(anon));
    created.push(["reports", anon.id]);
    assert.equal(anon.author, "");
    assert.equal(anon.status, "new");
    assert.equal(anon.access_key, undefined);
    const link = `/api/eco/reports/${anon.id}`;
    assert.equal((await must(null, "GET", `${link}?key=${key}`)).report.id, anon.id);
    assert.equal((await call(null, "GET", `${link}?key=x${key}`)).status, 404);
    assert.equal((await call(null, "GET", `${reportsUrl}/${anon.id}`)).status, 404);
  });

  test("без ключа в заголовке сервер придумывает свой", async () => {
    const anon = await must(null, "POST", reportsUrl, { location: GOMEL, category: "smoke", description: "Без ключа" });
    created.push(["reports", anon.id]);
    const stored = await must(su.token, "GET", `${reportsUrl}/${anon.id}`);
    assert.match(stored.access_key, /^[A-Za-z0-9]{32}$/);
  });

  test("причина отклонения обязательна и видна гостю в истории", async () => {
    const key = `reject${RUN}abcdefghijklmnopqrstuvwxyz`;
    const response = await fetch(PB + reportsUrl, {
      method: "POST",
      headers: { "content-type": "application/json", "X-Report-Key": key },
      body: JSON.stringify({ location: GOMEL, category: "dump", description: "Обращение для проверки отклонения" }),
    });
    const report = await response.json();
    assert.equal(response.status, 200, JSON.stringify(report));
    created.push(["reports", report.id]);
    const path = `${reportsUrl}/${report.id}`;

    await must(tok.moder, "PATCH", path, { status: "accepted", moderator_comment: "Проверим на месте" });
    assert.equal((await call(tok.moder, "PATCH", path, { status: "rejected" })).status, 400);
    assert.equal((await call(tok.admin, "PATCH", path, { status: "rejected", moderator_comment: "   " })).status, 400);

    const reason = "Мусор уже вывезен";
    const rejected = await must(tok.moder, "PATCH", path, { status: "rejected", moderator_comment: `  ${reason}  ` });
    assert.equal(rejected.status, "rejected");
    assert.equal((await call(null, "GET", path)).status, 404);
    const guest = await must(null, "GET", `/api/eco/reports/${report.id}?key=${key}`);
    assert.equal(guest.report.status, "rejected");
    assert.equal(guest.events.at(-1).comment, reason);
    assert.equal(guest.events.at(-1).to_status, "rejected");
  });

  test("доступ к фото следует статусу обращения и правам автора и модератора", async () => {
    const key = `photos${RUN}abcdefghijklmnopqrstuvwxyz`;
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p1sAAAAASUVORK5CYII=", "base64");
    async function submitPhoto(auth, guestKey) {
      const form = new FormData();
      form.set("location", JSON.stringify(GOMEL));
      form.set("category", "dump");
      form.set("description", "Обращение с фотографией");
      form.set("photos", new Blob([png], { type: "image/png" }), "report.png");
      const headers = auth ? { Authorization: auth } : { "X-Report-Key": guestKey };
      const response = await fetch(PB + reportsUrl, { method: "POST", headers, body: form });
      const report = await response.json();
      assert.equal(response.status, 200, JSON.stringify(report));
      created.push(["reports", report.id]);
      return report;
    }
    const photoUrl = (r) => `${PB}/api/files/reports/${r.id}/${encodeURIComponent(r.photos[0])}`;
    const getToken = async (auth) => (await must(auth, "POST", "/api/files/token")).token;
    const ownerPhotoToken = await getToken(tok.author);
    const moderatorPhotoToken = await getToken(tok.moder);
    const unrelatedPhotoToken = await getToken(tok.other);
    const signedIn = await submitPhoto(tok.author);
    const anonymous = await submitPhoto(null, key);
    const url = photoUrl(anonymous);

    assert.equal((await fetch(url)).status, 404);
    assert.equal((await fetch(`${url}?key=wrong${key}`)).status, 404);
    assert.equal((await fetch(`${url}?token=${unrelatedPhotoToken}`)).status, 404);
    assert.equal((await call(null, "GET", `${reportsUrl}/${anonymous.id}?key=${key}`)).status, 404);
    for (const [viewer, visible] of [
      ["guest author", `${url}?key=${key}`],
      ["moderator", `${url}?token=${moderatorPhotoToken}`],
      ["signed-in author", `${photoUrl(signedIn)}?token=${ownerPhotoToken}`],
    ]) {
      const response = await fetch(visible);
      assert.equal(response.status, 200, `${viewer}: ${response.ok ? "" : await response.text()}`);
      assert.match(response.headers.get("cache-control"), /no-store/);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), png);
    }

    const path = `${reportsUrl}/${anonymous.id}`;
    await must(tok.moder, "PATCH", path, { status: "accepted" });
    assert.equal((await fetch(url)).status, 200);
    const mainPath = `${reportsUrl}/${signedIn.id}`;
    await must(tok.moder, "PATCH", mainPath, { status: "accepted" });
    await must(tok.moder, "PATCH", path, { duplicate_of: signedIn.id });
    assert.equal((await fetch(url)).status, 404);
    assert.equal((await fetch(`${url}?key=${key}`)).status, 200);
    assert.equal((await fetch(`${url}?token=${moderatorPhotoToken}`)).status, 200);
    await must(tok.moder, "PATCH", path, { duplicate_of: "" });
    await must(tok.moder, "PATCH", path, { status: "rejected", moderator_comment: "Снимок уже проверен" });
    assert.equal((await fetch(url)).status, 404);
    assert.equal((await fetch(`${url}?key=${key}`)).status, 200);
  });

  test("точка вне области отклоняется", async () => {
    const res = await call(tok.author, "POST", reportsUrl, { location: { lat: 53.9, lon: 27.56 }, category: "dump", description: "Минск" });
    assert.equal(res.status, 400);
  });

  test("дубликат скрыт из публичных данных и следует статусу основного обращения", async () => {
    async function submit(token, description) {
      const record = await must(token, "POST", reportsUrl, { location: GOMEL, category: "dump", description });
      created.push(["reports", record.id]);
      return record;
    }
    const main = await submit(tok.author, "Основное обращение о свалке");
    const other = await submit(tok.author, "Ещё одно обращение для проверки связи");
    const key = `duplicate${RUN}abcdefghijklmnopqrstuvwxyz`;
    const response = await fetch(PB + reportsUrl, {
      method: "POST",
      headers: { "content-type": "application/json", "X-Report-Key": key },
      body: JSON.stringify({ location: GOMEL, category: "dump", description: "Гость сообщил о той же свалке" }),
    });
    const duplicate = await response.json();
    assert.equal(response.status, 200, JSON.stringify(duplicate));
    created.push(["reports", duplicate.id]);
    const mainPath = `${reportsUrl}/${main.id}`;
    const duplicatePath = `${reportsUrl}/${duplicate.id}`;
    const guestPath = `/api/eco/reports/${duplicate.id}?key=${key}`;
    const otherPath = `${reportsUrl}/${other.id}`;

    assert.equal((await call(tok.author, "PATCH", otherPath, { duplicate_of: main.id })).status, 403);
    assert.equal((await call(tok.moder, "PATCH", duplicatePath, { duplicate_of: duplicate.id })).status, 400);
    await must(tok.moder, "PATCH", mainPath, { status: "accepted" });
    await must(tok.moder, "PATCH", duplicatePath, { status: "accepted" });
    await must(null, "GET", duplicatePath);

    const linked = await must(tok.moder, "PATCH", duplicatePath, { duplicate_of: main.id });
    assert.equal(linked.duplicate_of, main.id);
    assert.equal(linked.status, "accepted");
    assert.equal((await call(null, "GET", duplicatePath)).status, 404);
    const publicPair = await must(null, "GET", `${reportsUrl}?filter=${encodeURIComponent(`id = "${main.id}" || id = "${duplicate.id}"`)}`);
    assert.deepEqual(publicPair.items.map((report) => report.id), [main.id]);
    assert.equal((await must(null, "GET", eventsOf(duplicate.id))).items.length, 0);
    const guest = await must(null, "GET", guestPath);
    assert.equal(guest.report.duplicate_of, main.id);
    assert.match(guest.events.at(-1).comment, /связано/);
    assert.equal((await call(tok.moder, "PATCH", duplicatePath, { status: "forwarded" })).status, 400);
    assert.equal((await call(tok.moder, "PATCH", otherPath, { duplicate_of: duplicate.id })).status, 400);
    assert.equal((await call(tok.moder, "PATCH", mainPath, { duplicate_of: other.id })).status, 400);
    assert.equal((await call(tok.admin, "DELETE", mainPath)).ok, false);

    await must(tok.moder, "PATCH", mainPath, { status: "forwarded" });
    assert.equal((await must(null, "GET", guestPath)).report.status, "forwarded");
    const reason = "Мусор уже вывезен";
    await must(tok.moder, "PATCH", mainPath, { status: "rejected", moderator_comment: reason });
    const final = await must(null, "GET", guestPath);
    assert.equal(final.report.status, "rejected");
    assert.equal(final.events.at(-1).comment, reason);
    assert.equal((await call(tok.moder, "PATCH", otherPath, { duplicate_of: main.id })).status, 400);

    const unlinked = await must(tok.moder, "PATCH", duplicatePath, { duplicate_of: "" });
    assert.equal(unlinked.duplicate_of, "");
    assert.equal(unlinked.status, "new");
    assert.equal(unlinked.moderator_comment, "");
  });

  test("район — по полигону: город отдельно от Гомельского района", async () => {
    for (const [location, district] of [
      [{ lat: 52.3143, lon: 30.9933 }, "Гомельский"],
      [{ lat: 52.04162, lon: 29.21631 }, "Мозырский"],
      [{ lat: 51.79067, lon: 30.26709 }, "Брагинский"],
    ]) {
      const r = await must(tok.author, "POST", reportsUrl, { location, category: "smoke", description: "проверка района" });
      created.push(["reports", r.id]);
      assert.equal(r.district, ids[district], district);
    }
  });

  test("автор и статус задаёт сервер", async () => {
    report = await must(tok.author, "POST", reportsUrl, {
      location: GOMEL,
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
    assert.equal(report.district, ids["г. Гомель"]);
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

describe("rivers", () => {
  test("посты и уровни читают все, пишет только cron", async () => {
    for (const collection of ["river_posts", "river_levels"]) {
      const path = `/api/collections/${collection}/records`;
      assert.equal((await call(null, "GET", path)).status, 200);
      assert.equal((await call(null, "POST", path, {})).ok, false);
      assert.equal((await call(tok.admin, "POST", path, {})).ok, false);
    }
  });
});

describe("health", () => {
  test("свежесть данных открыта всем; 503, если данные устарели", async () => {
    const res = await call(null, "GET", "/api/eco/health");
    assert.equal(res.status, res.data.ok ? 200 : 503);
    for (const key of ["air", "rivers"]) {
      const part = res.data[key];
      assert.equal(typeof part.ok, "boolean");
      assert.equal(typeof part.limitHours, "number");
      if (!part.at) assert.equal(part.ok, false);
    }
    assert.equal(res.data.ok, res.data.air.ok && res.data.rivers.ok);
  });
});
