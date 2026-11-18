// Report auto-check: profanity (with common obfuscations) and a plausibility score for moderators. Pure
// functions except score(app, …), so they can be tested in Node.

const VISUAL = {
  a: "а",
  b: "в",
  c: "с",
  e: "е",
  h: "н",
  k: "к",
  m: "м",
  o: "о",
  p: "р",
  t: "т",
  x: "х",
  y: "у",
  u: "и",
  0: "о",
  3: "з",
  4: "ч",
  6: "б",
  "@": "а",
  $: "с",
};
const DIGRAPHS = [
  ["sch", "щ"],
  ["shch", "щ"],
  ["ch", "ч"],
  ["sh", "ш"],
  ["zh", "ж"],
  ["kh", "х"],
  ["ts", "ц"],
  ["ya", "я"],
  ["yu", "ю"],
  ["yo", "е"],
  ["ye", "е"],
  ["ja", "я"],
  ["ju", "ю"],
  ["ay", "ай"],
  ["ey", "ей"],
  ["iy", "ий"],
  ["oy", "ой"],
  ["uy", "уй"],
];
const TRANSLIT = {
  a: "а",
  b: "б",
  c: "к",
  d: "д",
  e: "е",
  f: "ф",
  g: "г",
  h: "х",
  i: "и",
  j: "й",
  k: "к",
  l: "л",
  m: "м",
  n: "н",
  o: "о",
  p: "п",
  q: "к",
  r: "р",
  s: "с",
  t: "т",
  u: "у",
  v: "в",
  w: "в",
  x: "х",
  y: "ы",
  z: "з",
  0: "о",
  1: "и",
  3: "з",
  4: "ч",
  6: "б",
  "@": "а",
  $: "с",
};

const ANYWHERE = [
  "пизд",
  "пезд",
  "пидор",
  "пидар",
  "пидр",
  "педик",
  "хуй",
  "хуе",
  "хуя",
  "хуи",
  "бляд",
  "блят",
  "залуп",
  "гандон",
  "гондон",
  "мудак",
  "мудил",
  "шлюх",
  "дроч",
  "уебан",
  "уебищ",
  "долбоеб",
];
// Short roots match only as whole words or word starts, otherwise they hit ordinary words.
const WORDS = [
  /^(вы|за|на|у|от|отъ|оть|разъ|разь|съ|сь|до|про|по|под|подъ|пере|недо|при|долбо)?еб(а|у|л|н|ы|и|е|ч|ош)/,
  /^бля(ть|дь|ха)?$/,
  /^сук(а|и|е|у|ой|ам|ами|ах)$/,
  /^суч(ар|ара|ка|ки|ке|ку|кой|ье|ий)/,
  /^манд(а|ы|е|у|ой)$/,
  /^(fuck|cunt|bitch|whore|shit)/,
];
const SAFE = /страху[йея]/;

const collapse = (s) => s.replace(/(.)\1+/g, "$1");

function translit(s, map, digits) {
  let out = s;
  if (map === TRANSLIT)
    for (const [from, to] of DIGRAPHS) out = out.split(from).join(to);
  let res = "";
  for (const ch of out) {
    if (/[0-9@$]/.test(ch)) res += digits === "map" ? (map[ch] ?? "") : "";
    else res += map[ch] ?? ch;
  }
  return res;
}

function variants(text) {
  const base = String(text || "")
    .toLowerCase()
    .replace(/ё/g, "е");
  const out = new Set([base]);
  for (const map of [VISUAL, TRANSLIT]) {
    for (const digits of ["map", "drop"]) out.add(translit(base, map, digits));
  }
  return [...out].map(collapse);
}

function findProfanity(text) {
  const found = new Set();
  for (const v of variants(text)) {
    const words = v.split(/[^a-zа-я]+/).filter(Boolean);
    for (const w of words) {
      if (SAFE.test(w)) continue;
      for (const root of ANYWHERE) if (w.includes(root)) found.add(root);
      for (const re of WORDS) if (re.test(w)) found.add(w);
    }
    const glued = collapse(v.replace(/[^a-zа-я]+/g, ""));
    for (const root of ANYWHERE)
      if (root.length >= 4 && glued.includes(root) && !SAFE.test(glued))
        found.add(root);
  }
  return [...found];
}

const CATEGORY_WORDS = {
  dump: [
    "мусор",
    "свалк",
    "отход",
    "пакет",
    "бутыл",
    "покрыш",
    "шин",
    "строймус",
    "хлам",
    "контейнер",
    "выброс мус",
  ],
  discharge: [
    "сброс",
    "слив",
    "труб",
    "стоки",
    "сток",
    "пена",
    "пятн",
    "масл",
    "нефт",
    "вода",
    "река",
    "ручей",
    "озер",
    "запах",
  ],
  smoke: [
    "дым",
    "гарь",
    "запах",
    "вонь",
    "труба",
    "смог",
    "копот",
    "выброс",
    "дыш",
  ],
  felling: [
    "выруб",
    "спил",
    "пил",
    "дерев",
    "лес",
    "сосн",
    "берез",
    "дуб",
    "пень",
    "пни",
    "техник",
  ],
  burning: [
    "гор",
    "огон",
    "пал",
    "пожар",
    "трав",
    "дым",
    "жгут",
    "сжига",
    "костер",
    "тлеет",
  ],
  other: [],
};
const KEYBOARD_MASH = /(йцук|цуке|фыва|ывап|ячсм|qwer|asdf|zxcv|ролд|олдж)/;

function looksLikeGibberish(text) {
  const t = String(text || "").toLowerCase();
  const letters = t.replace(/[^a-zа-яё]/g, "");
  if (letters.length < 6) return false;
  const vowels =
    letters.replace(/[^аеёиоуыэюяaeiouy]/g, "").length / letters.length;
  const words = t.split(/\s+/).filter(Boolean);
  const distinct = new Set(words).size;
  return (
    vowels < 0.2 ||
    vowels > 0.75 ||
    /[бвгджзйклмнпрстфхцчшщ]{5,}/.test(t) ||
    /(.)\1{3,}/.test(t) ||
    KEYBOARD_MASH.test(t) ||
    (words.length >= 4 && distinct / words.length < 0.4)
  );
}

const clamp = (n) => Math.max(5, Math.min(95, Math.round(n)));

function score(app, { id, category, description, photos, lat, lon, authorId }) {
  const reasons = [];
  const add = (delta, text) => reasons.push({ delta, text });
  const desc = String(description || "").trim();

  if (photos > 0) add(25, photos > 1 ? `Фото: ${photos}` : "Есть фото");
  else add(-10, "Без фото");

  if (desc.length >= 20) add(10, "Есть описание");
  if (desc && looksLikeGibberish(desc))
    add(-30, "Описание похоже на набор букв");

  const words = CATEGORY_WORDS[category] || [];
  const low = desc.toLowerCase().replace(/ё/g, "е");
  if (desc && words.length && words.some((w) => low.includes(w)))
    add(15, "Описание совпадает с категорией");
  else if (desc.length >= 20 && words.length)
    add(-5, "В описании нет слов о такой проблеме");

  try {
    const since = new Date(Date.now() - 60 * 86400e3)
      .toISOString()
      .replace("T", " ");
    const near = app.findRecordsByFilter(
      "reports",
      "id != {:id} && category = {:category} && status != 'rejected' && created >= {:since} && " +
        "geoDistance(location.lon, location.lat, {:lon}, {:lat}) < 0.5",
      "-created",
      5,
      0,
      { id: id || "", category, since, lon, lat },
    );
    if (near.length) add(10, `Рядом уже сообщали: ${near.length}`);
  } catch (_) {
    // geoDistance is missing in older PocketBase versions — skip this signal.
  }

  if (authorId) {
    add(5, "Автор вошёл в аккаунт");
    try {
      const past = app.findRecordsByFilter(
        "reports",
        "author = {:a} && id != {:id}",
        "-created",
        50,
        0,
        {
          a: authorId,
          id: id || "",
        },
      );
      const good = past.filter((r) =>
        ["accepted", "forwarded", "resolved"].includes(r.getString("status")),
      ).length;
      const bad = past.filter(
        (r) => r.getString("status") === "rejected",
      ).length;
      if (good)
        add(Math.min(15, good * 5), `Подтверждённых обращений автора: ${good}`);
      if (bad)
        add(-Math.min(30, bad * 10), `Отклонённых обращений автора: ${bad}`);
    } catch (_) {}
  } else {
    add(-5, "Без входа");
  }

  return {
    score: clamp(50 + reasons.reduce((s, r) => s + r.delta, 0)),
    reasons,
  };
}

module.exports = { findProfanity, looksLikeGibberish, score, variants };
