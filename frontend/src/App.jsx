import { useEffect, useState } from 'react'

const TOLERANCE_MM = 0.15

const PAGES = [
  { key: 'register', label: '三色偏差' },
]

export default function App() {
  const [username, setUsername] = useState('printer')
  const [password, setPassword] = useState('print123456')
  const [token, setToken] = useState(localStorage.getItem('print_token') || '')
  const [role, setRole] = useState(localStorage.getItem('print_role') || '')
  const [rows, setRows] = useState([])
  const [page, setPage] = useState('register')
  const [sheet, setSheet] = useState('插页-02')
  const [cyan, setCyan] = useState('0.05')
  const [magenta, setMagenta] = useState('0.04')
  const [yellow, setYellow] = useState('0.03')
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
    if (!res.ok) {
      const detail = data?.detail
      throw new Error(
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail) && detail.some((e) => e?.loc?.includes('yellow_mm'))
            ? '必须附带黄版偏差毫米'
            : '请求失败',
      )
    }
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
      setError('必须附带黄版偏差毫米')
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
        <p>提交后接口只入队。另一进程领走偏差并写结论，页面轮询到结论出现。</p>
        <input value={username} onChange={(e) => setUsername(e.target.value)} />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button onClick={enter}>登录</button>
        <p>printer / print123456 可送复核；checker / check123456 只看</p>
      </main>
    )
  }

  return (
    <main>
      <h1>印刷套准复核台</h1>
      <button onClick={leave}>退出</button>

      <nav>
        菜单：
        {PAGES.map((item) => (
          <button key={item.key} onClick={() => setPage(item.key)} disabled={page === item.key}>
            {item.label}
          </button>
        ))}
      </nav>

      {page === 'register' && (
        <section>
          <h2>三色偏差</h2>
          <section className="yellow-note">
            <h3>黄版说明</h3>
            <ul>
              <li>送检必须附带黄版偏差（毫米），缺少黄版直接退回，不进入队列。</li>
              <li>黄版数字随任务进入队列后即锁死，任何人不能修改。</li>
              <li>
                现行允差 {TOLERANCE_MM} mm：青、品、黄三色偏差的绝对值都不超过 {TOLERANCE_MM} mm
                才判套准，任一色超出即套不准。
              </li>
            </ul>
          </section>

          {role === 'writer' ? (
            <section className="submit-bar">
              <h3>送检栏</h3>
              <p>
                印张
                <input value={sheet} onChange={(e) => setSheet(e.target.value)} />
                青偏差(mm)
                <input value={cyan} onChange={(e) => setCyan(e.target.value)} />
                品偏差(mm)
                <input value={magenta} onChange={(e) => setMagenta(e.target.value)} />
                黄偏差(mm)
                <input value={yellow} onChange={(e) => setYellow(e.target.value)} required />
                <button onClick={send}>送复核</button>
              </p>
            </section>
          ) : (
            <p>观察账号：可查看已锁死的三色偏差，无送检栏。</p>
          )}
          {error && <p className="error">{error}</p>}

          <h3>已锁死三色一览总表</h3>
          <table>
            <thead>
              <tr><th>印张</th><th>青(mm)</th><th>品(mm)</th><th>黄(mm)</th><th>状态</th><th>结论</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.sheet}</td>
                  <td>{row.cyan_mm}</td>
                  <td>{row.magenta_mm}</td>
                  <td>{row.yellow_mm}</td>
                  <td>{row.status}</td>
                  <td>
                    {row.verdict || '等待'}
                    {row.reason ? <small>（{row.reason}）</small> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  )
}
