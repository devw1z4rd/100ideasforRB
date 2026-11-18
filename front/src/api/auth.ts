import { useSyncExternalStore } from "react"
import { pb } from "./pb"
import type { UsersResponse } from "./pocketbase-types"

// Аккаунты и роли (CLAUDE.md §4 M5, §8). Токен хранит authStore SDK (localStorage); роль решает только то,
// что показать в интерфейсе — права проверяют API rules на сервере.

// Суперпользователь из админки (/_/) — не пользователь сайта
const readUser = () =>
  pb.authStore.isValid && pb.authStore.record?.collectionName === "users" ? pb.authStore.record : null
// Снимок кэшируется: authStore.record читает localStorage и каждый раз отдаёт новый объект, а
// useSyncExternalStore требует один и тот же объект, пока ничего не поменялось (иначе бесконечный цикл)
let current = readUser()
pb.authStore.onChange(() => {
  current = readUser()
})
const subscribe = (onChange: () => void) => pb.authStore.onChange(onChange)
const getUser = () => current

export function useAuth() {
  const user = useSyncExternalStore(subscribe, getUser) as UsersResponse | null
  const role = user?.role
  return {
    user,
    isModerator: role === "moderator" || role === "admin",
    isAdmin: role === "admin",
  }
}

export function login(email: string, password: string) {
  return pb.collection("users").authWithPassword(email, password)
}

/** Регистрация и сразу вход. Роль сервер ставит сам (user). */
export async function register({
  email,
  password,
  name,
}: {
  email: string
  password: string
  name?: string
}) {
  await pb.collection("users").create({ email, password, passwordConfirm: password, name })
  return login(email, password)
}

export function logout() {
  pb.authStore.clear()
}
