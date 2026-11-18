import { useSyncExternalStore } from "react"
import { pb } from "./pb"
import type { UsersResponse } from "./pocketbase-types"

const readUser = () =>
  pb.authStore.isValid && pb.authStore.record?.collectionName === "users" ? pb.authStore.record : null
// The snapshot is cached: authStore.record returns a new object on every read, and useSyncExternalStore needs
// a stable one, otherwise it loops forever.
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
