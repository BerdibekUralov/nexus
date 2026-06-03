"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, X, Flame, Check } from "lucide-react"

interface HabitLog {
  id: string
  date: string
}

interface Habit {
  id: string
  name: string
  description?: string
  icon: string
  color: string
  goalDays: number
  logs: HabitLog[]
}

interface HabitForm {
  name: string
  description: string
  icon: string
  color: string
  goalDays: number
}

const PRESET_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]
const inputCls = "w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
const labelCls = "block text-sm text-gray-400 mb-1.5"

function getStreak(logs: HabitLog[]): number {
  const dates = new Set(logs.map(l => l.date.split("T")[0]))
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split("T")[0]
    if (dates.has(key)) streak++
    else break
  }
  return streak
}

function getHeatmapData(logs: HabitLog[]): boolean[] {
  const dates = new Set(logs.map(l => l.date.split("T")[0]))
  const today = new Date()
  return Array.from({ length: 84 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (83 - i))
    return dates.has(d.toISOString().split("T")[0])
  })
}

function isTodayCompleted(logs: HabitLog[]): boolean {
  const today = new Date().toISOString().split("T")[0]
  return logs.some(l => l.date.split("T")[0] === today)
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<"create" | "edit" | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<HabitForm>({ name: "", description: "", icon: "🎯", color: "#6366f1", goalDays: 30 })
  const [saving, setSaving] = useState(false)

  const fetchHabits = async () => {
    setLoading(true)
    const res = await fetch("/api/habits")
    if (res.ok) setHabits(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchHabits() }, [])

  const openCreate = () => {
    setForm({ name: "", description: "", icon: "🎯", color: "#6366f1", goalDays: 30 })
    setEditId(null)
    setModal("create")
  }

  const openEdit = (h: Habit) => {
    setForm({ name: h.name, description: h.description || "", icon: h.icon, color: h.color, goalDays: h.goalDays })
    setEditId(h.id)
    setModal("edit")
  }

  const handleSave = async () => {
    setSaving(true)
    if (modal === "create") {
      await fetch("/api/habits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    } else if (editId) {
      await fetch(`/api/habits/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    }
    setSaving(false)
    setModal(null)
    fetchHabits()
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await fetch(`/api/habits/${deleteId}`, { method: "DELETE" })
    setDeleteId(null)
    fetchHabits()
  }

  const toggleToday = async (habit: Habit) => {
    await fetch(`/api/habits/${habit.id}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: new Date().toISOString().split("T")[0] }),
    })
    fetchHabits()
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Habit Tracker</h1>
          <p className="text-gray-400 text-sm mt-1">{habits.filter(h => isTodayCompleted(h.logs)).length}/{habits.length} completed today</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors">
          <Plus size={16} /> New Habit
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-16">Loading...</div>
      ) : habits.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">🎯</p>
          <p>No habits yet. Create your first habit!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {habits.map(habit => {
            const streak = getStreak(habit.logs)
            const completed = isTodayCompleted(habit.logs)
            const heatmap = getHeatmapData(habit.logs)
            const progress = Math.min(100, Math.round((habit.logs.length / habit.goalDays) * 100))

            return (
              <div key={habit.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: habit.color + "20" }}>
                      {habit.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{habit.name}</h3>
                      {habit.description && <p className="text-gray-400 text-xs mt-0.5">{habit.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(habit)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setDeleteId(habit.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Today toggle + streak */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => toggleToday(habit)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      completed
                        ? "text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                    style={completed ? { backgroundColor: habit.color } : {}}
                  >
                    <Check size={14} />
                    {completed ? "Done today" : "Mark done"}
                  </button>
                  <div className="flex items-center gap-1.5 text-orange-400">
                    <Flame size={15} />
                    <span className="text-sm font-semibold">{streak} day streak</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                    <span>{habit.logs.length} / {habit.goalDays} days</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: habit.color }} />
                  </div>
                </div>

                {/* Heatmap */}
                <div>
                  <p className="text-xs text-gray-500 mb-2">Last 12 weeks</p>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 12 }, (_, weekIdx) => (
                      <div key={weekIdx} className="flex flex-col gap-0.5">
                        {Array.from({ length: 7 }, (_, dayIdx) => {
                          const idx = weekIdx * 7 + dayIdx
                          return (
                            <div
                              key={dayIdx}
                              className="w-3 h-3 rounded-sm"
                              style={{ backgroundColor: heatmap[idx] ? habit.color : "#1f2937" }}
                            />
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">{modal === "create" ? "New Habit" : "Edit Habit"}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Name</label>
                <input className={inputCls} placeholder="Habit name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <input className={inputCls} placeholder="Optional description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Icon (emoji)</label>
                <input className={inputCls} placeholder="🎯" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Color</label>
                <div className="flex gap-2">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${form.color === c ? "border-white scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Goal (days)</label>
                <input className={inputCls} type="number" min={1} value={form.goalDays} onChange={e => setForm(f => ({ ...f, goalDays: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50">
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-2">Delete Habit</h2>
            <p className="text-gray-400 text-sm mb-6">All logs for this habit will be permanently deleted.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
