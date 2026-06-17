"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Plus, Pencil, Trash2, ExternalLink, X, ChevronDown,
  FileText, Link2, Globe, Send, Briefcase, Lightbulb,
  CalendarDays, List, ChevronLeft, ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ───────────────────────────────────────────────────────────────────

type ContentPlatform = "BLOG" | "LINKEDIN" | "WEBSITE" | "TELEGRAM"
type ContentStatus = "IDEA" | "DRAFT" | "SCHEDULED" | "PUBLISHED"
type JobPlatform = "UPWORK" | "INDEED" | "LINKEDIN" | "DIRECT" | "OTHER"
type JobStatus = "SAVED" | "APPLIED" | "SCREENING" | "INTERVIEW" | "OFFER" | "REJECTED"

interface ContentItem {
  id: string
  title: string
  body: string | null
  platform: ContentPlatform
  status: ContentStatus
  scheduledAt: string | null
  publishedAt: string | null
  tags: string[]
  createdAt: string
}

interface JobApplication {
  id: string
  title: string
  company: string | null
  platform: JobPlatform
  status: JobStatus
  url: string | null
  notes: string | null
  appliedAt: string | null
  createdAt: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CONTENT_PLATFORMS: { value: ContentPlatform; label: string; icon: React.ElementType; color: string; chipColor: string }[] = [
  { value: "BLOG",     label: "Blog",     icon: FileText, color: "text-amber-400",   chipColor: "bg-amber-500/25 text-amber-300 border border-amber-500/30" },
  { value: "LINKEDIN", label: "LinkedIn", icon: Link2,    color: "text-blue-400",    chipColor: "bg-blue-500/25 text-blue-300 border border-blue-500/30" },
  { value: "WEBSITE",  label: "Website",  icon: Globe,    color: "text-emerald-400", chipColor: "bg-emerald-500/25 text-emerald-300 border border-emerald-500/30" },
  { value: "TELEGRAM", label: "Telegram", icon: Send,     color: "text-sky-400",     chipColor: "bg-sky-500/25 text-sky-300 border border-sky-500/30" },
]

const CONTENT_STATUSES: { value: ContentStatus; label: string; color: string }[] = [
  { value: "IDEA",      label: "Idea",      color: "bg-gray-700 text-gray-300" },
  { value: "DRAFT",     label: "Draft",     color: "bg-yellow-500/20 text-yellow-400" },
  { value: "SCHEDULED", label: "Scheduled", color: "bg-blue-500/20 text-blue-400" },
  { value: "PUBLISHED", label: "Published", color: "bg-green-500/20 text-green-400" },
]

const JOB_PLATFORMS: { value: JobPlatform; label: string }[] = [
  { value: "UPWORK",   label: "Upwork" },
  { value: "INDEED",   label: "Indeed" },
  { value: "LINKEDIN", label: "LinkedIn" },
  { value: "DIRECT",   label: "Direct" },
  { value: "OTHER",    label: "Other" },
]

const JOB_STATUSES: { value: JobStatus; label: string; color: string }[] = [
  { value: "SAVED",      label: "Saved",      color: "bg-gray-700 text-gray-300" },
  { value: "APPLIED",    label: "Applied",    color: "bg-blue-500/20 text-blue-400" },
  { value: "SCREENING",  label: "Screening",  color: "bg-yellow-500/20 text-yellow-400" },
  { value: "INTERVIEW",  label: "Interview",  color: "bg-purple-500/20 text-purple-400" },
  { value: "OFFER",      label: "Offer",      color: "bg-green-500/20 text-green-400" },
  { value: "REJECTED",   label: "Rejected",   color: "bg-red-500/20 text-red-400" },
]

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

function isoDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function ContentBadge({ platform }: { platform: ContentPlatform }) {
  const p = CONTENT_PLATFORMS.find((x) => x.value === platform)!
  const Icon = p.icon
  return (
    <span className={cn("flex items-center gap-1 text-xs font-medium", p.color)}>
      <Icon size={12} />
      {p.label}
    </span>
  )
}

function StatusBadge({ status, statuses }: { status: string; statuses: { value: string; label: string; color: string }[] }) {
  const s = statuses.find((x) => x.value === status)
  if (!s) return null
  return <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", s.color)}>{s.label}</span>
}

// ─── Calendar Component ───────────────────────────────────────────────────────

function ContentCalendar({
  items,
  onEdit,
}: {
  items: ContentItem[]
  onEdit: (item: ContentItem) => void
}) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth()) // 0-indexed

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  // Build calendar grid (Mon-Sun weeks)
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  // getDay(): 0=Sun,1=Mon,...6=Sat → convert to Mon-first: Mon=0,...Sun=6
  const startOffset = (firstDay.getDay() + 6) % 7
  const totalCells  = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7

  const cells: (Date | null)[] = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - startOffset + 1
    if (dayNum < 1 || dayNum > lastDay.getDate()) return null
    return new Date(year, month, dayNum)
  })

  // Map contentItems by scheduledAt date string
  const itemsByDate: Record<string, ContentItem[]> = {}
  items.forEach((item) => {
    if (!item.scheduledAt) return
    const key = item.scheduledAt.slice(0, 10)
    if (!itemsByDate[key]) itemsByDate[key] = []
    itemsByDate[key].push(item)
  })

  const todayStr = isoDate(today)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      {/* Month header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
        <button onClick={prevMonth} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <h3 className="text-base font-semibold text-white">
          {MONTHS[month]} {year}
        </h3>
        <button onClick={nextMonth} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-800">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-gray-500">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((date, idx) => {
          if (!date) {
            return <div key={idx} className="min-h-[90px] border-b border-r border-gray-800/60 last:border-r-0 bg-gray-950/30" />
          }
          const dateStr = isoDate(date)
          const dayItems = itemsByDate[dateStr] ?? []
          const isToday  = dateStr === todayStr
          const isWeekend = date.getDay() === 0 || date.getDay() === 6
          const colIdx = idx % 7
          const isLastCol = colIdx === 6

          return (
            <div
              key={idx}
              className={cn(
                "min-h-[90px] p-1.5 border-b border-r border-gray-800/60 flex flex-col gap-1",
                isLastCol && "border-r-0",
                isWeekend && "bg-gray-900/40",
              )}
            >
              {/* Day number */}
              <span className={cn(
                "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full self-end shrink-0",
                isToday ? "bg-indigo-600 text-white" : "text-gray-500"
              )}>
                {date.getDate()}
              </span>

              {/* Content chips */}
              {dayItems.slice(0, 3).map((item) => {
                const p = CONTENT_PLATFORMS.find((x) => x.value === item.platform)!
                const Icon = p.icon
                return (
                  <button
                    key={item.id}
                    onClick={() => onEdit(item)}
                    title={item.title}
                    className={cn(
                      "w-full text-left rounded px-1.5 py-0.5 flex items-center gap-1 text-[10px] font-medium truncate transition-opacity hover:opacity-80",
                      p.chipColor
                    )}
                  >
                    <Icon size={9} className="shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </button>
                )
              })}
              {dayItems.length > 3 && (
                <span className="text-[10px] text-gray-500 px-1">+{dayItems.length - 3} more</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-5 py-3 border-t border-gray-800">
        {CONTENT_PLATFORMS.map((p) => {
          const Icon = p.icon
          return (
            <span key={p.value} className={cn("flex items-center gap-1 text-xs", p.color)}>
              <Icon size={11} /> {p.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ─── Content Modal ────────────────────────────────────────────────────────────

function ContentModal({
  item,
  onClose,
  onSave,
}: {
  item: Partial<ContentItem> | null
  onClose: () => void
  onSave: (data: Partial<ContentItem>) => Promise<void>
}) {
  const [form, setForm] = useState<Partial<ContentItem>>(
    item ?? { platform: "BLOG", status: "IDEA", tags: [] }
  )
  const [tagInput, setTagInput] = useState("")
  const [saving, setSaving] = useState(false)

  function set(key: keyof ContentItem, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function addTag() {
    const tag = tagInput.trim()
    if (!tag) return
    set("tags", [...(form.tags ?? []), tag])
    setTagInput("")
  }

  function removeTag(tag: string) {
    set("tags", (form.tags ?? []).filter((t) => t !== tag))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-base font-semibold text-white">{item?.id ? "Edit Content" : "New Content"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Title *</label>
            <input
              required
              value={form.title ?? ""}
              onChange={(e) => set("title", e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              placeholder="Post title..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Platform *</label>
              <select
                required
                value={form.platform ?? "BLOG"}
                onChange={(e) => set("platform", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {CONTENT_PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Status</label>
              <select
                value={form.status ?? "IDEA"}
                onChange={(e) => set("status", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {CONTENT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Body / Notes</label>
            <textarea
              rows={4}
              value={form.body ?? ""}
              onChange={(e) => set("body", e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
              placeholder="Content outline, notes..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Scheduled date</label>
              <input
                type="date"
                value={form.scheduledAt ? form.scheduledAt.slice(0, 10) : ""}
                onChange={(e) => set("scheduledAt", e.target.value || null)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Published date</label>
              <input
                type="date"
                value={form.publishedAt ? form.publishedAt.slice(0, 10) : ""}
                onChange={(e) => set("publishedAt", e.target.value || null)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Tags</label>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                placeholder="Add tag, press Enter"
              />
              <button type="button" onClick={addTag} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 hover:text-white transition-colors">
                Add
              </button>
            </div>
            {(form.tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags!.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)}><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Job Modal ────────────────────────────────────────────────────────────────

function JobModal({
  job,
  onClose,
  onSave,
}: {
  job: Partial<JobApplication> | null
  onClose: () => void
  onSave: (data: Partial<JobApplication>) => Promise<void>
}) {
  const [form, setForm] = useState<Partial<JobApplication>>(
    job ?? { platform: "UPWORK", status: "SAVED" }
  )
  const [saving, setSaving] = useState(false)

  function set(key: keyof JobApplication, value: any) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-base font-semibold text-white">{job?.id ? "Edit Application" : "New Application"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Job Title *</label>
            <input
              required
              value={form.title ?? ""}
              onChange={(e) => set("title", e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              placeholder="Senior Frontend Developer..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Company</label>
              <input
                value={form.company ?? ""}
                onChange={(e) => set("company", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                placeholder="Acme Corp"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Platform *</label>
              <select
                required
                value={form.platform ?? "UPWORK"}
                onChange={(e) => set("platform", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {JOB_PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Status</label>
              <select
                value={form.status ?? "SAVED"}
                onChange={(e) => set("status", e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {JOB_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Applied date</label>
              <input
                type="date"
                value={form.appliedAt ? form.appliedAt.slice(0, 10) : ""}
                onChange={(e) => set("appliedAt", e.target.value || null)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Job URL</label>
            <input
              type="url"
              value={form.url ?? ""}
              onChange={(e) => set("url", e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Notes</label>
            <textarea
              rows={3}
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
              placeholder="Requirements, contacts, next steps..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ContentPage() {
  const [tab, setTab] = useState<"content" | "jobs">("content")
  const [contentView, setContentView] = useState<"list" | "calendar">("calendar")

  // Content state
  const [contentItems, setContentItems] = useState<ContentItem[]>([])
  const [contentLoading, setContentLoading] = useState(true)
  const [contentPlatformFilter, setContentPlatformFilter] = useState<ContentPlatform | "">("")
  const [contentStatusFilter, setContentStatusFilter] = useState<ContentStatus | "">("")
  const [contentModal, setContentModal] = useState<{ open: boolean; item: Partial<ContentItem> | null }>({ open: false, item: null })
  const [expandedContent, setExpandedContent] = useState<Set<string>>(new Set())

  // Jobs state
  const [jobs, setJobs] = useState<JobApplication[]>([])
  const [jobsLoading, setJobsLoading] = useState(true)
  const [jobPlatformFilter, setJobPlatformFilter] = useState<JobPlatform | "">("")
  const [jobStatusFilter, setJobStatusFilter] = useState<JobStatus | "">("")
  const [jobModal, setJobModal] = useState<{ open: boolean; job: Partial<JobApplication> | null }>({ open: false, job: null })
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set())

  const fetchContent = useCallback(async () => {
    setContentLoading(true)
    const params = new URLSearchParams()
    if (contentPlatformFilter) params.set("platform", contentPlatformFilter)
    if (contentStatusFilter) params.set("status", contentStatusFilter)
    const res = await fetch(`/api/content?${params}`)
    if (res.ok) setContentItems(await res.json())
    setContentLoading(false)
  }, [contentPlatformFilter, contentStatusFilter])

  const fetchJobs = useCallback(async () => {
    setJobsLoading(true)
    const params = new URLSearchParams()
    if (jobPlatformFilter) params.set("platform", jobPlatformFilter)
    if (jobStatusFilter) params.set("status", jobStatusFilter)
    const res = await fetch(`/api/jobs?${params}`)
    if (res.ok) setJobs(await res.json())
    setJobsLoading(false)
  }, [jobPlatformFilter, jobStatusFilter])

  useEffect(() => { fetchContent() }, [fetchContent])
  useEffect(() => { fetchJobs() }, [fetchJobs])

  async function saveContent(data: Partial<ContentItem>) {
    if (data.id) {
      await fetch(`/api/content/${data.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
    } else {
      await fetch("/api/content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
    }
    setContentModal({ open: false, item: null })
    fetchContent()
  }

  async function deleteContent(id: string) {
    if (!confirm("Delete this content?")) return
    await fetch(`/api/content/${id}`, { method: "DELETE" })
    fetchContent()
  }

  async function saveJob(data: Partial<JobApplication>) {
    if (data.id) {
      await fetch(`/api/jobs/${data.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
    } else {
      await fetch("/api/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
    }
    setJobModal({ open: false, job: null })
    fetchJobs()
  }

  async function deleteJob(id: string) {
    if (!confirm("Delete this application?")) return
    await fetch(`/api/jobs/${id}`, { method: "DELETE" })
    fetchJobs()
  }

  function toggleExpand(id: string, set: Set<string>, setter: (s: Set<string>) => void) {
    const next = new Set(set)
    next.has(id) ? next.delete(id) : next.add(id)
    setter(next)
  }

  const contentByStatus = CONTENT_STATUSES.map((s) => ({
    ...s,
    count: contentItems.filter((c) => c.status === s.value).length,
  }))
  const jobsByStatus = JOB_STATUSES.map((s) => ({
    ...s,
    count: jobs.filter((j) => j.status === s.value).length,
  }))

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Content & Marketing</h1>
          <p className="text-sm text-gray-500 mt-0.5">Personal brand, content plan, job tracker</p>
        </div>
        <button
          onClick={() =>
            tab === "content"
              ? setContentModal({ open: true, item: null })
              : setJobModal({ open: true, job: null })
          }
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} />
          {tab === "content" ? "New Post" : "New Application"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-6 w-fit">
        <button
          onClick={() => setTab("content")}
          className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors", tab === "content" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white")}
        >
          <Lightbulb size={15} /> Content Plan
        </button>
        <button
          onClick={() => setTab("jobs")}
          className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors", tab === "jobs" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white")}
        >
          <Briefcase size={15} /> Job Tracker
        </button>
      </div>

      {/* ── CONTENT TAB ───────────────────────────────────────────────────── */}
      {tab === "content" && (
        <div className="space-y-5">
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {contentByStatus.map((s) => (
              <button
                key={s.value}
                onClick={() => setContentStatusFilter(contentStatusFilter === s.value ? "" : s.value)}
                className={cn(
                  "bg-gray-900 border rounded-xl p-3 text-left transition-colors",
                  contentStatusFilter === s.value ? "border-indigo-500" : "border-gray-800 hover:border-gray-700"
                )}
              >
                <p className="text-2xl font-bold text-white">{s.count}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </button>
            ))}
          </div>

          {/* Toolbar: platform filter + view toggle */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setContentPlatformFilter("")}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", !contentPlatformFilter ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white")}
              >
                All
              </button>
              {CONTENT_PLATFORMS.map((p) => {
                const Icon = p.icon
                return (
                  <button
                    key={p.value}
                    onClick={() => setContentPlatformFilter(contentPlatformFilter === p.value ? "" : p.value)}
                    className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", contentPlatformFilter === p.value ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white")}
                  >
                    <Icon size={12} /> {p.label}
                  </button>
                )
              })}
            </div>

            {/* View toggle */}
            <div className="flex gap-1 bg-gray-800 rounded-lg p-1 shrink-0">
              <button
                onClick={() => setContentView("calendar")}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors", contentView === "calendar" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white")}
              >
                <CalendarDays size={13} /> Calendar
              </button>
              <button
                onClick={() => setContentView("list")}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors", contentView === "list" ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white")}
              >
                <List size={13} /> List
              </button>
            </div>
          </div>

          {/* Content view */}
          {contentLoading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : contentView === "calendar" ? (
            <ContentCalendar
              items={contentItems}
              onEdit={(item) => setContentModal({ open: true, item })}
            />
          ) : contentItems.length === 0 ? (
            <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-2xl">
              <Lightbulb size={32} className="mx-auto text-gray-700 mb-3" />
              <p className="text-gray-400 font-medium">No content yet</p>
              <p className="text-sm text-gray-600 mt-1">Create your first post idea</p>
            </div>
          ) : (
            <div className="space-y-2">
              {contentItems.map((item) => {
                const expanded = expandedContent.has(item.id)
                return (
                  <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <button
                        onClick={() => toggleExpand(item.id, expandedContent, setExpandedContent)}
                        className="text-gray-500 hover:text-white transition-colors"
                      >
                        <ChevronDown size={16} className={cn("transition-transform", expanded && "rotate-180")} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-white truncate">{item.title}</span>
                          <ContentBadge platform={item.platform} />
                          <StatusBadge status={item.status} statuses={CONTENT_STATUSES} />
                        </div>
                        {(item.scheduledAt || item.publishedAt) && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {item.scheduledAt && `Scheduled: ${fmtDate(item.scheduledAt)}`}
                            {item.publishedAt && `Published: ${fmtDate(item.publishedAt)}`}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setContentModal({ open: true, item })}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => deleteContent(item.id)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {expanded && (item.body || item.tags.length > 0) && (
                      <div className="px-4 pb-4 border-t border-gray-800 pt-3 space-y-2">
                        {item.body && <p className="text-sm text-gray-400 whitespace-pre-wrap">{item.body}</p>}
                        {item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {item.tags.map((tag) => (
                              <span key={tag} className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full">{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── JOBS TAB ──────────────────────────────────────────────────────── */}
      {tab === "jobs" && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {jobsByStatus.map((s) => (
              <button
                key={s.value}
                onClick={() => setJobStatusFilter(jobStatusFilter === s.value ? "" : s.value)}
                className={cn(
                  "bg-gray-900 border rounded-xl p-3 text-left transition-colors",
                  jobStatusFilter === s.value ? "border-indigo-500" : "border-gray-800 hover:border-gray-700"
                )}
              >
                <p className="text-2xl font-bold text-white">{s.count}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setJobPlatformFilter("")}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", !jobPlatformFilter ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white")}
            >
              All
            </button>
            {JOB_PLATFORMS.map((p) => (
              <button
                key={p.value}
                onClick={() => setJobPlatformFilter(jobPlatformFilter === p.value ? "" : p.value)}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", jobPlatformFilter === p.value ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white")}
              >
                {p.label}
              </button>
            ))}
          </div>

          {jobsLoading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-2xl">
              <Briefcase size={32} className="mx-auto text-gray-700 mb-3" />
              <p className="text-gray-400 font-medium">No applications yet</p>
              <p className="text-sm text-gray-600 mt-1">Start tracking your job applications</p>
            </div>
          ) : (
            <div className="space-y-2">
              {jobs.map((job) => {
                const expanded = expandedJobs.has(job.id)
                return (
                  <div key={job.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3">
                      <button
                        onClick={() => toggleExpand(job.id, expandedJobs, setExpandedJobs)}
                        className="text-gray-500 hover:text-white transition-colors"
                      >
                        <ChevronDown size={16} className={cn("transition-transform", expanded && "rotate-180")} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-white truncate">{job.title}</span>
                          {job.company && <span className="text-xs text-gray-400">@ {job.company}</span>}
                          <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">{job.platform}</span>
                          <StatusBadge status={job.status} statuses={JOB_STATUSES} />
                        </div>
                        {job.appliedAt && (
                          <p className="text-xs text-gray-500 mt-0.5">Applied: {fmtDate(job.appliedAt)}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {job.url && (
                          <a href={job.url} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-gray-800 transition-colors">
                            <ExternalLink size={14} />
                          </a>
                        )}
                        <button onClick={() => setJobModal({ open: true, job })}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => deleteJob(job.id)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {expanded && job.notes && (
                      <div className="px-4 pb-4 border-t border-gray-800 pt-3">
                        <p className="text-sm text-gray-400 whitespace-pre-wrap">{job.notes}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {contentModal.open && (
        <ContentModal
          item={contentModal.item}
          onClose={() => setContentModal({ open: false, item: null })}
          onSave={saveContent}
        />
      )}
      {jobModal.open && (
        <JobModal
          job={jobModal.job}
          onClose={() => setJobModal({ open: false, job: null })}
          onSave={saveJob}
        />
      )}
    </div>
  )
}
