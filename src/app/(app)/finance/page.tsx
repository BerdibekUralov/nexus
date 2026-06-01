"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, X, TrendingUp, TrendingDown, Wallet, Tag } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

type PeriodType = "daily" | "weekly" | "monthly" | "quarterly" | "yearly"
type TransactionType = "INCOME" | "EXPENSE"

interface Category {
  id: string; name: string; icon: string; color: string; type: TransactionType
}
interface Transaction {
  id: string; amount: number; type: TransactionType; note?: string
  date: string; category: Category
}
interface Budget {
  id: string; amount: number; month: number; year: number
  category: Category; spent: number
}

const inputCls = "w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
const labelCls = "block text-sm text-gray-400 mb-1.5"
const PRESET_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]

function formatMoney(n: number) {
  return n.toLocaleString("ru-RU") + " so'm"
}

function getPeriodRange(period: PeriodType, month: number, year: number): { start: string; end: string } {
  const now = new Date()
  if (period === "daily") {
    const d = now.toISOString().split("T")[0]
    return { start: d, end: d }
  }
  if (period === "weekly") {
    const day = now.getDay() || 7
    const mon = new Date(now); mon.setDate(now.getDate() - day + 1)
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
    return { start: mon.toISOString().split("T")[0], end: sun.toISOString().split("T")[0] }
  }
  if (period === "monthly") {
    const start = new Date(year, month - 1, 1).toISOString().split("T")[0]
    const end = new Date(year, month, 0).toISOString().split("T")[0]
    return { start, end }
  }
  if (period === "quarterly") {
    const q = Math.floor((now.getMonth()) / 3)
    const start = new Date(now.getFullYear(), q * 3, 1).toISOString().split("T")[0]
    const end = new Date(now.getFullYear(), q * 3 + 3, 0).toISOString().split("T")[0]
    return { start, end }
  }
  // yearly
  return {
    start: new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0],
    end: new Date(now.getFullYear(), 11, 31).toISOString().split("T")[0]
  }
}

interface TxForm { amount: string; type: TransactionType; categoryId: string; date: string; note: string }
interface CatForm { name: string; icon: string; color: string; type: TransactionType }
interface BudgetForm { categoryId: string; amount: string; month: number; year: number }

export default function FinancePage() {
  const [tab, setTab] = useState<"transactions" | "budgets" | "categories">("transactions")
  const [period, setPeriod] = useState<PeriodType>("monthly")
  const now = new Date()
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1)
  const [selYear, setSelYear] = useState(now.getFullYear())

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)

  const [txModal, setTxModal] = useState<"create" | "edit" | null>(null)
  const [editTxId, setEditTxId] = useState<string | null>(null)
  const [txForm, setTxForm] = useState<TxForm>({ amount: "", type: "EXPENSE", categoryId: "", date: now.toISOString().split("T")[0], note: "" })
  const [txSaving, setTxSaving] = useState(false)
  const [deleteTxId, setDeleteTxId] = useState<string | null>(null)

  const [catModal, setCatModal] = useState<"create" | "edit" | null>(null)
  const [editCatId, setEditCatId] = useState<string | null>(null)
  const [catForm, setCatForm] = useState<CatForm>({ name: "", icon: "tag", color: "#6366f1", type: "EXPENSE" })
  const [catSaving, setCatSaving] = useState(false)
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null)

  const [budgetModal, setBudgetModal] = useState(false)
  const [budgetForm, setBudgetForm] = useState<BudgetForm>({ categoryId: "", amount: "", month: selMonth, year: selYear })
  const [budgetSaving, setBudgetSaving] = useState(false)

  const range = getPeriodRange(period, selMonth, selYear)

  const fetchAll = async () => {
    setLoading(true)
    const [txRes, catRes, budRes] = await Promise.all([
      fetch(`/api/transactions?start=${range.start}&end=${range.end}`),
      fetch("/api/categories"),
      fetch(`/api/budgets?month=${selMonth}&year=${selYear}`)
    ])
    if (txRes.ok) setTransactions(await txRes.json())
    if (catRes.ok) setCategories(await catRes.json())
    if (budRes.ok) setBudgets(await budRes.json())
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [period, selMonth, selYear])

  const totalIncome = transactions.filter(t => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = transactions.filter(t => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0)
  const balance = totalIncome - totalExpense

  // Transactions CRUD
  const openCreateTx = () => {
    setTxForm({ amount: "", type: "EXPENSE", categoryId: categories[0]?.id || "", date: now.toISOString().split("T")[0], note: "" })
    setEditTxId(null)
    setTxModal("create")
  }
  const openEditTx = (t: Transaction) => {
    setTxForm({ amount: String(t.amount), type: t.type, categoryId: t.category.id, date: t.date.split("T")[0], note: t.note || "" })
    setEditTxId(t.id)
    setTxModal("edit")
  }
  const handleSaveTx = async () => {
    setTxSaving(true)
    const body = { ...txForm, amount: parseFloat(txForm.amount) }
    if (txModal === "create") {
      await fetch("/api/transactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    } else if (editTxId) {
      await fetch(`/api/transactions/${editTxId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    }
    setTxSaving(false)
    setTxModal(null)
    fetchAll()
  }
  const handleDeleteTx = async () => {
    if (!deleteTxId) return
    await fetch(`/api/transactions/${deleteTxId}`, { method: "DELETE" })
    setDeleteTxId(null)
    fetchAll()
  }

  // Categories CRUD
  const openCreateCat = () => {
    setCatForm({ name: "", icon: "tag", color: "#6366f1", type: "EXPENSE" })
    setEditCatId(null)
    setCatModal("create")
  }
  const openEditCat = (c: Category) => {
    setCatForm({ name: c.name, icon: c.icon, color: c.color, type: c.type })
    setEditCatId(c.id)
    setCatModal("edit")
  }
  const handleSaveCat = async () => {
    setCatSaving(true)
    if (catModal === "create") {
      await fetch("/api/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(catForm) })
    } else if (editCatId) {
      await fetch(`/api/categories/${editCatId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(catForm) })
    }
    setCatSaving(false)
    setCatModal(null)
    fetchAll()
  }
  const handleDeleteCat = async () => {
    if (!deleteCatId) return
    await fetch(`/api/categories/${deleteCatId}`, { method: "DELETE" })
    setDeleteCatId(null)
    fetchAll()
  }

  // Budget
  const handleSaveBudget = async () => {
    setBudgetSaving(true)
    await fetch("/api/budgets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...budgetForm, amount: parseFloat(budgetForm.amount) }) })
    setBudgetSaving(false)
    setBudgetModal(false)
    fetchAll()
  }

  // Chart data
  const chartData = categories
    .filter(c => c.type === "EXPENSE")
    .map(c => ({
      name: c.name,
      value: transactions.filter(t => t.category.id === c.id).reduce((s, t) => s + Number(t.amount), 0),
      color: c.color
    }))
    .filter(d => d.value > 0)

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Finance</h1>
          <p className="text-gray-400 text-sm mt-1">Track income, expenses and budgets</p>
        </div>
        <button onClick={openCreateTx} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors">
          <Plus size={16} /> Add Transaction
        </button>
      </div>

      {/* Period tabs */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1">
          {(["daily", "weekly", "monthly", "quarterly", "yearly"] as PeriodType[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-all ${period === p ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"}`}>
              {p}
            </button>
          ))}
        </div>
        {period === "monthly" && (
          <div className="flex items-center gap-2">
            <select className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" value={selMonth} onChange={e => setSelMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none" value={selYear} onChange={e => setSelYear(Number(e.target.value))}>
              {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center">
              <TrendingUp size={16} className="text-green-400" />
            </div>
            <span className="text-gray-400 text-sm">Total Income</span>
          </div>
          <p className="text-xl font-bold text-green-400">{formatMoney(totalIncome)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center">
              <TrendingDown size={16} className="text-red-400" />
            </div>
            <span className="text-gray-400 text-sm">Total Expense</span>
          </div>
          <p className="text-xl font-bold text-red-400">{formatMoney(totalExpense)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <Wallet size={16} className="text-indigo-400" />
            </div>
            <span className="text-gray-400 text-sm">Balance</span>
          </div>
          <p className={`text-xl font-bold ${balance >= 0 ? "text-indigo-400" : "text-red-400"}`}>{formatMoney(balance)}</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-white mb-4">Expense by Category</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ backgroundColor: "#111827", border: "1px solid #1f2937", borderRadius: 8, color: "#fff" }}
                formatter={(v) => [formatMoney(Number(v)), ""]}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Sub tabs */}
      <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1 mb-6 w-fit">
        {(["transactions", "budgets", "categories"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-lg text-sm capitalize transition-all ${tab === t ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* TRANSACTIONS */}
      {tab === "transactions" && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="text-center py-10 text-gray-500">Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-10 text-gray-500">No transactions in this period</div>
          ) : (
            <div className="divide-y divide-gray-800">
              {transactions.map(t => (
                <div key={t.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-800/30 transition-colors">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: t.category.color + "20" }}>
                    <span className="text-xs" style={{ color: t.category.color }}>{t.category.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium">{t.category.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${t.type === "INCOME" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                        {t.type}
                      </span>
                    </div>
                    {t.note && <p className="text-gray-400 text-xs mt-0.5 truncate">{t.note}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-semibold ${t.type === "INCOME" ? "text-green-400" : "text-red-400"}`}>
                      {t.type === "INCOME" ? "+" : "−"}{formatMoney(Number(t.amount))}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">{new Date(t.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEditTx(t)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"><Pencil size={13} /></button>
                    <button onClick={() => setDeleteTxId(t.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BUDGETS */}
      {tab === "budgets" && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => { setBudgetForm({ categoryId: categories[0]?.id || "", amount: "", month: selMonth, year: selYear }); setBudgetModal(true) }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors">
              <Plus size={16} /> Set Budget
            </button>
          </div>
          {budgets.length === 0 ? (
            <div className="text-center py-10 text-gray-500">No budgets for this period</div>
          ) : (
            <div className="space-y-3">
              {budgets.map(b => {
                const pct = Math.min(100, b.amount > 0 ? (b.spent / Number(b.amount)) * 100 : 0)
                const over = pct >= 100
                return (
                  <div key={b.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: b.category.color }} />
                        <span className="text-white font-medium text-sm">{b.category.name}</span>
                      </div>
                      <div className="text-sm">
                        <span className={over ? "text-red-400" : "text-gray-300"}>{formatMoney(b.spent)}</span>
                        <span className="text-gray-500"> / {formatMoney(Number(b.amount))}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: over ? "#ef4444" : b.category.color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* CATEGORIES */}
      {tab === "categories" && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={openCreateCat} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors">
              <Plus size={16} /> New Category
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {categories.map(c => (
              <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: c.color + "20" }}>
                    <span style={{ color: c.color }}>{c.icon}</span>
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{c.name}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${c.type === "INCOME" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                      {c.type}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEditCat(c)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"><Pencil size={13} /></button>
                  <button onClick={() => setDeleteCatId(c.id)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {txModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">{txModal === "create" ? "Add Transaction" : "Edit Transaction"}</h2>
              <button onClick={() => setTxModal(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Amount</label>
                <input type="number" className={inputCls} placeholder="0" value={txForm.amount} onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Type</label>
                <div className="flex gap-3">
                  {(["INCOME", "EXPENSE"] as TransactionType[]).map(t => (
                    <button key={t} onClick={() => setTxForm(f => ({ ...f, type: t }))} className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${txForm.type === t ? "border-indigo-500 bg-indigo-500/10 text-indigo-300" : "border-gray-700 bg-gray-800 text-gray-400"}`}>
                      {t === "INCOME" ? "Income" : "Expense"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Category</label>
                <select className={inputCls} value={txForm.categoryId} onChange={e => setTxForm(f => ({ ...f, categoryId: e.target.value }))}>
                  <option value="">Select category</option>
                  {categories.filter(c => c.type === txForm.type).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Date</label>
                <input type="date" className={inputCls} value={txForm.date} onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Note</label>
                <input className={inputCls} placeholder="Optional note" value={txForm.note} onChange={e => setTxForm(f => ({ ...f, note: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setTxModal(null)} className="flex-1 py-2.5 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors">Cancel</button>
              <button onClick={handleSaveTx} disabled={txSaving || !txForm.amount || !txForm.categoryId} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50">
                {txSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {catModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">{catModal === "create" ? "New Category" : "Edit Category"}</h2>
              <button onClick={() => setCatModal(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Name</label>
                <input className={inputCls} placeholder="Category name" value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Icon (emoji or text)</label>
                <input className={inputCls} placeholder="🍕" value={catForm.icon} onChange={e => setCatForm(f => ({ ...f, icon: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Color</label>
                <div className="flex gap-2">
                  {PRESET_COLORS.map(c => (
                    <button key={c} onClick={() => setCatForm(f => ({ ...f, color: c }))} className={`w-8 h-8 rounded-full border-2 transition-all ${catForm.color === c ? "border-white scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Type</label>
                <div className="flex gap-3">
                  {(["INCOME", "EXPENSE"] as TransactionType[]).map(t => (
                    <button key={t} onClick={() => setCatForm(f => ({ ...f, type: t }))} className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${catForm.type === t ? "border-indigo-500 bg-indigo-500/10 text-indigo-300" : "border-gray-700 bg-gray-800 text-gray-400"}`}>
                      {t === "INCOME" ? "Income" : "Expense"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setCatModal(null)} className="flex-1 py-2.5 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors">Cancel</button>
              <button onClick={handleSaveCat} disabled={catSaving || !catForm.name} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50">
                {catSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Budget Modal */}
      {budgetModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-800">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Set Budget</h2>
              <button onClick={() => setBudgetModal(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Category</label>
                <select className={inputCls} value={budgetForm.categoryId} onChange={e => setBudgetForm(f => ({ ...f, categoryId: e.target.value }))}>
                  <option value="">Select category</option>
                  {categories.filter(c => c.type === "EXPENSE").map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Budget Amount</label>
                <input type="number" className={inputCls} placeholder="0" value={budgetForm.amount} onChange={e => setBudgetForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Month</label>
                  <select className={inputCls} value={budgetForm.month} onChange={e => setBudgetForm(f => ({ ...f, month: Number(e.target.value) }))}>
                    {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Year</label>
                  <select className={inputCls} value={budgetForm.year} onChange={e => setBudgetForm(f => ({ ...f, year: Number(e.target.value) }))}>
                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setBudgetModal(false)} className="flex-1 py-2.5 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors">Cancel</button>
              <button onClick={handleSaveBudget} disabled={budgetSaving || !budgetForm.categoryId || !budgetForm.amount} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50">
                {budgetSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmations */}
      {deleteTxId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-2">Delete Transaction</h2>
            <p className="text-gray-400 text-sm mb-6">This transaction will be permanently deleted.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTxId(null)} className="flex-1 py-2.5 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors">Cancel</button>
              <button onClick={handleDeleteTx} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
      {deleteCatId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-2">Delete Category</h2>
            <p className="text-gray-400 text-sm mb-6">This will also delete all transactions in this category.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteCatId(null)} className="flex-1 py-2.5 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors">Cancel</button>
              <button onClick={handleDeleteCat} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
