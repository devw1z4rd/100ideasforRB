/// <reference path="../pb_data/types.d.ts" />
// У select в PocketBase нет значения по умолчанию: новые пользователи получают роль user (CLAUDE.md §8).
// Хук уровня модели — срабатывает и при регистрации, и при входе через OAuth, и при создании из админки.
// Выбрать другую роль при регистрации не даёт createRule коллекции users.

onRecordCreate((e) => {
  if (!e.record.getString("role")) e.record.set("role", "user")
  e.next()
}, "users")

// Назначить роль пользователю сайта из консоли — для демо-аккаунтов (CLAUDE.md §15) и первого модератора:
//   pocketbase set-role moderator@example.com moderator
// Роли: user, moderator, admin. Пользователь должен уже быть зарегистрирован.
$app.rootCmd.addCommand(
  new Command({
    use: "set-role <email> <role>",
    short: "Назначить роль пользователю сайта: user, moderator, admin",
    run: (cmd, args) => {
      const [email, role] = args
      if (!email || !["user", "moderator", "admin"].includes(role)) {
        throw new Error("Нужно: set-role <email> <user|moderator|admin>")
      }
      const record = $app.findAuthRecordByEmail("users", email)
      record.set("role", role)
      $app.save(record)
      console.log(`${email}: роль ${role}`)
    },
  }),
)
