import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import KlineCanvas from '../components/KlineCanvas'
import { clearAuth, getEmail } from '../stores/authStore'
import client from '../api/client'

const timeframeOptions = ['M15', 'M30', 'H1', 'H2', 'H4', 'D1', 'D2', 'W1', 'MN1']
const assetClasses = ['FUTURES', 'STOCK', 'FOREX', 'CRYPTO', 'GOLD']

export default function HomePage() {
  const navigate = useNavigate()
  const [sessionId, setSessionId] = useState(null)
  const [context, setContext] = useState([])
  const [answer, setAnswer] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ assetClass: 'CRYPTO', symbol: '', timeframe: 'H1', contextSize: 120, targetSize: 30 })
  const [msg, setMsg] = useState('')

  const chartData = useMemo(() => [...context, ...answer], [context, answer])

  const logout = () => {
    clearAuth()
    navigate('/login')
  }

  const startRandomTraining = async () => {
    setLoading(true)
    setMsg('')
    setAnswer([])
    try {
      const payload = {
        assetClass: form.assetClass,
        symbol: form.symbol || null,
        timeframe: form.timeframe,
        contextSize: Number(form.contextSize),
        targetSize: Number(form.targetSize)
      }
      const { data } = await client.post('/training/random', payload)
      const normalized = data.contextCandles.map((item) => ({
        timestamp: item.timestamp,
        open: Number(item.open),
        high: Number(item.high),
        low: Number(item.low),
        close: Number(item.close),
        volume: Number(item.volume)
      }))
      setSessionId(data.sessionId)
      setContext(normalized)
      setMsg(`已创建训练: ${data.symbol} / ${data.timeframe}`)
    } catch (error) {
      setMsg(error.response?.data?.message || '创建训练失败，请先导入该品种K线数据。')
      setContext([])
    } finally {
      setLoading(false)
    }
  }

  const revealAnswer = async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      const { data } = await client.post(`/training/${sessionId}/reveal`)
      const normalized = data.answerCandles.map((item) => ({
        timestamp: item.timestamp,
        open: Number(item.open),
        high: Number(item.high),
        low: Number(item.low),
        close: Number(item.close),
        volume: Number(item.volume)
      }))
      setAnswer(normalized)
      setMsg('已揭晓答案K线，开始复盘。')
    } catch (error) {
      setMsg(error.response?.data?.message || '揭晓失败。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="home-wrapper">
      <header className="home-header">
        <div>
          <h2>K线双盲训练</h2>
          <p>{getEmail()}</p>
        </div>
        <button onClick={logout}>退出登录</button>
      </header>

      <section className="training-toolbar">
        <select value={form.assetClass} onChange={(e) => setForm({ ...form, assetClass: e.target.value })}>
          {assetClasses.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <input
          placeholder="symbol (可选，如 BTCUSDT)"
          value={form.symbol}
          onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
        />
        <select value={form.timeframe} onChange={(e) => setForm({ ...form, timeframe: e.target.value })}>
          {timeframeOptions.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <input type="number" min="30" value={form.contextSize} onChange={(e) => setForm({ ...form, contextSize: e.target.value })} />
        <input type="number" min="5" value={form.targetSize} onChange={(e) => setForm({ ...form, targetSize: e.target.value })} />
        <button onClick={startRandomTraining} disabled={loading}>随机开局</button>
        <button onClick={revealAnswer} disabled={!sessionId || loading}>揭晓答案</button>
      </section>

      {msg && <p className="toolbar-message">{msg}</p>}

      <section className="home-chart-panel">
        <KlineCanvas data={chartData} />
      </section>
    </main>
  )
}
