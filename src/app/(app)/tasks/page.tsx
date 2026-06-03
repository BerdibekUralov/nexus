"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, X, Kanban, Zap, ChevronRight } from "lucide-react"
import Link from "next/link"

interface Project {
  id: string
  name: string
  description?: string
  color: string
  type: "KANBAN" | "SPRINT"
  _count: { tasks: number }
}

interface ProjectForm {
  name: string
  description: string
  color: string
  type: "KANBAN" | "SPRINT"
}

const PRESET_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]
const inputCls = "w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
const labelCls = "block text-sm text-gray-400 mb-1.5"

export default function TasksPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<"create" | "edit" | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<ProjectForm>({ name: "", description: "", color: "#6366f1", type: "KANBAN" })
  const [saving, setSaving] = useState(false)

  const fetchProjects = async () => {
    setLoading(true)
    const res = await fetch("/api/projects")
    if (res.ok) setProjects(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchProjects() }, [])

  const openCreate = () => {
    setForm({ name: "", description: "", color: "#6366f1", type: "KANBAN" })
    setEditId(null)
    setModal("create")
  }

  const openEdit = (p: Project, e: React.MouseEvent) => {
    e.preventDefault()
    setForm({ name: p.name, description: p.description || "", color: p.color, type: p.type })
    setEditId(p.id)
    setModal("edit")
  }

  const handleSave = async () => {
    setSaving(true)
    if (modal === "create") {
      await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    } else if (editId) {
      await fetch(`/api/projects/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    }
    setSaving(false)
    setModal(null)
    fetchProjects()
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await fetch(`/api/projects/${deleteId}`, { method: "DELETE" })
    setDeleteId(null)
    fetchProjects()
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Task Management</h1>
          <p className="text-gray-400 text-sm mt-1">{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors">
          <Plus size={16} /> New Project
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-16">Loading...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Kanban size={40} className="mx-auto mb-3 opacity-30" />
          <p>No projects yet. Create your first project!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map(p => (
            <Link key={p.id} href={`/tasks/${p.id}`}>
              <div className="group bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 transition-all cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl" style={{ backgroundColor: p.color + "25" }}>
                      <div className="w-full h-full rounded-xl flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white group-hover:text-indigo-300 transition-colors">{p.name}</h3>
                      {p.description && <p className="text-gray-400 text-xs mt-0.5 line-clamp-1">{p.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => openEdit(p, e)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={(e) => { e.preventDefault(); setDeleteId(p.id) }} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      p.type === "SPRINT" ? "bg-orange-500/15 text-orange-400" : "bg-indigo-500/15 text-indigo-400"
                    }`}>
                      {p.type === "SPRINT" ? <Zap size={10} /> : <Kanban size={10} />}
                      {p.type}
                    </span>
                    <span className="text-gray-400 text-xs">{p._count.tasks} task{p._count.tasks !== 1 ? "s" : ""}</span>
                  </div>
                  <ChevronRight size={16} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">{modal === "create" ? "New Project" : "Edit Project"}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Name</label>
                <input className={inputCls} placeholder="Project name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea className={inputCls + " resize-none h-20"} placeholder="Optional description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
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
                <label className={labelCls}>Type</label>
                <div className="flex gap-3">
                  {(["KANBAN", "SPRINT"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setForm(f => ({ ...f, type: t }))}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                        form.type === t ? "border-indigo-500 bg-indigo-500/10 text-indigo-300" : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                      }`}
                    >
                      {t === "KANBAN" ? <><Kanban size={14} className="inline mr-1.5" />Kanban</> : <><Zap size={14} className="inline mr-1.5" />Sprint</>}
                    </button>
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
            <h2 className="text-lg font-semibold text-white mb-2">Delete Project</h2>
            <p className="text-gray-400 text-sm mb-6">All tasks and data inside this project will be permanently deleted.</p>
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
