"use client"

import { useState, useEffect, use } from "react"
import { Plus, Pencil, Trash2, X, Tag, Zap, Kanban, ChevronDown, ArrowLeft } from "lucide-react"
import Link from "next/link"

type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE"
type Priority = "MUST" | "SHOULD" | "COULD" | "WONT"
type SprintStatus = "PLANNED" | "ACTIVE" | "COMPLETED"

interface TagItem { id: string; name: string; color: string }
interface Sprint {
  id: string; name: string; goal?: string
  startDate: string; endDate: string; status: SprintStatus
}
interface Task {
  id: string; title: string; description?: string
  status: TaskStatus; priority: Priority
  deadline?: string; tags: { tag: TagItem }[]
  sprintId?: string
}
interface Project {
  id: string; name: string; color: string; type: "KANBAN" | "SPRINT"
  sprints: Sprint[]; tasks: Task[]; tags: TagItem[]
}

const STATUS_COLS: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]
const MOSCOW_COLS: Priority[] = ["MUST", "SHOULD", "COULD", "WONT"]

const STATUS_LABEL: Record<TaskStatus, string> = { TODO: "To Do", IN_PROGRESS: "In Progress", IN_REVIEW: "In Review", DONE: "Done" }
const STATUS_COLOR: Record<TaskStatus, string> = { TODO: "bg-gray-700 text-gray-300", IN_PROGRESS: "bg-blue-500/15 text-blue-400", IN_REVIEW: "bg-yellow-500/15 text-yellow-400", DONE: "bg-green-500/15 text-green-400" }
const PRIORITY_COLOR: Record<Priority, string> = { MUST: "bg-red-500/15 text-red-400", SHOULD: "bg-orange-500/15 text-orange-400", COULD: "bg-blue-500/15 text-blue-400", WONT: "bg-gray-700 text-gray-400" }
const PRIORITY_LABEL: Record<Priority, string> = { MUST: "Must", SHOULD: "Should", COULD: "Could", WONT: "Won't" }

const PRESET_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]
const inputCls = "w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
const labelCls = "block text-sm text-gray-400 mb-1.5"

interface TaskForm { title: string; description: string; deadline: string; priority: Priority; status: TaskStatus; tagIds: string[] }
interface SprintForm { name: string; goal: string; startDate: string; endDate: string; status: SprintStatus }

function TaskCard({ task, onEdit, onDelete }: { task: Task; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 group">
      <div className="flex items-start justify-between gap-2">
        <p className="text-white text-sm font-medium leading-snug">{task.title}</p>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={onEdit} className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"><Pencil size={11} /></button>
          <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"><Trash2 size={11} /></button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLOR[task.priority]}`}>{PRIORITY_LABEL[task.priority]}</span>
        {task.deadline && <span className="text-xs text-gray-500">{new Date(task.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>}
      </div>
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {task.tags.map(t => (
            <span key={t.tag.id} className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: t.tag.color + "20", color: t.tag.color }}>{t.tag.name}</span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"list" | "status" | "moscow">("list")
  const [selectedSprintId, setSelectedSprintId] = useState<string>("all")

  // Task modal
  const [taskModal, setTaskModal] = useState<"create" | "edit" | null>(null)
  const [editTaskId, setEditTaskId] = useState<string | null>(null)
  const [taskForm, setTaskForm] = useState<TaskForm>({ title: "", description: "", deadline: "", priority: "SHOULD", status: "TODO", tagIds: [] })
  const [taskSaving, setTaskSaving] = useState(false)
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null)

  // Sprint modal
  const [sprintModal, setSprintModal] = useState<"create" | "edit" | null>(null)
  const [editSprintId, setEditSprintId] = useState<string | null>(null)
  const [sprintForm, setSprintForm] = useState<SprintForm>({ name: "", goal: "", startDate: "", endDate: "", status: "PLANNED" })
  const [sprintSaving, setSprintSaving] = useState(false)
  const [deleteSprintId, setDeleteSprintId] = useState<string | null>(null)

  // Tag management
  const [tagName, setTagName] = useState("")
  const [tagColor, setTagColor] = useState("#6366f1")
  const [tagSaving, setTagSaving] = useState(false)

  const fetchProject = async () => {
    setLoading(true)
    const res = await fetch(`/api/projects/${id}`)
    if (res.ok) setProject(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchProject() }, [id])

  const filteredTasks = project?.tasks.filter(t =>
    selectedSprintId === "all" ? true : t.sprintId === selectedSprintId
  ) ?? []

  // Task CRUD
  const openCreateTask = () => {
    setTaskForm({ title: "", description: "", deadline: "", priority: "SHOULD", status: "TODO", tagIds: [] })
    setEditTaskId(null)
    setTaskModal("create")
  }

  const openEditTask = (t: Task) => {
    setTaskForm({
      title: t.title, description: t.description || "",
      deadline: t.deadline ? t.deadline.split("T")[0] : "",
      priority: t.priority, status: t.status,
      tagIds: t.tags.map(tt => tt.tag.id)
    })
    setEditTaskId(t.id)
    setTaskModal("edit")
  }

  const handleSaveTask = async () => {
    setTaskSaving(true)
    const body = { ...taskForm, sprintId: selectedSprintId !== "all" ? selectedSprintId : undefined }
    if (taskModal === "create") {
      await fetch(`/api/projects/${id}/tasks`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    } else if (editTaskId) {
      await fetch(`/api/projects/${id}/tasks/${editTaskId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    }
    setTaskSaving(false)
    setTaskModal(null)
    fetchProject()
  }

  const handleDeleteTask = async () => {
    if (!deleteTaskId) return
    await fetch(`/api/projects/${id}/tasks/${deleteTaskId}`, { method: "DELETE" })
    setDeleteTaskId(null)
    fetchProject()
  }

  // Sprint CRUD
  const openCreateSprint = () => {
    setSprintForm({ name: "", goal: "", startDate: "", endDate: "", status: "PLANNED" })
    setEditSprintId(null)
    setSprintModal("create")
  }

  const openEditSprint = (s: Sprint) => {
    setSprintForm({ name: s.name, goal: s.goal || "", startDate: s.startDate.split("T")[0], endDate: s.endDate.split("T")[0], status: s.status })
    setEditSprintId(s.id)
    setSprintModal("edit")
  }

  const handleSaveSprint = async () => {
    setSprintSaving(true)
    if (sprintModal === "create") {
      await fetch(`/api/projects/${id}/sprints`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sprintForm) })
    } else if (editSprintId) {
      await fetch(`/api/projects/${id}/sprints/${editSprintId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sprintForm) })
    }
    setSprintSaving(false)
    setSprintModal(null)
    fetchProject()
  }

  const handleDeleteSprint = async () => {
    if (!deleteSprintId) return
    await fetch(`/api/projects/${id}/sprints/${deleteSprintId}`, { method: "DELETE" })
    setDeleteSprintId(null)
    fetchProject()
  }

  // Tag CRUD
  const handleAddTag = async () => {
    if (!tagName.trim()) return
    setTagSaving(true)
    await fetch(`/api/projects/${id}/tags`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: tagName, color: tagColor }) })
    setTagName("")
    setTagSaving(false)
    fetchProject()
  }

  const handleDeleteTag = async (tagId: string) => {
    await fetch(`/api/projects/${id}/tags/${tagId}`, { method: "DELETE" })
    fetchProject()
  }

  const toggleTagInForm = (tagId: string) => {
    setTaskForm(f => ({
      ...f,
      tagIds: f.tagIds.includes(tagId) ? f.tagIds.filter(t => t !== tagId) : [...f.tagIds, tagId]
    }))
  }

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>
  if (!project) return <div className="p-8 text-gray-400">Project not found</div>

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Link href="/tasks" className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-bold text-white">{project.name}</h1>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
          project.type === "SPRINT" ? "bg-orange-500/15 text-orange-400" : "bg-indigo-500/15 text-indigo-400"
        }`}>
          {project.type === "SPRINT" ? <Zap size={10} /> : <Kanban size={10} />}
          {project.type}
        </span>
      </div>

      {/* Sprint selector (SPRINT type only) */}
      {project.type === "SPRINT" && (
        <div className="flex items-center gap-3 mb-6 mt-4">
          <div className="relative">
            <select
              className="bg-gray-800 border border-gray-700 rounded-lg pl-3 pr-8 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 appearance-none"
              value={selectedSprintId}
              onChange={e => setSelectedSprintId(e.target.value)}
            >
              <option value="all">All sprints</option>
              {project.sprints.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          {selectedSprintId !== "all" && (() => {
            const sprint = project.sprints.find(s => s.id === selectedSprintId)
            return sprint ? (
              <div className="flex gap-2">
                <button onClick={() => openEditSprint(sprint)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"><Pencil size={13} /></button>
                <button onClick={() => setDeleteSprintId(sprint.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"><Trash2 size={13} /></button>
              </div>
            ) : null
          })()}
          <button onClick={openCreateSprint} className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors">
            <Plus size={14} /> New Sprint
          </button>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center justify-between mb-6 mt-4">
        <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1">
          {(["list", "status", "moscow"] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-lg text-sm transition-all ${view === v ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"}`}
            >
              {v === "list" ? "List" : v === "status" ? "Board by Status" : "Board by MoSCoW"}
            </button>
          ))}
        </div>
        <button onClick={openCreateTask} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors">
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* LIST VIEW */}
      {view === "list" && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-6 py-4 text-xs text-gray-400 font-medium uppercase tracking-wider">Title</th>
                <th className="text-left px-6 py-4 text-xs text-gray-400 font-medium uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-4 text-xs text-gray-400 font-medium uppercase tracking-wider">Priority</th>
                <th className="text-left px-6 py-4 text-xs text-gray-400 font-medium uppercase tracking-wider">Deadline</th>
                <th className="text-right px-6 py-4" />
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-gray-500">No tasks yet</td></tr>
              ) : filteredTasks.map((t, i) => (
                <tr key={t.id} className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${i === filteredTasks.length - 1 ? "border-0" : ""}`}>
                  <td className="px-6 py-4 text-white text-sm font-medium">{t.title}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS_COLOR[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full ${PRIORITY_COLOR[t.priority]}`}>{PRIORITY_LABEL[t.priority]}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {t.deadline ? new Date(t.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEditTask(t)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"><Pencil size={13} /></button>
                      <button onClick={() => setDeleteTaskId(t.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* BOARD BY STATUS */}
      {view === "status" && (
        <div className="grid grid-cols-4 gap-4">
          {STATUS_COLS.map(status => {
            const tasks = filteredTasks.filter(t => t.status === status)
            return (
              <div key={status} className="bg-gray-900/50 rounded-2xl p-4 border border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS_COLOR[status]}`}>{STATUS_LABEL[status]}</span>
                    <span className="text-gray-500 text-xs">{tasks.length}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  {tasks.map(t => (
                    <TaskCard key={t.id} task={t} onEdit={() => openEditTask(t)} onDelete={() => setDeleteTaskId(t.id)} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* BOARD BY MOSCOW */}
      {view === "moscow" && (
        <div className="grid grid-cols-4 gap-4">
          {MOSCOW_COLS.map(priority => {
            const tasks = filteredTasks.filter(t => t.priority === priority)
            return (
              <div key={priority} className="bg-gray-900/50 rounded-2xl p-4 border border-gray-800">
                <div className="flex items-center gap-2 mb-4">
                  <span className={`text-xs px-2.5 py-1 rounded-full ${PRIORITY_COLOR[priority]}`}>{PRIORITY_LABEL[priority]}</span>
                  <span className="text-gray-500 text-xs">{tasks.length}</span>
                </div>
                <div className="space-y-2">
                  {tasks.map(t => (
                    <TaskCard key={t.id} task={t} onEdit={() => openEditTask(t)} onDelete={() => setDeleteTaskId(t.id)} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Tag management section */}
      <div className="mt-8 bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Tag size={16} className="text-gray-400" />
          <h2 className="text-sm font-semibold text-white">Tags</h2>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {project.tags.map(tag => (
            <div key={tag.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs" style={{ backgroundColor: tag.color + "20", color: tag.color }}>
              {tag.name}
              <button onClick={() => handleDeleteTag(tag.id)} className="hover:opacity-70 transition-opacity ml-0.5">
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 w-48"
            placeholder="Tag name"
            value={tagName}
            onChange={e => setTagName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAddTag()}
          />
          <div className="flex gap-1.5">
            {PRESET_COLORS.map(c => (
              <button key={c} onClick={() => setTagColor(c)} className={`w-6 h-6 rounded-full border-2 transition-all ${tagColor === c ? "border-white" : "border-transparent"}`} style={{ backgroundColor: c }} />
            ))}
          </div>
          <button onClick={handleAddTag} disabled={tagSaving || !tagName.trim()} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50">
            Add
          </button>
        </div>
      </div>

      {/* Task Modal */}
      {taskModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">{taskModal === "create" ? "New Task" : "Edit Task"}</h2>
              <button onClick={() => setTaskModal(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Title</label>
                <input className={inputCls} placeholder="Task title" value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea className={inputCls + " resize-none h-20"} placeholder="Optional description" value={taskForm.description} onChange={e => setTaskForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Deadline</label>
                <input type="date" className={inputCls} value={taskForm.deadline} onChange={e => setTaskForm(f => ({ ...f, deadline: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Priority (MoSCoW)</label>
                <div className="grid grid-cols-4 gap-2">
                  {(["MUST", "SHOULD", "COULD", "WONT"] as Priority[]).map(p => (
                    <button key={p} onClick={() => setTaskForm(f => ({ ...f, priority: p }))} className={`py-2 rounded-lg text-xs font-medium border transition-all ${taskForm.priority === p ? "border-indigo-500 bg-indigo-500/10 text-indigo-300" : "border-gray-700 bg-gray-800 text-gray-400"}`}>
                      {PRIORITY_LABEL[p]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select className={inputCls} value={taskForm.status} onChange={e => setTaskForm(f => ({ ...f, status: e.target.value as TaskStatus }))}>
                  {STATUS_COLS.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </div>
              {project.tags.length > 0 && (
                <div>
                  <label className={labelCls}>Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {project.tags.map(tag => (
                      <button
                        key={tag.id}
                        onClick={() => toggleTagInForm(tag.id)}
                        className={`px-2.5 py-1 rounded-full text-xs transition-all border ${taskForm.tagIds.includes(tag.id) ? "border-white/30" : "border-transparent opacity-50"}`}
                        style={{ backgroundColor: tag.color + "20", color: tag.color }}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setTaskModal(null)} className="flex-1 py-2.5 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors">Cancel</button>
              <button onClick={handleSaveTask} disabled={taskSaving || !taskForm.title} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50">
                {taskSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sprint Modal */}
      {sprintModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">{sprintModal === "create" ? "New Sprint" : "Edit Sprint"}</h2>
              <button onClick={() => setSprintModal(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Name</label>
                <input className={inputCls} placeholder="Sprint name" value={sprintForm.name} onChange={e => setSprintForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Goal</label>
                <input className={inputCls} placeholder="Sprint goal" value={sprintForm.goal} onChange={e => setSprintForm(f => ({ ...f, goal: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Start Date</label>
                  <input type="date" className={inputCls} value={sprintForm.startDate} onChange={e => setSprintForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div>
                  <label className={labelCls}>End Date</label>
                  <input type="date" className={inputCls} value={sprintForm.endDate} onChange={e => setSprintForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select className={inputCls} value={sprintForm.status} onChange={e => setSprintForm(f => ({ ...f, status: e.target.value as SprintStatus }))}>
                  <option value="PLANNED">Planned</option>
                  <option value="ACTIVE">Active</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setSprintModal(null)} className="flex-1 py-2.5 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors">Cancel</button>
              <button onClick={handleSaveSprint} disabled={sprintSaving || !sprintForm.name} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50">
                {sprintSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Task Confirmation */}
      {deleteTaskId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-2">Delete Task</h2>
            <p className="text-gray-400 text-sm mb-6">This task will be permanently deleted.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTaskId(null)} className="flex-1 py-2.5 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors">Cancel</button>
              <button onClick={handleDeleteTask} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Sprint Confirmation */}
      {deleteSprintId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-2">Delete Sprint</h2>
            <p className="text-gray-400 text-sm mb-6">Tasks in this sprint will not be deleted, but will be unlinked from this sprint.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteSprintId(null)} className="flex-1 py-2.5 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors">Cancel</button>
              <button onClick={handleDeleteSprint} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
