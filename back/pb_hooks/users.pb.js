/// <reference path="../pb_data/types.d.ts" />
// select fields have no default in PocketBase, so new users get role "user" here. Model-level hook: fires for
// sign-up, OAuth and admin-created users.

onRecordCreate((e) => {
  if (!e.record.getString("role")) e.record.set("role", "user")
  e.next()
}, "users")

// Set a role from the console (demo accounts, first moderator); the user must already exist:
//   pocketbase set-role moderator@example.com moderator
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
