import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import mark from '../../images/aqua-mark.png'
import { apiPost } from '../lib/api'
import { compactWheel, nextPool, type Draw, type Round, type State, type WheelName } from '../lib/giveaway'
import './giveaway-stream.css'

/**
 * Jonli efir barabani (#/giveaway-stream).
 *
 * G'olibni server tanlaydi (giveaway.draw) — bu sahifa natijani tomoshabinga
 * chiroyli ko'rsatadi: bo'lak kattaligi = ochko, aylanish, ovoz, konfetti.
 * Username va to'liq ID ko'rsatilmaydi. Tugmalar: bo'sh joy — aylantirish /
 * davom etish, F — to'liq ekran, M — ovoz, U — oxirgisini bekor qilish, R — yangilash.
 */

const PALETTE = ['#0b4d8a', '#ffcc33', '#1360a8', '#f2a900', '#063a6b', '#ffe07a', '#1f72bf', '#e8920c']
const LIGHT = new Set(['#ffcc33', '#f2a900', '#ffe07a', '#e8920c'])
const R = 500
const SPIN_MS = 9000

type Phase = 'idle' | 'spinning' | 'countdown' | 'reveal'

/** Strimda username/ID ko'rinmasin. */
function screenName(name: string): string {
  if (name.startsWith('@')) return `${name.slice(0, 4)}***`
  if (name.startsWith('ID ')) return 'Ishtirokchi'
  return name.length > 22 ? `${name.slice(0, 21)}…` : name
}
const maskId = (id: string) => (id.length > 4 ? `ID ••••${id.slice(-4)}` : `ID ${id}`)
const roundTitle = (r: Round | undefined) => (!r ? 'Hamma ishtirokchilar orasida' : r.mode === 'top' ? 'Reyting 1-o‘rni' : `TOP-${r.pool} orasida`)

/** Bo'laklar: boshlanish/tugash burchagi ochkoga mutanosib. */
function arcsOf(names: WheelName[]) {
  const sum = names.reduce((s, n) => s + Math.max(1, n.tickets), 0) || 1
  let a = 0
  return names.map((n) => {
    const a0 = a
    a += (Math.max(1, n.tickets) / sum) * 360
    return { a0, a1: a }
  })
}

// ── Ovoz (WebAudio, faylsiz) ──
function useSound() {
  const ctx = useRef<AudioContext | null>(null)
  const [muted, setMutedState] = useState(false)
  const mutedRef = useRef(false)
  const toggleMute = () => { mutedRef.current = !mutedRef.current; setMutedState(mutedRef.current) }
  const audio = () => {
    if (!ctx.current) ctx.current = new AudioContext()
    if (ctx.current.state === 'suspended') void ctx.current.resume()
    return ctx.current
  }
  const tone = useCallback((freq: number, dur: number, type: OscillatorType, vol: number, delay = 0) => {
    if (mutedRef.current) return
    try {
      const c = audio()
      const t = c.currentTime + delay
      const o = c.createOscillator()
      const g = c.createGain()
      o.type = type
      o.frequency.setValueAtTime(freq, t)
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(vol, t + 0.008)
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      o.connect(g).connect(c.destination)
      o.start(t)
      o.stop(t + dur + 0.02)
    } catch { /* ovozsiz ham ishlaydi */ }
  }, [])
  return {
    muted, toggleMute,
    unlock: () => { try { audio() } catch { /* */ } },
    tick: () => tone(1700, 0.035, 'square', 0.035),
    drum: (big = false) => { tone(big ? 70 : 95, 0.35, 'sine', 0.5); tone(big ? 140 : 190, 0.12, 'triangle', 0.15) },
    fanfare: () => {
      ;[523, 659, 784].forEach((f, i) => tone(f, 0.22, 'triangle', 0.18, i * 0.12))
      ;[523, 659, 784, 1047].forEach((f) => tone(f, 1.4, 'triangle', 0.12, 0.38))
      tone(1568, 1.2, 'sine', 0.05, 0.38)
    },
  }
}

// ── Konfetti ──
function burst(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const w = (canvas.width = window.innerWidth * dpr)
  const h = (canvas.height = window.innerHeight * dpr)
  const colors = ['#ffd43b', '#ffffff', '#1f72bf', '#f2a900', '#ff6b6b', '#74c0fc', '#ffe07a']
  type P = { x: number; y: number; vx: number; vy: number; r: number; vr: number; s: number; c: string; round: boolean }
  const parts: P[] = []
  const add = (x: number, y: number, n: number, angle: number, spread: number, speed: number) => {
    for (let i = 0; i < n; i++) {
      const a = angle + (Math.random() - 0.5) * spread
      const v = speed * (0.45 + Math.random() * 0.75) * dpr
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3, s: (6 + Math.random() * 8) * dpr, c: colors[i % colors.length], round: Math.random() < 0.25 })
    }
  }
  add(w / 2, h * 0.42, 180, -Math.PI / 2, Math.PI * 2, 17)
  add(0, h, 110, -Math.PI / 3, 0.6, 30)
  add(w, h, 110, (-2 * Math.PI) / 3, 0.6, 30)
  const t0 = performance.now()
  const frame = (t: number) => {
    ctx.clearRect(0, 0, w, h)
    for (const p of parts) {
      p.vy += 0.32 * dpr
      p.vx *= 0.985
      p.vy *= 0.985
      p.x += p.vx
      p.y += p.vy
      p.r += p.vr
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.r)
      ctx.fillStyle = p.c
      if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.s / 2.4, 0, Math.PI * 2); ctx.fill() } else ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2)
      ctx.restore()
    }
    if (t - t0 < 6000) requestAnimationFrame(frame)
    else ctx.clearRect(0, 0, w, h)
  }
  requestAnimationFrame(frame)
}

export function GiveawayStream() {
  const [state, setState] = useState<State | null>(null)
  const [error, setError] = useState('')
  const [phase, setPhaseState] = useState<Phase>('idle')
  const [spun, setSpun] = useState<WheelName[] | null>(null)
  const [winner, setWinner] = useState<Draw | null>(null)
  const [count, setCount] = useState(0)
  const [revealed, setRevealed] = useState<number | null>(null)
  const [current, setCurrent] = useState(-1)
  const sound = useSound()

  const rotor = useRef<SVGGElement>(null)
  const pointer = useRef<HTMLDivElement>(null)
  const confetti = useRef<HTMLCanvasElement>(null)
  const angle = useRef(0)
  // Ref — tugma/klaviatura ikki marta bosilsa ham bir marta ishlasin
  const phaseRef = useRef<Phase>('idle')
  const setPhase = useCallback((p: Phase) => { phaseRef.current = p; setPhaseState(p) }, [])

  const load = useCallback((resetRevealed = false) =>
    apiPost<State>('action', { action: 'giveaway.get' })
      .then((s) => {
        setState(s)
        setError('')
        setRevealed((r) => (r === null || resetRevealed ? s.draws.length : Math.min(r, s.draws.length)))
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Yuklanmadi')), [])
  useEffect(() => { void load() }, [load])
  // Kutish paytida ishtirokchilar soni yangilanib tursin
  useEffect(() => {
    const id = window.setInterval(() => { if (phaseRef.current === 'idle') void load() }, 30000)
    return () => window.clearInterval(id)
  }, [load])

  const rounds: Round[] = useMemo(() => {
    if (!state) return []
    return state.config.rounds ?? Array.from({ length: state.config.winners }, () => ({ mode: 'draw' as const, pool: 0 }))
  }, [state])
  const shownDraws = state ? state.draws.slice(0, revealed ?? 0) : []
  const nextIndex = shownDraws.length
  const nextRound = rounds[nextIndex] as Round | undefined
  const full = !!state && nextIndex >= rounds.length

  const pool = useMemo(() => (state ? nextPool(state) : []), [state])
  const isTop = state?.config.rounds?.[state.draws.length]?.mode === 'top'
  // Tanlovdan oldin «aniq» bosqichda ism yashirin turadi
  const names: WheelName[] = useMemo(() => spun ?? (isTop ? [{ id: 'mystery', name: '?', username: null, tickets: 1 }] : compactWheel(pool)), [spun, isTop, pool])
  const arcs = useMemo(() => arcsOf(names), [names])

  const reveal = useCallback((d: Draw) => {
    setWinner(d)
    setPhase('reveal')
    setRevealed((r) => (r ?? 0) + 1)
    // Ma'lumot ochilgandan keyin yangilanadi — aylanish paytida keyingi bosqich ko'rinib qolmasin
    void load()
    sound.fanfare()
    if (confetti.current) burst(confetti.current)
  }, [sound, load, setPhase])

  const spin = useCallback(async () => {
    if (phaseRef.current !== 'idle' || !state || full || state.confirmedAt) return
    sound.unlock()
    setPhase('spinning')
    let res: Record<string, unknown>
    try {
      res = await apiPost<Record<string, unknown>>('action', { action: 'giveaway.draw' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tanlanmadi')
      setPhase('idle')
      return
    }
    const d = res.winner as Draw
    const wheel = res.wheel as WheelName[]

    // Reyting 1-o'rni — aniq: 3-2-1 sanoq va ochilish
    if (res.mode === 'top') {
      setPhase('countdown')
      for (const n of [3, 2, 1]) {
        setCount(n)
        sound.drum(n === 1)
        await new Promise((r) => setTimeout(r, 950))
      }
      setCount(0)
      setSpun(wheel)
      reveal(d)
      return
    }

    // Bo'laklarni aralashtiramiz, g'olib bo'lagi ichidagi tasodifiy nuqtada to'xtaymiz
    const order = [...wheel]
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[order[i], order[j]] = [order[j], order[i]]
    }
    const a = arcsOf(order)
    const idx = order.findIndex((n) => n.id === d.id)
    const point = a[idx].a0 + (a[idx].a1 - a[idx].a0) * (0.18 + Math.random() * 0.64)
    setSpun(order)
    const from = angle.current
    const base = from - (((from % 360) + 360) % 360)
    const to = base + 360 * 9 + ((360 - point) % 360)
    const t0 = performance.now()
    let last = -1
    const ease = (t: number) => 1 - Math.pow(1 - t, 4)
    const frame = (now: number) => {
      const t = Math.min(1, (now - t0) / SPIN_MS)
      const value = from + (to - from) * ease(t)
      angle.current = value
      rotor.current?.setAttribute('transform', `rotate(${value})`)
      const under = ((-value % 360) + 360) % 360
      const i = a.findIndex((s) => under >= s.a0 && under < s.a1)
      if (i !== last) {
        last = i
        setCurrent(i)
        sound.tick()
        pointer.current?.animate([{ transform: 'translateX(-50%) rotate(-16deg)' }, { transform: 'translateX(-50%) rotate(0deg)' }], { duration: 140, easing: 'ease-out' })
      }
      if (t < 1) requestAnimationFrame(frame)
      else setTimeout(() => reveal(d), 450)
    }
    requestAnimationFrame(frame)
  }, [state, full, sound, reveal, setPhase])

  const next = useCallback(() => {
    setWinner(null)
    setSpun(null)
    setCurrent(-1)
    setPhase('idle')
  }, [setPhase])

  const undo = useCallback(async () => {
    if (phaseRef.current !== 'idle' || !state?.draws.length) return
    if (!window.confirm(`Oxirgi g‘olib (${state.draws[state.draws.length - 1].name}) bekor qilinsinmi?`)) return
    try {
      await apiPost('action', { action: 'giveaway.undo' })
      await load(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bekor qilinmadi')
    }
  }, [state, load])

  const fullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen?.()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      const k = e.key.toLowerCase()
      if (k === ' ' || k === 'enter') {
        e.preventDefault()
        if (phaseRef.current === 'reveal') next()
        else void spin()
      } else if (k === 'f' || k === 'а') fullscreen()
      else if (k === 'm' || k === 'ь') sound.toggleMute()
      else if (k === 'u' || k === 'г') void undo()
      else if (k === 'r' || k === 'к') { if (phaseRef.current === 'idle') void load(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [spin, next, undo, load, sound])

  if (!state) {
    return <div className="gs gs--loading"><img src={mark} alt="" className="gs-loading-mark" />{error && <p className="gs-error">{error}</p>}</div>
  }

  const prize = state.config.prize || 'Sovg‘a'
  const spinning = phase === 'spinning'
  const panelRows = (() => {
    const total = pool.reduce((s, p) => s + p.tickets, 0) || 1
    const shown = pool.slice(0, 8)
    const rest = pool.slice(8)
    return {
      rows: shown.map((p) => ({ id: p.id, name: screenName(p.name), tickets: p.tickets, pct: (p.tickets / total) * 100 })),
      rest: rest.length ? { n: rest.length, tickets: rest.reduce((s, p) => s + p.tickets, 0), pct: (rest.reduce((s, p) => s + p.tickets, 0) / total) * 100 } : null,
      total,
    }
  })()
  const colorOf = (id: string) => {
    const i = names.findIndex((n) => n.id === id)
    return i < 0 ? '#8a9a91' : names[i].others ? '#8a9a91' : PALETTE[i % PALETTE.length]
  }

  return (
    <div className={`gs${spinning ? ' gs--spinning' : ''}`}>
      <div className="gs-bg" aria-hidden="true">
        <div className="gs-rays" />
        {Array.from({ length: 28 }, (_, i) => (
          <i key={i} className="gs-star" style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53 + 11) % 100}%`, animationDelay: `${(i % 7) * 0.45}s`, transform: `scale(${0.5 + (i % 4) * 0.25})` }} />
        ))}
      </div>

      <header className="gs-head">
        <div className="gs-brand">
          <img src={mark} alt="Aqua Marin" />
          <div>
            <b>AQUA MARIN · KONKURS</b>
            <span>{prize}</span>
          </div>
        </div>
        <div className="gs-stats">
          <div><b>{state.stats.people.toLocaleString('ru-RU')}</b><span>ishtirokchi</span></div>
          <div><b>{state.stats.tickets.toLocaleString('ru-RU')}</b><span>jami ochko</span></div>
          <div><b>{rounds.length}</b><span>sovg‘a</span></div>
        </div>
        <div className="gs-tools">
          <button onClick={() => sound.toggleMute()} title="Ovoz (M)">{sound.muted ? '🔇' : '🔊'}</button>
          <button onClick={fullscreen} title="To‘liq ekran (F)">⛶</button>
        </div>
      </header>

      <main className="gs-main">
        <section className="gs-stage">
          <div className="gs-wheel">
            <div ref={pointer} className="gs-pointer" aria-hidden="true">
              <svg viewBox="0 0 60 80"><defs><linearGradient id="gsPin" x1="0" x2="1"><stop offset="0" stopColor="#ffe9a3" /><stop offset=".5" stopColor="#ffc933" /><stop offset="1" stopColor="#d89a00" /></linearGradient></defs><path d="M30 78 L4 22 A28 28 0 1 1 56 22 Z" fill="url(#gsPin)" stroke="#7a5200" strokeWidth="3" /><circle cx="30" cy="27" r="9" fill="#fff" stroke="#7a5200" strokeWidth="3" /></svg>
            </div>
            <svg viewBox={`${-R - 44} ${-R - 44} ${2 * R + 88} ${2 * R + 88}`} className="gs-svg">
              <defs>
                <radialGradient id="gsShade"><stop offset=".55" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".28" /></radialGradient>
                <linearGradient id="gsRim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff1b8" /><stop offset=".35" stopColor="#f5b800" /><stop offset=".7" stopColor="#b57f00" /><stop offset="1" stopColor="#ffe27a" /></linearGradient>
              </defs>
              <circle r={R + 40} fill="url(#gsRim)" />
              <circle r={R + 6} fill="#041e36" />
              <g ref={rotor}>
                {names.map((n, i) => {
                  const { a0: s0, a1: s1 } = arcs[i]
                  const seg = s1 - s0
                  const r0 = ((s0 - 90) * Math.PI) / 180
                  const r1 = ((s1 - 90) * Math.PI) / 180
                  const color = n.id === 'mystery' ? '#0b4d8a' : n.others ? '#7d8f85' : PALETTE[i % PALETTE.length]
                  const light = LIGHT.has(color)
                  const mid = s0 + seg / 2
                  const path = names.length === 1
                    ? undefined
                    : `M0 0 L${R * Math.cos(r0)} ${R * Math.sin(r0)} A${R} ${R} 0 ${seg > 180 ? 1 : 0} 1 ${R * Math.cos(r1)} ${R * Math.sin(r1)} Z`
                  const fs = seg < 6 ? 22 : seg < 10 ? 28 : seg < 18 ? 36 : 44
                  return (
                    <g key={n.id + i} className={current === i && spinning ? 'gs-slice gs-slice--hot' : 'gs-slice'}>
                      {path ? <path d={path} fill={color} stroke="#fff6d6" strokeWidth={3} /> : <circle r={R} fill={color} />}
                      {names.length === 1 ? (
                        <text y={-R * 0.5} textAnchor="middle" dominantBaseline="middle" className="gs-slice-text" fontSize={n.id === 'mystery' ? 150 : 64} fill="#fff">
                          {n.id === 'mystery' ? '?' : screenName(n.name)}
                        </text>
                      ) : seg >= 3.2 && (
                        <text transform={`rotate(${mid - 90}) translate(${R - 34} 0)`} textAnchor="end" dominantBaseline="middle" className="gs-slice-text" fontSize={fs} fill={light ? '#3a2600' : '#fff'}>
                          {screenName(n.name).slice(0, seg < 10 ? 12 : 18)}
                          <tspan fontSize={fs * 0.72} opacity={0.85}>{'  '}{n.tickets}</tspan>
                        </text>
                      )}
                    </g>
                  )
                })}
              </g>
              <circle r={R + 6} fill="url(#gsShade)" pointerEvents="none" />
              {Array.from({ length: 40 }, (_, i) => {
                const a = (i / 40) * Math.PI * 2
                return <circle key={i} className={`gs-bulb ${i % 2 ? 'gs-bulb--b' : ''}`} cx={(R + 23) * Math.cos(a)} cy={(R + 23) * Math.sin(a)} r={8} />
              })}
              <circle r={112} fill="#fff" stroke="url(#gsRim)" strokeWidth={14} />
              <image href={mark} x={-80} y={-80} width={160} height={160} style={{ clipPath: 'inset(0 round 44px)' }} />
            </svg>
          </div>

          <div className="gs-action">
            {state.confirmedAt ? (
              <p className="gs-done">🎉 Konkurs yakunlandi — g‘oliblarga xabar yuborildi</p>
            ) : full ? (
              <p className="gs-done">🎉 Barcha g‘oliblar aniqlandi!</p>
            ) : spinning ? (
              <p className="gs-luck">🍀 Omad kimga kulib boqarkan…</p>
            ) : phase === 'idle' ? (
              <button className="gs-go" onClick={() => void spin()}>
                {isTop ? `🏆 ${nextIndex + 1}-sovg‘ani ochish` : `🎯 ${nextIndex + 1}-sovg‘ani aylantirish`}
              </button>
            ) : null}
          </div>
        </section>

        <aside className="gs-panel">
          {!full && !state.confirmedAt && (
            <div className="gs-round" key={nextIndex}>
              <span className="gs-chip">{nextIndex + 1}-SOVG‘A</span>
              <h2>{roundTitle(nextRound)}</h2>
              {isTop ? (
                <p>Eng ko‘p ochko to‘plagan ishtirokchiga — baraban kerak emas, g‘olib reyting bo‘yicha aniq.</p>
              ) : (
                <>
                  <p>Bo‘lak kattaligi = ochko. Do‘st ko‘p taklif qilgan — imkoniyati katta.{nextIndex > 0 ? ' Avval yutganlar qatnashmaydi.' : ''}</p>
                  <ul className="gs-list">
                    {panelRows.rows.map((r) => (
                      <li key={r.id} className={spinning && names[current]?.id === r.id ? 'is-hot' : ''}>
                        <i style={{ background: colorOf(r.id) }} />
                        <b>{r.name}</b>
                        <span>{r.tickets} ochko</span>
                        <em>{r.pct < 1 ? r.pct.toFixed(1) : Math.round(r.pct)}%</em>
                        <s style={{ width: `${Math.max(2, r.pct)}%` }} />
                      </li>
                    ))}
                    {panelRows.rest && (
                      <li className="gs-list-rest">
                        <i style={{ background: '#7d8f85' }} />
                        <b>Yana {panelRows.rest.n} kishi</b>
                        <span>{panelRows.rest.tickets} ochko</span>
                        <em>{Math.round(panelRows.rest.pct)}%</em>
                        <s style={{ width: `${Math.max(2, panelRows.rest.pct)}%` }} />
                      </li>
                    )}
                  </ul>
                  <p className="gs-total">Barabanda {pool.length} kishi · {panelRows.total} ochko</p>
                </>
              )}
            </div>
          )}
          {(full || state.confirmedAt) && (
            <div className="gs-round">
              <span className="gs-chip">TABRIKLAYMIZ!</span>
              <h2>G‘oliblar</h2>
              <p>Sovg‘alar egalariga yetkaziladi. Qatnashgan hammaga rahmat! 💚</p>
            </div>
          )}
        </aside>
      </main>

      <footer className="gs-ladder">
        {rounds.map((r, i) => {
          const d = shownDraws[i]
          return (
            <div key={i} className={`gs-step${d ? ' is-won' : ''}${i === nextIndex && !full ? ' is-next' : ''}`}>
              <span>{i + 1}-sovg‘a · {r.mode === 'top' ? 'Reyting 1-o‘rni' : r.pool ? `TOP-${r.pool}` : 'Baraban'}</span>
              <b>{d ? screenName(d.name) : '?'}</b>
              {d && <em>{d.tickets} ochko{d.rank ? ` · ${d.rank}-o‘rin` : ''}</em>}
            </div>
          )
        })}
      </footer>

      {phase === 'countdown' && count > 0 && (
        <div className="gs-count" key={count}><b>{count}</b></div>
      )}

      {phase === 'reveal' && winner && (
        <div className="gs-reveal" onClick={next}>
          <div className="gs-reveal-rays" />
          <div className="gs-card">
            <span className="gs-chip">🎉 {revealed}-G‘OLIB</span>
            <p className="gs-card-round">{winner.mode === 'top' ? 'Reyting 1-o‘rni' : winner.pool ? `TOP-${winner.pool} barabani` : 'Baraban'}</p>
            {/* Uzun ism ham kartaga sig'sin */}
            <h1 style={{ fontSize: `min(11vh, ${(62 / (Math.max(6, screenName(winner.name).length) * 0.68)).toFixed(2)}vw)` }}>{screenName(winner.name)}</h1>
            <p className="gs-card-meta">{winner.tickets} ochko{winner.rank ? ` · reytingda ${winner.rank}-o‘rin` : ''} · {maskId(winner.id)}</p>
            <p className="gs-card-prize">🎁 {prize}</p>
            <small>Davom etish — bo‘sh joy tugmasi</small>
          </div>
        </div>
      )}

      <canvas ref={confetti} className="gs-confetti" />
      {error && <p className="gs-error" onClick={() => setError('')}>{error}</p>}
      <p className="gs-keys">Bo‘sh joy — aylantirish · F — to‘liq ekran · M — ovoz · U — oxirgisini bekor qilish</p>
    </div>
  )
}
