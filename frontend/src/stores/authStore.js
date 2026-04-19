const TOKEN_KEY = 'kline_training_token'
const EMAIL_KEY = 'kline_training_email'

export function saveAuth(token, email) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(EMAIL_KEY, email)
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getEmail() {
  return localStorage.getItem(EMAIL_KEY)
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(EMAIL_KEY)
}
