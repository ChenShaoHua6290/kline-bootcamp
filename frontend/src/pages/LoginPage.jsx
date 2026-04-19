import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import client from '../api/client'
import { saveAuth } from '../stores/authStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const { data } = await client.post('/auth/login', form)
      saveAuth(data.token, data.email)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || '登录失败，请检查邮箱和密码。')
    }
  }

  return (
    <main className="auth-wrapper">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>登录</h1>
        <input
          type="email"
          placeholder="邮箱"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          type="password"
          placeholder="密码"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        {error && <p className="error">{error}</p>}
        <button type="submit">登录</button>
        <p>
          没有账号？<Link to="/register">去注册</Link>
        </p>
      </form>
    </main>
  )
}
