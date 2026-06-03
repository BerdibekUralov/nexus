"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, X, ChevronDown, ChevronRight, BookOpen, Award, ExternalLink } from "lucide-react"
import Link from "next/link"

interface Course {
  id: string; name: string; platform?: string; certificate?: string
  _count?: { modules: number }; totalUnits: number; completedUnits: number
}

interface Direction {
  id: string; name: string; description?: string; color: string; icon: string; certificate?: string
  courses: Course[]; totalUnits: number; completedUnits: number
}

interface DirectionForm { name: string; description: string; color: string; icon: string }

const PRESET_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]
const inputCls = "w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
const labelCls = "block text-sm text-gray-400 mb-1.5"

export default function KnowledgePage() {
  const [directions, setDirections] = useState<Direction[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState<"create" | "edit" | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<DirectionForm>({ name: "", description: "", color: "#6366f1", icon: "📚" })
  const [saving, setSaving] = useState(false)

  const fetchDirections = async () => {
    setLoading(true)
    const res = await fetch("/api/knowledge/directions")
    if (res.ok) setDirections(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchDirections() }, [])

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const openCreate = () => {
    setForm({ name: "", description: "", color: "#6366f1", icon: "📚" })
    setEditId(null)
    setModal("create")
  }

  const openEdit = (d: Direction, e: React.MouseEvent) => {
    e.stopPropagation()
    setForm({ name: d.name, description: d.description || "", color: d.color, icon: d.icon })
    setEditId(d.id)
    setModal("edit")
  }

  const handleSave = async () => {
    setSaving(true)
    if (modal === "create") {
      await fetch("/api/knowledge/directions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    } else if (editId) {
      await fetch(`/api/knowledge/directions/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    }
    setSaving(false)
    setModal(null)
    fetchDirections()
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await fetch(`/api/knowledge/directions/${deleteId}`, { method: "DELETE" })
    setDeleteId(null)
    fetchDirections()
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Knowledge Base</h1>
          <p className="text-gray-400 text-sm mt-1">{directions.length} direction{directions.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors">
          <Plus size={16} /> New Direction
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-16">Loading...</div>
      ) : directions.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
          <p>No directions yet. Create your first learning direction!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {directions.map(dir => {
            const isOpen = expanded.has(dir.id)
            const progress = dir.totalUnits > 0 ? Math.round((dir.completedUnits / dir.totalUnits) * 100) : 0
            return (
              <div key={dir.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                {/* Direction header */}
                <div
                  className="flex items-center gap-4 p-5 cursor-pointer hover:bg-gray-800/30 transition-colors"
                  onClick={() => toggleExpand(dir.id)}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ backgroundColor: dir.color + "20" }}>
                    {dir.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-white">{dir.name}</h3>
                      {dir.certificate && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400">
                          <Award size={10} /> Certified
                        </span>
                      )}
                    </div>
                    {dir.description && <p className="text-gray-400 text-xs truncate">{dir.description}</p>}
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden max-w-48">
                        <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: dir.color }} />
                      </div>
                      <span className="text-xs text-gray-400">{progress}% · {dir.courses.length} courses</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={(e) => openEdit(dir, e)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteId(dir.id) }} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                      <Trash2 size={13} />
                    </button>
                    {isOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                  </div>
                </div>

                {/* Courses */}
                {isOpen && (
                  <div className="border-t border-gray-800 px-5 pb-4 pt-4">
                    {dir.courses.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-4">No courses yet.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {dir.courses.map(course => {
                          const cp = course.totalUnits > 0 ? Math.round((course.completedUnits / course.totalUnits) * 100) : 0
                          return (
                            <Link key={course.id} href={`/knowledge/${dir.id}/${course.id}`}>
                              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 hover:border-gray-600 hover:bg-gray-800 transition-all group">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm font-medium group-hover:text-indigo-300 transition-colors truncate">{course.name}</p>
                                    {course.platform && <p className="text-gray-400 text-xs mt-0.5">{course.platform}</p>}
                                  </div>
                                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                                    {course.certificate && <Award size={13} className="text-yellow-400" />}
                                    <ExternalLink size={13} className="text-gray-500 group-hover:text-gray-300 transition-colors" />
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 mt-3">
                                  <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${cp}%`, backgroundColor: dir.color }} />
                                  </div>
                                  <span className="text-xs text-gray-500">{cp}%</span>
                                </div>
                              </div>
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
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
              <h2 className="text-lg font-semibold text-white">{modal === "create" ? "New Direction" : "Edit Direction"}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Name</label>
                <input className={inputCls} placeholder="Direction name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea className={inputCls + " resize-none h-20"} placeholder="Optional description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Icon (emoji)</label>
                <input className={inputCls} placeholder="📚" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Color</label>
                <div className="flex gap-2">
                  {PRESET_COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} className={`w-8 h-8 rounded-full border-2 transition-all ${form.color === c ? "border-white scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
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
            <h2 className="text-lg font-semibold text-white mb-2">Delete Direction</h2>
            <p className="text-gray-400 text-sm mb-6">All courses and units inside this direction will be permanently deleted.</p>
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
