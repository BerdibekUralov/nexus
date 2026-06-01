"use client"

import { useState, useEffect, use } from "react"
import { Plus, Pencil, Trash2, X, ChevronDown, ChevronRight, ArrowLeft, Award, Check, RotateCcw } from "lucide-react"
import Link from "next/link"

interface Flashcard { id: string; front: string; back: string }
interface Note { id: string; content: string; updatedAt: string }
interface ChecklistItem { id: string; text: string; isCompleted: boolean; order: number }
interface Checklist { id: string; title: string; items: ChecklistItem[] }
interface Unit {
  id: string; name: string; order: number; isCompleted: boolean
  notes: Note[]; flashcards: Flashcard[]; checklists: Checklist[]
}
interface CourseModule { id: string; name: string; order: number; units: Unit[] }
interface CourseTag { tag: { id: string; name: string } }
interface Course {
  id: string; name: string; platform?: string; duration?: string
  certificate?: string; directionId: string
  modules: CourseModule[]; tags: CourseTag[]
}

const inputCls = "w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
const labelCls = "block text-sm text-gray-400 mb-1.5"

export default function CourseDetailPage({ params }: { params: Promise<{ directionId: string; courseId: string }> }) {
  const { directionId, courseId } = use(params)
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)

  // Module/unit UI state
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)
  const [unitTab, setUnitTab] = useState<"notes" | "flashcards" | "checklists">("notes")

  // Module modal
  const [moduleModal, setModuleModal] = useState<"create" | "edit" | null>(null)
  const [editModuleId, setEditModuleId] = useState<string | null>(null)
  const [moduleName, setModuleName] = useState("")
  const [moduleSaving, setModuleSaving] = useState(false)
  const [deleteModuleId, setDeleteModuleId] = useState<string | null>(null)

  // Unit modal
  const [unitModal, setUnitModal] = useState<"create" | "edit" | null>(null)
  const [unitModuleId, setUnitModuleId] = useState<string | null>(null)
  const [editUnitId, setEditUnitId] = useState<string | null>(null)
  const [unitName, setUnitName] = useState("")
  const [unitSaving, setUnitSaving] = useState(false)
  const [deleteUnitId, setDeleteUnitId] = useState<string | null>(null)

  // Certificate
  const [certEdit, setCertEdit] = useState(false)
  const [certValue, setCertValue] = useState("")

  // Notes
  const [noteContent, setNoteContent] = useState("")
  const [noteSaving, setNoteSaving] = useState(false)
  const [editNoteId, setEditNoteId] = useState<string | null>(null)

  // Flashcards
  const [fcFront, setFcFront] = useState("")
  const [fcBack, setFcBack] = useState("")
  const [fcSaving, setFcSaving] = useState(false)
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set())
  const [editFcId, setEditFcId] = useState<string | null>(null)

  // Checklists
  const [clTitle, setClTitle] = useState("")
  const [clItems, setClItems] = useState<string[]>([""])
  const [clSaving, setClSaving] = useState(false)

  const fetchCourse = async () => {
    setLoading(true)
    const res = await fetch(`/api/directions/${directionId}/courses/${courseId}`)
    if (res.ok) {
      const data = await res.json()
      setCourse(data)
      setCertValue(data.certificate || "")
      // Update selected unit if open
      if (selectedUnit) {
        for (const mod of data.modules) {
          const unit = mod.units.find((u: Unit) => u.id === selectedUnit.id)
          if (unit) { setSelectedUnit(unit); break }
        }
      }
    }
    setLoading(false)
  }

  useEffect(() => { fetchCourse() }, [courseId])

  const toggleModule = (id: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Module CRUD
  const handleSaveModule = async () => {
    setModuleSaving(true)
    if (moduleModal === "create") {
      await fetch(`/api/directions/${directionId}/courses/${courseId}/modules`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: moduleName })
      })
    } else if (editModuleId) {
      await fetch(`/api/directions/${directionId}/courses/${courseId}/modules/${editModuleId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: moduleName })
      })
    }
    setModuleSaving(false)
    setModuleModal(null)
    fetchCourse()
  }

  const handleDeleteModule = async () => {
    if (!deleteModuleId) return
    await fetch(`/api/directions/${directionId}/courses/${courseId}/modules/${deleteModuleId}`, { method: "DELETE" })
    setDeleteModuleId(null)
    fetchCourse()
  }

  // Unit CRUD
  const handleSaveUnit = async () => {
    setUnitSaving(true)
    if (unitModal === "create" && unitModuleId) {
      await fetch(`/api/directions/${directionId}/courses/${courseId}/modules/${unitModuleId}/units`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: unitName })
      })
    } else if (editUnitId && unitModuleId) {
      await fetch(`/api/directions/${directionId}/courses/${courseId}/modules/${unitModuleId}/units/${editUnitId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: unitName })
      })
    }
    setUnitSaving(false)
    setUnitModal(null)
    fetchCourse()
  }

  const handleDeleteUnit = async () => {
    if (!deleteUnitId || !unitModuleId) return
    await fetch(`/api/directions/${directionId}/courses/${courseId}/modules/${unitModuleId}/units/${deleteUnitId}`, { method: "DELETE" })
    setDeleteUnitId(null)
    if (selectedUnit?.id === deleteUnitId) setSelectedUnit(null)
    fetchCourse()
  }

  const toggleUnitComplete = async (unit: Unit, moduleId: string) => {
    await fetch(`/api/directions/${directionId}/courses/${courseId}/modules/${moduleId}/units/${unit.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isCompleted: !unit.isCompleted })
    })
    fetchCourse()
  }

  // Certificate
  const saveCertificate = async () => {
    await fetch(`/api/directions/${directionId}/courses/${courseId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ certificate: certValue })
    })
    setCertEdit(false)
    fetchCourse()
  }

  // Notes
  const handleSaveNote = async () => {
    if (!selectedUnit || !noteContent.trim()) return
    setNoteSaving(true)
    if (editNoteId) {
      await fetch(`/api/units/${selectedUnit.id}/notes/${editNoteId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: noteContent })
      })
    } else {
      await fetch(`/api/units/${selectedUnit.id}/notes`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: noteContent })
      })
    }
    setNoteContent("")
    setEditNoteId(null)
    setNoteSaving(false)
    fetchCourse()
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!selectedUnit) return
    await fetch(`/api/units/${selectedUnit.id}/notes/${noteId}`, { method: "DELETE" })
    fetchCourse()
  }

  // Flashcards
  const handleSaveFc = async () => {
    if (!selectedUnit || !fcFront.trim() || !fcBack.trim()) return
    setFcSaving(true)
    if (editFcId) {
      await fetch(`/api/units/${selectedUnit.id}/flashcards/${editFcId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ front: fcFront, back: fcBack })
      })
    } else {
      await fetch(`/api/units/${selectedUnit.id}/flashcards`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ front: fcFront, back: fcBack })
      })
    }
    setFcFront(""); setFcBack(""); setEditFcId(null); setFcSaving(false)
    fetchCourse()
  }

  const handleDeleteFc = async (fcId: string) => {
    if (!selectedUnit) return
    await fetch(`/api/units/${selectedUnit.id}/flashcards/${fcId}`, { method: "DELETE" })
    fetchCourse()
  }

  const toggleFlip = (id: string) => {
    setFlippedCards(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Checklists
  const handleSaveChecklist = async () => {
    if (!selectedUnit || !clTitle.trim()) return
    setClSaving(true)
    await fetch(`/api/units/${selectedUnit.id}/checklists`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: clTitle, items: clItems.filter(i => i.trim()).map((text, order) => ({ text, order })) })
    })
    setClTitle(""); setClItems([""]); setClSaving(false)
    fetchCourse()
  }

  const toggleChecklistItem = async (checklistId: string, itemId: string, isCompleted: boolean) => {
    if (!selectedUnit) return
    await fetch(`/api/units/${selectedUnit.id}/checklists/${checklistId}/items/${itemId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isCompleted: !isCompleted })
    })
    fetchCourse()
  }

  const handleDeleteChecklist = async (checklistId: string) => {
    if (!selectedUnit) return
    await fetch(`/api/units/${selectedUnit.id}/checklists/${checklistId}`, { method: "DELETE" })
    fetchCourse()
  }

  // Get fresh unit data
  const freshSelectedUnit = selectedUnit
    ? course?.modules.flatMap(m => m.units).find(u => u.id === selectedUnit.id) ?? selectedUnit
    : null

  if (loading && !course) return <div className="p-8 text-gray-400">Loading...</div>
  if (!course) return <div className="p-8 text-gray-400">Course not found</div>

  const totalUnits = course.modules.reduce((s, m) => s + m.units.length, 0)
  const completedUnits = course.modules.reduce((s, m) => s + m.units.filter(u => u.isCompleted).length, 0)

  return (
    <div className="flex h-full">
      {/* Main content */}
      <div className="flex-1 p-8 overflow-y-auto min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Link href="/knowledge" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white truncate">{course.name}</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {course.platform && <span className="text-gray-400 text-sm">{course.platform}</span>}
              {course.duration && <span className="text-gray-400 text-sm">· {course.duration}</span>}
              {course.tags.map(t => (
                <span key={t.tag.id} className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400">{t.tag.name}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3 mt-4 mb-6">
          <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden max-w-xs">
            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${totalUnits > 0 ? Math.round(completedUnits / totalUnits * 100) : 0}%` }} />
          </div>
          <span className="text-sm text-gray-400">{completedUnits}/{totalUnits} units</span>
        </div>

        {/* Certificate section */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Award size={16} className="text-yellow-400" />
              <h2 className="text-sm font-semibold text-white">Certificate</h2>
            </div>
            {!certEdit && (
              <button onClick={() => setCertEdit(true)} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                {course.certificate ? "Edit" : "Add"}
              </button>
            )}
          </div>
          {certEdit ? (
            <div className="flex gap-2">
              <input className={inputCls} placeholder="Certificate URL or path" value={certValue} onChange={e => setCertValue(e.target.value)} />
              <button onClick={saveCertificate} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors flex-shrink-0">Save</button>
              <button onClick={() => { setCertEdit(false); setCertValue(course.certificate || "") }} className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors flex-shrink-0">Cancel</button>
            </div>
          ) : course.certificate ? (
            <a href={course.certificate} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors break-all">
              {course.certificate}
            </a>
          ) : (
            <p className="text-gray-500 text-sm">No certificate added yet</p>
          )}
        </div>

        {/* Modules */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Modules</h2>
          <button onClick={() => { setModuleName(""); setEditModuleId(null); setModuleModal("create") }} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors">
            <Plus size={13} /> Add Module
          </button>
        </div>

        <div className="space-y-3">
          {course.modules.length === 0 ? (
            <div className="text-center py-8 text-gray-500 bg-gray-900 border border-gray-800 rounded-2xl">
              No modules yet
            </div>
          ) : course.modules.map(mod => {
            const isOpen = expandedModules.has(mod.id)
            const modCompleted = mod.units.filter(u => u.isCompleted).length
            return (
              <div key={mod.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-800/30 transition-colors" onClick={() => toggleModule(mod.id)}>
                  {isOpen ? <ChevronDown size={16} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />}
                  <span className="text-white font-medium text-sm flex-1">{mod.name}</span>
                  <span className="text-gray-500 text-xs">{modCompleted}/{mod.units.length}</span>
                  <button onClick={e => { e.stopPropagation(); setModuleName(mod.name); setEditModuleId(mod.id); setModuleModal("edit") }} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors ml-1">
                    <Pencil size={12} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); setDeleteModuleId(mod.id) }} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>

                {isOpen && (
                  <div className="border-t border-gray-800 px-5 pb-4 pt-3">
                    <div className="space-y-1.5">
                      {mod.units.map(unit => (
                        <div
                          key={unit.id}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                            freshSelectedUnit?.id === unit.id ? "bg-indigo-600/10 border border-indigo-500/30" : "hover:bg-gray-800/50 border border-transparent"
                          }`}
                          onClick={() => { setSelectedUnit(unit); setUnitTab("notes") }}
                        >
                          <button
                            onClick={e => { e.stopPropagation(); toggleUnitComplete(unit, mod.id) }}
                            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                              unit.isCompleted ? "bg-green-500 border-green-500" : "border-gray-600 hover:border-gray-400"
                            }`}
                          >
                            {unit.isCompleted && <Check size={10} className="text-white" />}
                          </button>
                          <span className={`text-sm flex-1 ${unit.isCompleted ? "line-through text-gray-500" : "text-gray-300"}`}>{unit.name}</span>
                          <button onClick={e => { e.stopPropagation(); setUnitName(unit.name); setEditUnitId(unit.id); setUnitModuleId(mod.id); setUnitModal("edit") }} className="p-1 text-gray-500 hover:text-white hover:bg-gray-700 rounded transition-colors opacity-0 group-hover:opacity-100">
                            <Pencil size={11} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); setDeleteUnitId(unit.id); setUnitModuleId(mod.id) }} className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors">
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => { setUnitName(""); setEditUnitId(null); setUnitModuleId(mod.id); setUnitModal("create") }}
                      className="flex items-center gap-1.5 mt-2 px-3 py-1.5 text-gray-400 hover:text-white text-xs hover:bg-gray-800 rounded-lg transition-colors w-full"
                    >
                      <Plus size={12} /> Add Unit
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Unit detail panel */}
      {freshSelectedUnit && (
        <div className="w-96 border-l border-gray-800 bg-gray-900 flex flex-col overflow-hidden flex-shrink-0">
          <div className="p-5 border-b border-gray-800 flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-white">{freshSelectedUnit.name}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <div className={`w-2 h-2 rounded-full ${freshSelectedUnit.isCompleted ? "bg-green-500" : "bg-gray-600"}`} />
                <span className="text-xs text-gray-400">{freshSelectedUnit.isCompleted ? "Completed" : "In progress"}</span>
              </div>
            </div>
            <button onClick={() => setSelectedUnit(null)} className="text-gray-400 hover:text-white flex-shrink-0">
              <X size={18} />
            </button>
          </div>

          {/* Unit tabs */}
          <div className="flex border-b border-gray-800">
            {(["notes", "flashcards", "checklists"] as const).map(t => (
              <button key={t} onClick={() => setUnitTab(t)} className={`flex-1 py-3 text-xs font-medium capitalize transition-all ${unitTab === t ? "text-indigo-400 border-b-2 border-indigo-500" : "text-gray-400 hover:text-white"}`}>
                {t}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {/* NOTES TAB */}
            {unitTab === "notes" && (
              <div>
                <div className="mb-4">
                  <textarea
                    className={inputCls + " resize-none h-28"}
                    placeholder="Write a note..."
                    value={noteContent}
                    onChange={e => setNoteContent(e.target.value)}
                  />
                  <div className="flex gap-2 mt-2">
                    {editNoteId && (
                      <button onClick={() => { setNoteContent(""); setEditNoteId(null) }} className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-xs hover:bg-gray-700 transition-colors">
                        Cancel
                      </button>
                    )}
                    <button onClick={handleSaveNote} disabled={noteSaving || !noteContent.trim()} className="flex-1 py-1.5 bg-indigo-600 text-white rounded-lg text-xs hover:bg-indigo-700 transition-colors disabled:opacity-50">
                      {editNoteId ? "Update Note" : "Add Note"}
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {freshSelectedUnit.notes.map(note => (
                    <div key={note.id} className="bg-gray-800 rounded-xl p-3 group">
                      <p className="text-gray-200 text-sm whitespace-pre-wrap">{note.content}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-gray-500 text-xs">{new Date(note.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setNoteContent(note.content); setEditNoteId(note.id) }} className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"><Pencil size={11} /></button>
                          <button onClick={() => handleDeleteNote(note.id)} className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"><Trash2 size={11} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FLASHCARDS TAB */}
            {unitTab === "flashcards" && (
              <div>
                <div className="mb-4 space-y-2">
                  <input className={inputCls} placeholder="Front (question)" value={fcFront} onChange={e => setFcFront(e.target.value)} />
                  <input className={inputCls} placeholder="Back (answer)" value={fcBack} onChange={e => setFcBack(e.target.value)} />
                  <div className="flex gap-2">
                    {editFcId && (
                      <button onClick={() => { setFcFront(""); setFcBack(""); setEditFcId(null) }} className="px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg text-xs hover:bg-gray-700 transition-colors">
                        Cancel
                      </button>
                    )}
                    <button onClick={handleSaveFc} disabled={fcSaving || !fcFront.trim() || !fcBack.trim()} className="flex-1 py-1.5 bg-indigo-600 text-white rounded-lg text-xs hover:bg-indigo-700 transition-colors disabled:opacity-50">
                      {editFcId ? "Update Card" : "Add Card"}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {freshSelectedUnit.flashcards.map(fc => {
                    const flipped = flippedCards.has(fc.id)
                    return (
                      <div key={fc.id} className="group">
                        <div
                          className="bg-gray-800 rounded-xl p-4 cursor-pointer hover:bg-gray-700/50 transition-colors"
                          onClick={() => toggleFlip(fc.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-xs text-gray-500 mb-1">{flipped ? "Answer" : "Question"}</p>
                              <p className="text-sm text-white">{flipped ? fc.back : fc.front}</p>
                            </div>
                            <RotateCcw size={13} className="text-gray-500 flex-shrink-0 mt-0.5" />
                          </div>
                        </div>
                        <div className="flex gap-1 justify-end mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setFcFront(fc.front); setFcBack(fc.back); setEditFcId(fc.id) }} className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"><Pencil size={11} /></button>
                          <button onClick={() => handleDeleteFc(fc.id)} className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"><Trash2 size={11} /></button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* CHECKLISTS TAB */}
            {unitTab === "checklists" && (
              <div>
                <div className="bg-gray-800 rounded-xl p-4 mb-4">
                  <input className={inputCls + " mb-2"} placeholder="Checklist title" value={clTitle} onChange={e => setClTitle(e.target.value)} />
                  <div className="space-y-2 mb-3">
                    {clItems.map((item, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          className={inputCls}
                          placeholder={`Item ${idx + 1}`}
                          value={item}
                          onChange={e => {
                            const next = [...clItems]
                            next[idx] = e.target.value
                            setClItems(next)
                          }}
                        />
                        {clItems.length > 1 && (
                          <button onClick={() => setClItems(clItems.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-400 transition-colors">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setClItems([...clItems, ""])} className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-xs hover:bg-gray-600 transition-colors">
                      + Item
                    </button>
                    <button onClick={handleSaveChecklist} disabled={clSaving || !clTitle.trim()} className="flex-1 py-1.5 bg-indigo-600 text-white rounded-lg text-xs hover:bg-indigo-700 transition-colors disabled:opacity-50">
                      Create
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  {freshSelectedUnit.checklists.map(cl => (
                    <div key={cl.id} className="bg-gray-800 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-white text-sm font-medium">{cl.title}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{cl.items.filter(i => i.isCompleted).length}/{cl.items.length}</span>
                          <button onClick={() => handleDeleteChecklist(cl.id)} className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors">
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {cl.items.sort((a, b) => a.order - b.order).map(item => (
                          <label key={item.id} className="flex items-center gap-2 cursor-pointer group/item">
                            <button
                              onClick={() => toggleChecklistItem(cl.id, item.id, item.isCompleted)}
                              className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                                item.isCompleted ? "bg-indigo-500 border-indigo-500" : "border-gray-600 group-hover/item:border-gray-400"
                              }`}
                            >
                              {item.isCompleted && <Check size={10} className="text-white" />}
                            </button>
                            <span className={`text-sm ${item.isCompleted ? "line-through text-gray-500" : "text-gray-300"}`}>{item.text}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Module Modal */}
      {moduleModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-gray-800">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">{moduleModal === "create" ? "Add Module" : "Edit Module"}</h2>
              <button onClick={() => setModuleModal(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div>
              <label className={labelCls}>Module Name</label>
              <input className={inputCls} placeholder="Module name" value={moduleName} onChange={e => setModuleName(e.target.value)} onKeyDown={e => e.key === "Enter" && !moduleSaving && moduleName && handleSaveModule()} autoFocus />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setModuleModal(null)} className="flex-1 py-2.5 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors">Cancel</button>
              <button onClick={handleSaveModule} disabled={moduleSaving || !moduleName} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50">
                {moduleSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unit Modal */}
      {unitModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-gray-800">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-white">{unitModal === "create" ? "Add Unit" : "Edit Unit"}</h2>
              <button onClick={() => setUnitModal(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div>
              <label className={labelCls}>Unit Name</label>
              <input className={inputCls} placeholder="Unit name" value={unitName} onChange={e => setUnitName(e.target.value)} onKeyDown={e => e.key === "Enter" && !unitSaving && unitName && handleSaveUnit()} autoFocus />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setUnitModal(null)} className="flex-1 py-2.5 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors">Cancel</button>
              <button onClick={handleSaveUnit} disabled={unitSaving || !unitName} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50">
                {unitSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete module confirmation */}
      {deleteModuleId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-2">Delete Module</h2>
            <p className="text-gray-400 text-sm mb-6">All units and their content inside this module will be permanently deleted.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModuleId(null)} className="flex-1 py-2.5 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors">Cancel</button>
              <button onClick={handleDeleteModule} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete unit confirmation */}
      {deleteUnitId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-2">Delete Unit</h2>
            <p className="text-gray-400 text-sm mb-6">All notes, flashcards and checklists inside this unit will be permanently deleted.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteUnitId(null)} className="flex-1 py-2.5 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors">Cancel</button>
              <button onClick={handleDeleteUnit} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
