import { useEffect, useState } from 'react'

const TOLERANCE_MM = 0.15

export default function App() {
  const [username, setUsername] = useState('printer')
  const [password, setPassword] = useState('print123456')
  const [token, setToken] = useState(localStorage.getItem('print_token') || '')
  const [role, setRole] = useState(localStorage.getItem('print_role') || '')
  const [rows, setRows] = useState([])
  const [page, setPage] = useState('queue')
  const [sheet, setSheet] = useState('插页-02')
  const [cyan, setCyan] = useState('0.08')
  const [magenta, setMagenta] = useState('0.02')
  const [yellow, setYellow] = useState('0.05')
  const [error, setError] = useState('')

  async function api(path, options = {}) {
    const res = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.detail || '请求失败')
    return data
  }

  async function load() {
    setRows(await api('/api/jobs'))
  }

  useEffect(() => {
    if (!token) return
    load()
    const timer = setInterval(load, 1000)
    return () => clearInterval(timer)
  }, [token])

  async function enter() {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
    localStorage.setItem('print_token', data.access_token)
    localStorage.setItem('print_role', data.role)
    setToken(data.access_token)
    setRole(data.role)
  }

  async function send() {
    setError('')
    if (yellow.trim() === '') {
      setError('缺少黄版偏差，直接退回')
      return
    }
    try {
      await api('/api/jobs', {
        method: 'POST',
        body: JSON.stringify({
          sheet,
          cyan_mm: Number(cyan),
          magenta_mm: Number(magenta),
          yellow_mm: Number(yellow),
        }),
      })
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  function leave() {
    localStorage.clear()
    setToken('')
    setRole('')
  }

  if (!token) {
    return (
      <main>
        <h1>印刷套准复核台</h1>
        <p>提交后接口只入队。另一进程领走偏差并写结论，页面轮询到结论出现。送检必须附带黄版偏差（毫米）。</p>
        <input value={username} onChange={(e) => setUsername(e.target.value)} />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button onClick={enter}>登录</button>
        <p>printer / print123456 可送复核；checker / check123456 只看</p>
      </main>
    )
  }

  const canWrite = role === 'writer'

  const submitBar = (
    <fieldset disabled={!canWrite} style={{ border: '1px solid #999', padding: '8px', margin: '12px 0' }}>
      <legend>送检栏</legend>
      <input value={sheet} onChange={(e) => setSheet(e.target.value)} placeholder="印张" />
      <input value={cyan} onChange={(e) => setCyan(e.target.value)} placeholder="青 mm" />
      <input value={magenta} onChange={(e) => setMagenta(e.target.value)} placeholder="品 mm" />
      <input value={yellow} onChange={(e) => setYellow(e.target.value)} placeholder="黄 mm" />
      <button onClick={send}>送复核</button>
      {!canWrite && <span style={{ marginLeft: '8px' }}>观察账号仅可查看，不能送检入队</span>}
    </fieldset>
  )

  return (
    <main>
      <h1>印刷套准复核台</h1>
      <nav style={{ marginBottom: '12px' }}>
        <button onClick={() => setPage('queue')} disabled={page === 'queue'}>复核队列</button>
        <button onClick={() => setPage('tricolor')} disabled={page === 'tricolor'}>三色偏差</button>
        <button onClick={leave} style={{ marginLeft: '12px' }}>退出</button>
      </nav>

      {page === 'queue' && (
        <section>
          <h2>复核队列</h2>
          <table>
            <thead>
              <tr><th>印张</th><th>青</th><th>品</th><th>黄</th><th>状态</th><th>结论</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.sheet}</td>
                  <td>{row.cyan_mm}</td>
                  <td>{row.magenta_mm}</td>
                  <td>{row.yellow_mm}</td>
                  <td>{row.status}</td>
                  <td>{row.verdict || '等待'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {page === 'tricolor' && (
        <section>
          <h2>三色偏差</h2>
          <p>
            黄版说明：黄版偏差以毫米计，与青、品两版同规。青、品、黄三色偏差的绝对值都不超过现行允差
            {' '}{TOLERANCE_MM}{' '}毫米才判套准，任一色超差即套不准。送检必须附带黄版偏差，缺少黄版直接退回；
            三色数字进入任务后锁死，不可再改。
          </p>
          {submitBar}
          {error && <p>{error}</p>}
          <h3>已锁死三色一览总表</h3>
          <table>
            <thead>
              <tr><th>印张</th><th>青(mm)</th><th>品(mm)</th><th>黄(mm)</th><th>数值</th><th>结论</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.sheet}</td>
                  <td>{row.cyan_mm}</td>
                  <td>{row.magenta_mm}</td>
                  <td>{row.yellow_mm}</td>
                  <td>已锁死</td>
                  <td>{row.verdict || '等待'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  )
}
