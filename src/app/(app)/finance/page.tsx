"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, Trash2, X, TrendingUp, TrendingDown, Wallet } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts"

type PeriodType = "daily" | "weekly" | "monthly" | "quarterly" | "yearly"
type TransactionType = "INCOME" | "EXPENSE"

interface Category { id: string; name: string; icon: string; color: string; type: TransactionType }
interface Transaction { id: string; amount: number; type: TransactionType; note?: string; date: string; category: Category }
interface Budget { id: string; amount: number; month: number; year: number; category: Category; spent: number }
interface TxForm { amount: string; type: TransactionType; categoryId: string; date: string; note: string }
interface CatForm { name: string; icon: string; color: string; type: TransactionType }

const inputCls = "w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
const labelCls = "block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide"
const PRESET_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899"]
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

function formatMoney(n: number) {
  return n.toLocaleString("ru-RU") + " so'm"
}

function parseAmount(s: string) {
  return parseFloat(s.replace(/\s/g, "").replace(",", ".")) || 0
}

function localDateStr(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function getPeriodParams(period: PeriodType, month: number, year: number, selDay: string) {
  const now = new Date()
  if (period === "daily") return `period=daily&day=${selDay}`
  if (period === "weekly") return `period=weekly`
  if (period === "monthly") return `period=monthly&month=${month}&year=${year}`
  if (period === "quarterly") {
    const q = Math.floor((now.getMonth()) / 3) + 1
    return `period=quarterly&quarter=${q}&year=${now.getFullYear()}`
  }
  return `period=yearly&year=${now.getFullYear()}`
}

export default function FinancePage() {
  const [tab, setTab] = useState<"transactions" | "budgets" | "categories">("transactions")
  const [period, setPeriod] = useState<PeriodType>("monthly")
  const now = new Date()
  const [selDay, setSelDay] = useState(localDateStr(now))
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1)
  const [selYear, setSelYear] = useState(now.getFullYear())

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)

  const [txModal, setTxModal] = useState<"create" | "edit" | null>(null)
  const [editTxId, setEditTxId] = useState<string | null>(null)
  const [txForm, setTxForm] = useState<TxForm>({ amount: "", type: "EXPENSE", categoryId: "", date: localDateStr(now), note: "" })
  const [txSaving, setTxSaving] = useState(false)
  const [deleteTxId, setDeleteTxId] = useState<string | null>(null)

  const [catModal, setCatModal] = useState<"create" | "edit" | null>(null)
  const [editCatId, setEditCatId] = useState<string | null>(null)
  const [catForm, setCatForm] = useState<CatForm>({ name: "", icon: "🏷️", color: "#6366f1", type: "EXPENSE" })
  const [catSaving, setCatSaving] = useState(false)
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null)

  const [budgetModal, setBudgetModal] = useState(false)
  const [budgetForm, setBudgetForm] = useState({ categoryId: "", amount: "", month: selMonth, year: selYear })
  const [budgetSaving, setBudgetSaving] = useState(false)
  const [deleteBudgetId, setDeleteBudgetId] = useState<string | null>(null)

  // Filtered categories by current form type
  const incomeCats = categories.filter(c => c.type === "INCOME")
  const expenseCats = categories.filter(c => c.type === "EXPENSE")
  const txCats = txForm.type === "INCOME" ? incomeCats : expenseCats

  const fetchAll = async () => {
    setLoading(true)
    const params = getPeriodParams(period, selMonth, selYear, selDay)
    const [txRes, catRes, budRes] = await Promise.all([
      fetch(`/api/finance/transactions?${params}`),
      fetch("/api/finance/categories"),
      fetch(`/api/finance/budgets?month=${selMonth}&year=${selYear}`),
    ])
    if (txRes.ok) setTransactions(await txRes.json())
    if (catRes.ok) setCategories(await catRes.json())
    if (budRes.ok) setBudgets(await budRes.json())
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [period, selDay, selMonth, selYear])

  // When type changes in tx form, auto-select first matching category
  const handleTxTypeChange = (type: TransactionType) => {
    const firstCat = categories.find(c => c.type === type)
    setTxForm(f => ({ ...f, type, categoryId: firstCat?.id || "" }))
  }

  const totalIncome = transactions.filter(t => t.type === "INCOME").reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = transactions.filter(t => t.type === "EXPENSE").reduce((s, t) => s + Number(t.amount), 0)
  const balance = totalIncome - totalExpense

  // TX CRUD
  const openCreateTx = () => {
    const firstExpenseCat = categories.find(c => c.type === "EXPENSE")
    setTxForm({ amount: "", type: "EXPENSE", categoryId: firstExpenseCat?.id || "", date: localDateStr(now), note: "" })
    setEditTxId(null)
    setTxModal("create")
  }
  const openEditTx = (t: Transaction) => {
    setTxForm({ amount: String(t.amount), type: t.type, categoryId: t.category.id, date: t.date.split("T")[0], note: t.note || "" })
    setEditTxId(t.id)
    setTxModal("edit")
  }
  const handleSaveTx = async () => {
    if (!txForm.amount || !txForm.categoryId) return
    setTxSaving(true)
    const body = { ...txForm, amount: parseAmount(txForm.amount) }
    const url = txModal === "create" ? "/api/finance/transactions" : `/api/finance/transactions/${editTxId}`
    await fetch(url, { method: txModal === "create" ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    setTxSaving(false)
    setTxModal(null)
    fetchAll()
  }
  const handleDeleteTx = async () => {
    if (!deleteTxId) return
    await fetch(`/api/finance/transactions/${deleteTxId}`, { method: "DELETE" })
    setDeleteTxId(null)
    fetchAll()
  }

  // Category CRUD
  const openCreateCat = () => { setCatForm({ name: "", icon: "🏷️", color: "#6366f1", type: "EXPENSE" }); setEditCatId(null); setCatModal("create") }
  const openEditCat = (c: Category) => { setCatForm({ name: c.name, icon: c.icon, color: c.color, type: c.type }); setEditCatId(c.id); setCatModal("edit") }
  const handleSaveCat = async () => {
    if (!catForm.name) return
    setCatSaving(true)
    const url = catModal === "create" ? "/api/finance/categories" : `/api/finance/categories/${editCatId}`
    await fetch(url, { method: catModal === "create" ? "POST" : "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(catForm) })
    setCatSaving(false)
    setCatModal(null)
    fetchAll()
  }
  const handleDeleteCat = async () => {
    if (!deleteCatId) return
    await fetch(`/api/finance/categories/${deleteCatId}`, { method: "DELETE" })
    setDeleteCatId(null)
    fetchAll()
  }

  // Budget CRUD
  const openBudget = () => {
    const firstExpense = expenseCats[0]
    setBudgetForm({ categoryId: firstExpense?.id || "", amount: "", month: selMonth, year: selYear })
    setBudgetModal(true)
  }
  const handleSaveBudget = async () => {
    if (!budgetForm.categoryId || !budgetForm.amount) return
    setBudgetSaving(true)
    await fetch("/api/finance/budgets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...budgetForm, amount: parseAmount(budgetForm.amount) }) })
    setBudgetSaving(false)
    setBudgetModal(false)
    fetchAll()
  }
  const handleDeleteBudget = async () => {
    if (!deleteBudgetId) return
    await fetch("/api/finance/budgets", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: deleteBudgetId }) })
    setDeleteBudgetId(null)
    fetchAll()
  }

  const chartData = expenseCats.map(c => ({
    name: c.name,
    value: transactions.filter(t => t.category.id === c.id).reduce((s, t) => s + Number(t.amount), 0),
    color: c.color
  })).filter(d => d.value > 0)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Finance</h1>
          <p className="text-gray-400 text-sm mt-0.5">Track your income and expenses</p>
        </div>
        <button onClick={openCreateTx} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-500 transition-colors">
          <Plus size={16} /> Add Transaction
        </button>
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1 gap-0.5">
          {(["daily","weekly","monthly","quarterly","yearly"] as PeriodType[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 rounded-lg text-sm capitalize font-medium transition-all ${period === p ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"}`}>
              {p}
            </button>
          ))}
        </div>
        {period === "daily" && (
          <input
            type="date"
            className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            value={selDay}
            onChange={e => setSelDay(e.target.value)}
          />
        )}
        {period === "monthly" && (
          <div className="flex gap-2">
            <select className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" value={selMonth} onChange={e => setSelMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" value={selYear} onChange={e => setSelYear(Number(e.target.value))}>
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Income", value: totalIncome, icon: TrendingUp, color: "text-green-400", bg: "bg-green-500/10" },
          { label: "Expense", value: totalExpense, icon: TrendingDown, color: "text-red-400", bg: "bg-red-500/10" },
          { label: "Balance", value: balance, icon: Wallet, color: balance >= 0 ? "text-indigo-400" : "text-red-400", bg: "bg-indigo-500/10" },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon size={15} className={s.color} />
              </div>
              <span className="text-gray-400 text-sm">{s.label}</span>
            </div>
            <p className={`text-xl font-bold ${s.color}`}>{formatMoney(s.value)}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-4">Expense by Category</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8, color: "#fff", fontSize: 12 }} formatter={(v) => [formatMoney(Number(v)), ""]} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1 mb-5 w-fit gap-0.5">
        {(["transactions","budgets","categories"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-lg text-sm capitalize font-medium transition-all ${tab === t ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* TRANSACTIONS */}
      {tab === "transactions" && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-gray-500 text-sm">Loading...</div>
          ) : transactions.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-gray-500 text-sm">No transactions yet</p>
              <button onClick={openCreateTx} className="mt-3 text-indigo-400 text-sm hover:text-indigo-300">Add your first transaction</button>
            </div>
          ) : (
            <div className="divide-y divide-gray-800/60">
              {transactions.map(t => (
                <div key={t.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-800/30 transition-colors">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0" style={{ backgroundColor: t.category.color + "25" }}>
                    {t.category.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{t.category.name}</p>
                    {t.note && <p className="text-gray-500 text-xs mt-0.5 truncate">{t.note}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-semibold text-sm ${t.type === "INCOME" ? "text-green-400" : "text-red-400"}`}>
                      {t.type === "INCOME" ? "+" : "−"}{formatMoney(Number(t.amount))}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {new Date(t.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEditTx(t)} className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"><Pencil size={13} /></button>
                    <button onClick={() => setDeleteTxId(t.id)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"><Trash2 size={13} /></button>
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
            <button onClick={openBudget} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-500 transition-colors">
              <Plus size={16} /> Set Budget
            </button>
          </div>
          {budgets.length === 0 ? (
            <div className="py-16 text-center text-gray-500 text-sm">No budgets set for this month</div>
          ) : (
            <div className="space-y-3">
              {budgets.map(b => {
                const pct = Math.min(100, Number(b.amount) > 0 ? (b.spent / Number(b.amount)) * 100 : 0)
                const over = pct >= 100
                return (
                  <div key={b.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{b.category.icon}</span>
                        <span className="text-white font-medium text-sm">{b.category.name}</span>
                        {over && <span className="text-xs px-1.5 py-0.5 bg-red-500/15 text-red-400 rounded-full">Over budget</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right text-sm">
                          <span className={over ? "text-red-400 font-medium" : "text-gray-300"}>{formatMoney(b.spent)}</span>
                          <span className="text-gray-500"> / {formatMoney(Number(b.amount))}</span>
                        </div>
                        <button onClick={() => setDeleteBudgetId(b.id)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: over ? "#ef4444" : b.category.color }} />
                    </div>
                    <p className="text-right text-xs text-gray-500 mt-1">{Math.round(pct)}%</p>
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
            <button onClick={openCreateCat} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-500 transition-colors">
              <Plus size={16} /> New Category
            </button>
          </div>

          {categories.length === 0 ? (
            <div className="py-16 text-center text-gray-500 text-sm">No categories yet</div>
          ) : (
            <div className="grid gap-6">
              {[{ label: "Income", type: "INCOME" as TransactionType, cats: incomeCats, color: "text-green-400" },
                { label: "Expense", type: "EXPENSE" as TransactionType, cats: expenseCats, color: "text-red-400" }].map(group => (
                <div key={group.type}>
                  <h3 className={`text-sm font-semibold mb-3 ${group.color}`}>{group.label} Categories</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.cats.map(c => (
                      <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between hover:border-gray-700 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: c.color + "25" }}>
                            {c.icon}
                          </div>
                          <span className="text-white font-medium text-sm">{c.name}</span>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => openEditCat(c)} className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"><Pencil size={13} /></button>
                          <button onClick={() => setDeleteCatId(c.id)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    ))}
                    {group.cats.length === 0 && (
                      <p className="text-gray-600 text-sm col-span-2">No {group.label.toLowerCase()} categories</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TRANSACTION MODAL ── */}
      {txModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-gray-800 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">{txModal === "create" ? "Add Transaction" : "Edit Transaction"}</h2>
              <button onClick={() => setTxModal(null)} className="text-gray-500 hover:text-white transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              {/* Type toggle */}
              <div>
                <label className={labelCls}>Type</label>
                <div className="flex gap-2 p-1 bg-gray-800 rounded-xl">
                  {(["EXPENSE","INCOME"] as TransactionType[]).map(t => (
                    <button key={t} onClick={() => handleTxTypeChange(t)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        txForm.type === t
                          ? t === "INCOME" ? "bg-green-600 text-white" : "bg-red-600 text-white"
                          : "text-gray-400 hover:text-white"
                      }`}>
                      {t === "INCOME" ? "💰 Income" : "💸 Expense"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className={labelCls}>Amount (so'm)</label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    className={inputCls + " pr-14"}
                    placeholder="0"
                    value={txForm.amount}
                    onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">so'm</span>
                </div>
                {txForm.amount && parseAmount(txForm.amount) > 0 && (
                  <p className="text-xs text-gray-500 mt-1 pl-1">{formatMoney(parseAmount(txForm.amount))}</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className={labelCls}>Category</label>
                {txCats.length === 0 ? (
                  <div className="bg-gray-800 rounded-xl px-4 py-3 text-sm text-yellow-400 border border-yellow-500/20">
                    No {txForm.type.toLowerCase()} categories. <button onClick={() => { setTxModal(null); setTab("categories") }} className="underline">Add one</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {txCats.map(c => (
                      <button key={c.id} onClick={() => setTxForm(f => ({ ...f, categoryId: c.id }))}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-sm transition-all ${
                          txForm.categoryId === c.id ? "border-indigo-500 bg-indigo-500/10" : "border-gray-700 bg-gray-800 hover:border-gray-600"
                        }`}>
                        <span className="text-xl">{c.icon}</span>
                        <span className="text-xs text-gray-300 truncate w-full text-center">{c.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Date */}
              <div>
                <label className={labelCls}>Date</label>
                <input type="date" className={inputCls} value={txForm.date} onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))} />
              </div>

              {/* Note */}
              <div>
                <label className={labelCls}>Note <span className="text-gray-600 normal-case">(optional)</span></label>
                <input className={inputCls} placeholder="What was this for?" value={txForm.note} onChange={e => setTxForm(f => ({ ...f, note: e.target.value }))} />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setTxModal(null)} className="flex-1 py-2.5 bg-gray-800 text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors">Cancel</button>
              <button onClick={handleSaveTx} disabled={txSaving || !txForm.amount || !txForm.categoryId}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-500 transition-colors disabled:opacity-40">
                {txSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CATEGORY MODAL ── */}
      {catModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-gray-800 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">{catModal === "create" ? "New Category" : "Edit Category"}</h2>
              <button onClick={() => setCatModal(null)} className="text-gray-500 hover:text-white transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Type</label>
                <div className="flex gap-2 p-1 bg-gray-800 rounded-xl">
                  {(["EXPENSE","INCOME"] as TransactionType[]).map(t => (
                    <button key={t} onClick={() => setCatForm(f => ({ ...f, type: t }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        catForm.type === t
                          ? t === "INCOME" ? "bg-green-600 text-white" : "bg-red-600 text-white"
                          : "text-gray-400 hover:text-white"
                      }`}>
                      {t === "INCOME" ? "Income" : "Expense"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>Name</label>
                <input className={inputCls} placeholder="e.g. Food, Salary..." value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Icon (emoji)</label>
                <input className={inputCls} placeholder="🍕" value={catForm.icon} onChange={e => setCatForm(f => ({ ...f, icon: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Color</label>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button key={c} onClick={() => setCatForm(f => ({ ...f, color: c }))}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${catForm.color === c ? "border-white scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setCatModal(null)} className="flex-1 py-2.5 bg-gray-800 text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors">Cancel</button>
              <button onClick={handleSaveCat} disabled={catSaving || !catForm.name}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-500 transition-colors disabled:opacity-40">
                {catSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BUDGET MODAL ── */}
      {budgetModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-gray-800 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">Set Monthly Budget</h2>
              <button onClick={() => setBudgetModal(false)} className="text-gray-500 hover:text-white transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Category</label>
                <select className={inputCls} value={budgetForm.categoryId} onChange={e => setBudgetForm(f => ({ ...f, categoryId: e.target.value }))}>
                  <option value="">Select category</option>
                  {expenseCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Limit (so'm)</label>
                <input type="number" inputMode="numeric" className={inputCls} placeholder="e.g. 1000000" value={budgetForm.amount} onChange={e => setBudgetForm(f => ({ ...f, amount: e.target.value }))} />
                {budgetForm.amount && parseAmount(budgetForm.amount) > 0 && (
                  <p className="text-xs text-gray-500 mt-1 pl-1">{formatMoney(parseAmount(budgetForm.amount))}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Month</label>
                  <select className={inputCls} value={budgetForm.month} onChange={e => setBudgetForm(f => ({ ...f, month: Number(e.target.value) }))}>
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Year</label>
                  <select className={inputCls} value={budgetForm.year} onChange={e => setBudgetForm(f => ({ ...f, year: Number(e.target.value) }))}>
                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setBudgetModal(false)} className="flex-1 py-2.5 bg-gray-800 text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors">Cancel</button>
              <button onClick={handleSaveBudget} disabled={budgetSaving || !budgetForm.categoryId || !budgetForm.amount}
                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-500 transition-colors disabled:opacity-40">
                {budgetSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirms */}
      {[
        { id: deleteTxId, label: "transaction", onCancel: () => setDeleteTxId(null), onConfirm: handleDeleteTx },
        { id: deleteCatId, label: "category", onCancel: () => setDeleteCatId(null), onConfirm: handleDeleteCat },
        { id: deleteBudgetId, label: "budget", onCancel: () => setDeleteBudgetId(null), onConfirm: handleDeleteBudget },
      ].map(({ id, label, onCancel, onConfirm }) => id && (
        <div key={label} className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-gray-800 shadow-2xl">
            <h2 className="text-base font-semibold text-white mb-2">Delete {label}?</h2>
            <p className="text-gray-400 text-sm mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={onCancel} className="flex-1 py-2.5 bg-gray-800 text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors">Cancel</button>
              <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-500 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
