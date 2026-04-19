import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import KlineCanvas from '../components/KlineCanvas'
import { clearAuth, getEmail } from '../stores/authStore'
import client from '../api/client'

const timeframeOptions = ['M15', 'M30', 'H1', 'H2', 'H4', 'D1', 'D2', 'W1', 'MN1']
const assetClasses = ['FUTURES', 'STOCK', 'FOREX', 'CRYPTO', 'GOLD']

const initialForm = { assetClass: 'STOCK', symbol: '', timeframe: 'D1', contextSize: 120, targetSize: 300 }

export default function HomePage() {
  const navigate = useNavigate()
  const [sessionId, setSessionId] = useState(null)
  const [panel, setPanel] = useState(null)
  const [quantity, setQuantity] = useState(1000)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState(initialForm)
  const [history, setHistory] = useState([])

  const chartData = useMemo(() => (panel?.visibleCandles || []).map((item) => ({
    timestamp: item.timestamp,
    open: Number(item.open),
    high: Number(item.high),
    low: Number(item.low),
    close: Number(item.close),
    volume: Number(item.volume)
  })), [panel])

  const logout = () => {
    clearAuth()
    navigate('/login')
  }

  const startRandomTraining = async () => {
    setLoading(true)
    setMsg('')
    try {
      const { data } = await client.post('/training/random', {
        ...form,
        symbol: form.symbol || null,
        contextSize: Number(form.contextSize),
        targetSize: Number(form.targetSize)
      })
      setSessionId(data.sessionId)
      const panelRes = await client.get(`/training/${data.sessionId}/panel`)
      setPanel(panelRes.data)
      setMsg(`训练已开始：${data.symbol} ${data.timeframe}`)
    } catch (error) {
      setMsg(error.response?.data?.message || '创建训练失败')
    } finally {
      setLoading(false)
    }
  }

  const doAction = async (action) => {
    if (!sessionId) return
    setLoading(true)
    try {
      const { data } = await client.post(`/training/${sessionId}/action`, {
        action,
        quantity: Number(quantity)
      })
      setPanel(data)
    } catch (error) {
      setMsg(error.response?.data?.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  const fetchHistory = async () => {
    try {
      const { data } = await client.get('/training/history')
      setHistory(data)
    } catch (error) {
      setMsg(error.response?.data?.message || '获取历史失败')
    }
  }

  return (
    <main className="home-wrapper">
      <header className="home-header">
        <div className="home-brand">K线模拟学习系统</div>
        <nav className="menu-row">
          <button onClick={fetchHistory}>历史记录</button>
          <button className="primary" onClick={startRandomTraining} disabled={loading}>加入训练</button>
          <button onClick={logout}>退出</button>
        </nav>
      </header>

      <section className="training-toolbar">
        <select value={form.assetClass} onChange={(e) => setForm({ ...form, assetClass: e.target.value })}>
          {assetClasses.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })} placeholder="symbol 可选" />
        <select value={form.timeframe} onChange={(e) => setForm({ ...form, timeframe: e.target.value })}>
          {timeframeOptions.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <input type="number" min="30" value={form.contextSize} onChange={(e) => setForm({ ...form, contextSize: e.target.value })} />
        <input type="number" min="30" value={form.targetSize} onChange={(e) => setForm({ ...form, targetSize: e.target.value })} />
      </section>

      {msg && <p className="toolbar-message">{msg}</p>}

      <section className="training-layout">
        <div className="chart-area">
          <KlineCanvas data={chartData} />
        </div>

        <aside className="side-panel">
          <h3>训练控制</h3>
          <div className="card">
            <p>训练进度：{panel ? `${panel.currentStep}/${panel.totalBars}` : '--'}</p>
            <p>周期：{panel?.timeframe || '--'}</p>
            <p>当前价格：{panel?.lastPrice ?? '--'}</p>
            <p>账户总盈亏：{panel?.totalPnl ?? '--'}</p>
          </div>

          <div className="card">
            <label>数量</label>
            <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            <div className="btn-grid">
              <button className="buy" onClick={() => doAction('BUY')}>买涨</button>
              <button className="sell" onClick={() => doAction('SHORT')}>卖出/做空</button>
              <button className="buy2" onClick={() => doAction('SELL')}>平多</button>
              <button className="sell2" onClick={() => doAction('COVER')}>平空</button>
            </div>
            <button className="next" onClick={() => doAction('NEXT_BAR')}>下一条</button>
            <div className="btn-grid">
              <button onClick={() => doAction('RESTART')}>重新开始</button>
              <button onClick={() => doAction('FINISH')}>结束</button>
            </div>
          </div>

          <div className="card">
            <h4>历史记录</h4>
            <ul className="history-list">
              {history.map((item) => (
                <li key={item.sessionId}>#{item.sessionId} {item.symbol} {item.timeframe} PnL:{item.totalPnl}</li>
              ))}
            </ul>
          </div>
        </aside>
      </section>
    </main>
  )
}
