"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, Shield, User as UserIcon, X } from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  role: "USER" | "ADMIN"
  createdAt: string
}

interface UserForm {
  name: string
  email: string
  password: string
  role: "USER" | "ADMIN"
}

const inputCls = "w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
const labelCls = "block text-sm text-gray-400 mb-1.5"

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<"create" | "edit" | null>(null)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<UserForm>({ name: "", email: "", password: "", role: "USER" })
  const [saving, setSaving] = useState(false)

  const fetchUsers = async () => {
    setLoading(true)
    const res = await fetch("/api/admin/users")
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const openCreate = () => {
    setForm({ name: "", email: "", password: "", role: "USER" })
    setEditUser(null)
    setModal("create")
  }

  const openEdit = (u: User) => {
    setForm({ name: u.name, email: u.email, password: "", role: u.role })
    setEditUser(u)
    setModal("edit")
  }

  const handleSave = async () => {
    setSaving(true)
    if (modal === "create") {
      await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    } else if (editUser) {
      const body: Record<string, string> = { name: form.name, email: form.email, role: form.role }
      if (form.password) body.password = form.password
      await fetch(`/api/admin/users/${editUser.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    }
    setSaving(false)
    setModal(null)
    fetchUsers()
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await fetch(`/api/admin/users/${deleteId}`, { method: "DELETE" })
    setDeleteId(null)
    fetchUsers()
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-gray-400 text-sm mt-1">User management</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors">
          <Plus size={16} /> Add User
        </button>
      </div>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-6 py-4 text-xs text-gray-400 font-medium uppercase tracking-wider">Name</th>
              <th className="text-left px-6 py-4 text-xs text-gray-400 font-medium uppercase tracking-wider">Email</th>
              <th className="text-left px-6 py-4 text-xs text-gray-400 font-medium uppercase tracking-wider">Role</th>
              <th className="text-left px-6 py-4 text-xs text-gray-400 font-medium uppercase tracking-wider">Created</th>
              <th className="text-right px-6 py-4 text-xs text-gray-400 font-medium uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-500">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-gray-500">No users found</td></tr>
            ) : users.map((u, i) => (
              <tr key={u.id} className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${i === users.length - 1 ? "border-0" : ""}`}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center">
                      <UserIcon size={14} className="text-indigo-400" />
                    </div>
                    <span className="text-white font-medium text-sm">{u.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-400 text-sm">{u.email}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    u.role === "ADMIN" ? "bg-purple-500/15 text-purple-400" : "bg-gray-700 text-gray-300"
                  }`}>
                    {u.role === "ADMIN" && <Shield size={10} />}
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-400 text-sm">
                  {new Date(u.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(u)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeleteId(u.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">{modal === "create" ? "Add User" : "Edit User"}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Name</label>
                <input className={inputCls} placeholder="Full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input className={inputCls} type="email" placeholder="email@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>{modal === "edit" ? "New Password (optional)" : "Password"}</label>
                <input className={inputCls} type="password" placeholder={modal === "edit" ? "Leave blank to keep unchanged" : "Password"} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Role</label>
                <select className={inputCls} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as "USER" | "ADMIN" }))}>
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50">
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
            <h2 className="text-lg font-semibold text-white mb-2">Delete User</h2>
            <p className="text-gray-400 text-sm mb-6">This action cannot be undone. The user and all their data will be permanently deleted.</p>
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
