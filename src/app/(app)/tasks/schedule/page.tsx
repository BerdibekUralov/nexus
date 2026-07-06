"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronLeft, ChevronRight, Plus, X, Trash2, ArrowLeft } from "lucide-react"
import Link from "next/link"

// ── Types ──────────────────────────────────────────────────────────────────

interface Project { id: string; name: string; color: string }
interface Task { id: string; title: string; status: string; priority: string; project: Project }
interface TimeBlock {
  id: string
  taskId: string | null
  title: string | null
  date: string
  startMin: number
  endMin: number
  color: string
  task: (Task & { project: Project }) | null
}

// ── Constants ──────────────────────────────────────────────────────────────

const HOUR_START = 6   // 06:00
const HOUR_END   = 23  // 23:00 (exclusive, shows up to 23:00 line)
const HOUR_PX    = 64  // px per hour
const MIN_PX     = HOUR_PX / 60

const PRESET_COLORS = ["#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#f97316","#ec4899"]
const STATUS_COLOR: Record<string, string> = {
  TODO: "bg-gray-700 text-gray-300",
  IN_PROGRESS: "bg-blue-500/15 text-blue-400",
  IN_REVIEW: "bg-yellow-500/15 text-yellow-400",
  DONE: "bg-green-500/15 text-green-400",
}
const PRIORITY_DOT: Record<string, string> = {
  MUST: "bg-red-400", SHOULD: "bg-orange-400", COULD: "bg-blue-400", WONT: "bg-gray-500",
}

// ── Helpers ────────────────────────────────────────────────────────────────

function localDateStr(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function minToTime(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

function timeToMin(t: string) {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

function snapMin(min: number, snap = 15) {
  return Math.round(min / snap) * snap
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const [selDate, setSelDate] = useState(localDateStr(new Date()))
  const [blocks, setBlocks] = useState<TimeBlock[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  // Modal state
  const [modal, setModal] = useState<{ mode: "create" | "edit"; block?: TimeBlock; startMin?: number } | null>(null)
  const [form, setForm] = useState({ taskId: "", title: "", startTime: "09:00", endTime: "10:00", color: "#6366f1" })

  // Drag-to-create
  const gridRef = useRef<HTMLDivElement>(null)
  const dragStart = useRef<number | null>(null)

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchBlocks = async () => {
    setLoading(true)
    const res = await fetch(`/api/schedule?date=${selDate}`)
    if (res.ok) setBlocks(await res.json())
    setLoading(false)
  }

  const fetchTasks = async () => {
    // fetch all projects then all their tasks
    const res = await fetch("/api/projects")
    if (!res.ok) return
    const projects: Project[] = await res.json()
    const all: Task[] = []
    await Promise.all(projects.map(async p => {
      const r = await fetch(`/api/projects/${p.id}`)
      if (!r.ok) return
      const data = await r.json()
      data.tasks.forEach((t: Task) => all.push({ ...t, project: p }))
    }))
    setTasks(all.filter(t => t.status !== "DONE"))
  }

  useEffect(() => { fetchBlocks() }, [selDate])
  useEffect(() => { fetchTasks() }, [])

  // ── Navigate date ────────────────────────────────────────────────────────

  const shiftDate = (delta: number) => {
    const d = new Date(selDate)
    d.setDate(d.getDate() + delta)
    setSelDate(localDateStr(d))
  }

  const isToday = selDate === localDateStr(new Date())

  // ── Open modal ───────────────────────────────────────────────────────────

  const openCreate = (startMin?: number) => {
    const start = snapMin(startMin ?? 9 * 60)
    const end = Math.min(start + 60, HOUR_END * 60)
    setForm({ taskId: "", title: "", startTime: minToTime(start), endTime: minToTime(end), color: "#6366f1" })
    setModal({ mode: "create", startMin: start })
  }

  const openEdit = (block: TimeBlock) => {
    setForm({
      taskId: block.taskId ?? "",
      title: block.title ?? "",
      startTime: minToTime(block.startMin),
      endTime: minToTime(block.endMin),
      color: block.color,
    })
    setModal({ mode: "edit", block })
  }

  const handleTaskPick = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    setForm(f => ({
      ...f,
      taskId,
      title: "",
      color: task?.project.color ?? f.color,
    }))
  }

  // ── Save / Delete ────────────────────────────────────────────────────────

  const handleSave = async () => {
    const startMin = timeToMin(form.startTime)
    const endMin   = timeToMin(form.endTime)
    if (endMin <= startMin) return

    const body = {
      taskId: form.taskId || null,
      title: form.taskId ? null : (form.title || null),
      date: selDate,
      startMin,
      endMin,
      color: form.color,
    }

    if (modal?.mode === "create") {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const b = await res.json()
        setBlocks(prev => [...prev, b].sort((a, b) => a.startMin - b.startMin))
      }
    } else if (modal?.block) {
      const res = await fetch(`/api/schedule/${modal.block.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const b = await res.json()
        setBlocks(prev => prev.map(x => x.id === b.id ? b : x).sort((a, b) => a.startMin - b.startMin))
      }
    }
    setModal(null)
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/schedule/${id}`, { method: "DELETE" })
    setBlocks(prev => prev.filter(b => b.id !== id))
    setModal(null)
  }

  // ── Drag-to-create on grid ───────────────────────────────────────────────

  const gridMinFromY = (y: number) => {
    const rect = gridRef.current?.getBoundingClientRect()
    if (!rect) return null
    const relY = y - rect.top
    const min = Math.floor(relY / MIN_PX) + HOUR_START * 60
    return Math.max(HOUR_START * 60, Math.min(HOUR_END * 60 - 15, snapMin(min)))
  }

  const handleGridMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".time-block-card")) return
    dragStart.current = gridMinFromY(e.clientY)
  }

  const handleGridMouseUp = (e: React.MouseEvent) => {
    if (dragStart.current == null) return
    const endMin = gridMinFromY(e.clientY)
    const startMin = dragStart.current
    dragStart.current = null
    if (endMin == null) return
    const start = Math.min(startMin, endMin)
    const end = Math.max(startMin, endMin)
    if (end - start < 15) {
      openCreate(start)
    } else {
      const s = snapMin(start)
      const en = snapMin(end)
      setForm({ taskId: "", title: "", startTime: minToTime(s), endTime: minToTime(en), color: "#6366f1" })
      setModal({ mode: "create", startMin: s })
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)
  const totalPx = hours.length * HOUR_PX

  // Current time indicator
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const nowPx = (nowMin - HOUR_START * 60) * MIN_PX

  const displayLabel = (block: TimeBlock) =>
    block.task?.title ?? block.title ?? "Untitled"

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">

      {/* ── Left: Task list ───────────────────────────────────────────────── */}
      <aside className="w-72 flex-shrink-0 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800 flex items-center gap-3">
          <Link href="/tasks" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <h2 className="text-sm font-semibold text-white">Tasks</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {tasks.length === 0 ? (
            <p className="text-gray-600 text-xs text-center py-8">No open tasks</p>
          ) : tasks.map(t => (
            <div
              key={t.id}
              onClick={() => openCreate()}
              className="bg-gray-900 border border-gray-800 rounded-xl p-3 cursor-pointer hover:border-gray-600 transition-colors group"
            >
              <div className="flex items-start gap-2">
                <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[t.priority]}`} />
                <div className="min-w-0">
                  <p className="text-white text-xs font-medium leading-snug truncate">{t.title}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: t.project.color + "20", color: t.project.color }}>
                      {t.project.name}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLOR[t.status]}`}>
                      {t.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); handleTaskPick(t.id); openCreate() }}
                className="mt-2 w-full text-xs text-indigo-400 hover:text-indigo-300 opacity-0 group-hover:opacity-100 transition-opacity text-left"
              >
                + Schedule this task
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Right: Calendar ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => shiftDate(-1)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
              <ChevronLeft size={18} />
            </button>
            <div>
              <h1 className="text-white font-semibold">
                {new Date(selDate + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </h1>
              {isToday && <span className="text-xs text-indigo-400">Today</span>}
            </div>
            <button onClick={() => shiftDate(1)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            {!isToday && (
              <button onClick={() => setSelDate(localDateStr(new Date()))} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                Today
              </button>
            )}
            <button
              onClick={() => openCreate()}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500 transition-colors"
            >
              <Plus size={15} /> New Block
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex">
            {/* Time labels */}
            <div className="w-16 flex-shrink-0 select-none">
              <div style={{ height: totalPx }} className="relative">
                {hours.map(h => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 flex items-start justify-end pr-2"
                    style={{ top: (h - HOUR_START) * HOUR_PX - 8 }}
                  >
                    <span className="text-xs text-gray-600">{String(h).padStart(2, "0")}:00</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Grid body */}
            <div
              ref={gridRef}
              className="flex-1 relative select-none cursor-crosshair"
              style={{ height: totalPx }}
              onMouseDown={handleGridMouseDown}
              onMouseUp={handleGridMouseUp}
            >
              {/* Hour lines */}
              {hours.map(h => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-t border-gray-800/60"
                  style={{ top: (h - HOUR_START) * HOUR_PX }}
                />
              ))}
              {/* Half-hour lines */}
              {hours.map(h => (
                <div
                  key={h + "h"}
                  className="absolute left-0 right-0 border-t border-gray-800/30"
                  style={{ top: (h - HOUR_START) * HOUR_PX + HOUR_PX / 2 }}
                />
              ))}

              {/* Current time indicator */}
              {isToday && nowMin >= HOUR_START * 60 && nowMin <= HOUR_END * 60 && (
                <div
                  className="absolute left-0 right-0 z-10 pointer-events-none"
                  style={{ top: nowPx }}
                >
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                    <div className="flex-1 h-px bg-red-500" />
                  </div>
                </div>
              )}

              {/* Time blocks */}
              {blocks.map(block => {
                const top    = (block.startMin - HOUR_START * 60) * MIN_PX
                const height = Math.max((block.endMin - block.startMin) * MIN_PX, 20)
                const label  = displayLabel(block)
                const short  = height < 40
                return (
                  <div
                    key={block.id}
                    className="time-block-card absolute left-1 right-1 rounded-lg px-2 py-1 cursor-pointer hover:brightness-110 transition-all overflow-hidden border border-white/10"
                    style={{ top, height, backgroundColor: block.color + "cc" }}
                    onClick={e => { e.stopPropagation(); openEdit(block) }}
                  >
                    <p className={`text-white font-medium truncate leading-tight ${short ? "text-xs" : "text-sm"}`}>
                      {label}
                    </p>
                    {!short && (
                      <p className="text-white/70 text-xs mt-0.5">
                        {minToTime(block.startMin)} – {minToTime(block.endMin)}
                      </p>
                    )}
                  </div>
                )
              })}

              {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-gray-600 text-sm">Loading...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-800 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">
                {modal.mode === "create" ? "New Time Block" : "Edit Time Block"}
              </h2>
              <button onClick={() => setModal(null)} className="text-gray-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Task picker */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Link to Task (optional)</label>
                <select
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
                  value={form.taskId}
                  onChange={e => {
                    if (e.target.value) handleTaskPick(e.target.value)
                    else setForm(f => ({ ...f, taskId: "" }))
                  }}
                >
                  <option value="">— No task (free block) —</option>
                  {tasks.map(t => (
                    <option key={t.id} value={t.id}>{t.project.name} › {t.title}</option>
                  ))}
                </select>
              </div>

              {/* Title (only if no task) */}
              {!form.taskId && (
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Title</label>
                  <input
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Deep work, Meeting..."
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  />
                </div>
              )}

              {/* Time range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Start</label>
                  <input
                    type="time"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
                    value={form.startTime}
                    onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">End</label>
                  <input
                    type="time"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
                    value={form.endTime}
                    onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                  />
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">Color</label>
                <div className="flex gap-2">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? "border-white scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              {modal.mode === "edit" && modal.block && (
                <button
                  onClick={() => handleDelete(modal.block!.id)}
                  className="p-2.5 text-red-400 hover:bg-red-400/10 rounded-xl transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )}
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 bg-gray-800 text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!form.taskId && !form.title}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-500 transition-colors disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
