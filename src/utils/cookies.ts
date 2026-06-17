export function setCookie(n: string, v: string, d: number) {
  const e = new Date(Date.now() + d * 864e5).toUTCString()
  document.cookie = `${n}=${encodeURIComponent(v)};expires=${e};path=/;SameSite=Strict;Secure`
}

export function getCookie(n: string): string | null {
  const m = document.cookie.match(new RegExp('(?:^|; )' + n + '=([^;]*)'))
  return m ? decodeURIComponent(m[1]) : null
}

export function deleteCookie(n: string) {
  document.cookie = `${n}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Strict;Secure`
}
