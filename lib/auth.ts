import type { User } from "./data";

export function getUser(): User {
  try {
    return JSON.parse(localStorage.getItem("av_user") ?? "null");
  } catch {
    return null;
  }
}

export function saveUser(u: User): void {
  if (u === null) {
    localStorage.removeItem("av_user");
  } else {
    localStorage.setItem("av_user", JSON.stringify(u));
  }
}
