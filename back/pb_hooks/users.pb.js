/// <reference path="../pb_data/types.d.ts" />
// У select в PocketBase нет значения по умолчанию: новые пользователи получают роль user (CLAUDE.md §8).
// Хук уровня модели — срабатывает и при регистрации, и при входе через OAuth, и при создании из админки.
// Выбрать другую роль при регистрации не даёт createRule коллекции users.

onRecordCreate((e) => {
  if (!e.record.getString("role")) e.record.set("role", "user")
  e.next()
}, "users")
