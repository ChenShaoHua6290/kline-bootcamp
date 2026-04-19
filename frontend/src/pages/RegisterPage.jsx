import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import client from '../api/client'
import { saveAuth } from '../stores/authStore'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const { data } = await client.post('/auth/register', form)
      saveAuth(data.token, data.email)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || '注册失败，请稍后再试。')
    }
  }

  return (
    <main className="auth-wrapper">
      <form className="auth-card" onSubmit={onSubmit}>
        <h1>注册</h1>
        <input
          type="email"
          placeholder="邮箱"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          type="password"
          placeholder="密码（至少6位）"
          minLength={6}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />
        {error && <p className="error">{error}</p>}
        <button type="submit">注册</button>
        <p>
          已有账号？<Link to="/login">去登录</Link>
        </p>
      </form>
    </main>
  )
}
