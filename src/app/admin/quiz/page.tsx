"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { 
  MoreHorizontal, 
  Plus, 
  Download, 
  Upload,
  Edit,
  Trash2,
  Eye,
  Users,
  FileQuestion,
  ArrowUpDown
} from "lucide-react"
import { toasts } from "@/lib/toasts"
import { DifficultyLevel, QuizStatus } from "@prisma/client"
import Papa from "papaparse"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"

interface Quiz {
  id: string
  title: string
  description?: string
  category?: { name: string }
  timeLimit?: number
  difficulty: DifficultyLevel
  status: QuizStatus
  negativeMarking: boolean
  negativePoints?: number
  randomOrder: boolean
  maxAttempts?: number
  startTime?: string
  endTime?: string
  createdAt: string
  _count: {
    quizQuestions: number
    quizAttempts: number
  }
}

interface FormData {
  title: string
  description: string
  timeLimit: string
  difficulty: DifficultyLevel
  status: QuizStatus
  negativeMarking: boolean
  negativePoints: string
  randomOrder: boolean
  maxAttempts: string
  startTime: string
  endTime: string
}

export default function QuizzesPage() {
  const router = useRouter()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null)
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null)
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    timeLimit: "",
    difficulty: DifficultyLevel.EASY,
    status: QuizStatus.DRAFT,
    negativeMarking: false,
    negativePoints: "",
    randomOrder: false,
    maxAttempts: "",
    startTime: "",
    endTime: "",
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const columns: ColumnDef<Quiz>[] = [
    {
      accessorKey: "title",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Title
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("title")}</div>
      ),
    },
    {
      accessorKey: "difficulty",
      header: "Difficulty",
      cell: ({ row }) => {
        const difficulty = row.getValue("difficulty") as DifficultyLevel
        return (
          <Badge variant={
            difficulty === DifficultyLevel.EASY ? "default" :
            difficulty === DifficultyLevel.MEDIUM ? "secondary" : "destructive"
          }>
            {difficulty}
          </Badge>
        )
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as QuizStatus
        return (
          <Badge variant={status === QuizStatus.ACTIVE ? "default" : "secondary"}>
            {status}
          </Badge>
        )
      },
    },
    {
      accessorKey: "timeLimit",
      header: "Time Limit",
      cell: ({ row }) => {
        const timeLimit = row.getValue("timeLimit") as number
        return timeLimit ? `${timeLimit} min` : "No limit"
      },
    },
    {
      accessorKey: "_count.quizQuestions",
      header: "Questions",
      cell: ({ row }) => {
        const quiz = row.original
        return quiz._count?.quizQuestions || 0
      },
    },
    {
      accessorKey: "_count.quizAttempts",
      header: "Attempts",
      cell: ({ row }) => {
        const quiz = row.original
        return quiz._count?.quizAttempts || 0
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Created At
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"))
        return date.toLocaleDateString()
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const quiz = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/admin/quiz/${quiz.id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/admin/quiz/${quiz.id}/questions`)}>
                <FileQuestion className="mr-2 h-4 w-4" />
                Questions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/admin/quiz/${quiz.id}/students`)}>
                <Users className="mr-2 h-4 w-4" />
                Students
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEditDialog(quiz)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => openDeleteDialog(quiz)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  useEffect(() => {
    fetchQuizzes()
  }, [])

  const fetchQuizzes = async () => {
    try {
      const response = await fetch("/api/admin/quiz")
      if (response.ok) {
        const data = await response.json()
        setQuizzes(data)
      }
    } catch (error) {
      toasts.networkError()
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const isEditing = selectedQuiz !== null

    try {
      const url = isEditing ? `/api/admin/quiz/${selectedQuiz.id}` : "/api/admin/quiz"
      const method = isEditing ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          timeLimit: formData.timeLimit ? parseInt(formData.timeLimit) : null,
          negativePoints: formData.negativePoints ? parseFloat(formData.negativePoints) : null,
          maxAttempts: formData.maxAttempts ? parseInt(formData.maxAttempts) : null,
          startTime: formData.startTime || null,
          endTime: formData.endTime || null,
        }),
      })

      if (response.ok) {
        toasts.success(isEditing ? "Quiz updated successfully" : "Quiz created successfully")
        setIsAddDialogOpen(false)
        setIsEditDialogOpen(false)
        setSelectedQuiz(null)
        resetForm()
        fetchQuizzes()
      } else {
        const error = await response.json()
        toasts.error(error.message || "Operation failed")
      }
    } catch (error) {
      toasts.actionFailed(isEditing ? "Quiz update" : "Quiz creation")
    }
  }

  const handleDeleteQuiz = async (quizId: string) => {
    try {
      const response = await fetch(`/api/admin/quiz/${quizId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toasts.quizDeleted()
        setQuizzes(quizzes.filter(quiz => quiz.id !== quizId))
        setIsDeleteDialogOpen(false)
        setQuizToDelete(null)
      } else {
        toasts.actionFailed("Quiz deletion")
      }
    } catch (error) {
      toasts.actionFailed("Quiz deletion")
    }
  }

  const openEditDialog = (quiz: Quiz) => {
    setSelectedQuiz(quiz)
    setFormData({
      title: quiz.title,
      description: quiz.description || "",
      timeLimit: quiz.timeLimit?.toString() || "",
      difficulty: quiz.difficulty,
      status: quiz.status,
      negativeMarking: quiz.negativeMarking,
      negativePoints: quiz.negativePoints?.toString() || "",
      randomOrder: quiz.randomOrder,
      maxAttempts: quiz.maxAttempts?.toString() || "",
      startTime: quiz.startTime || "",
      endTime: quiz.endTime || "",
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (quiz: Quiz) => {
    setQuizToDelete(quiz)
    setIsDeleteDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      timeLimit: "",
      difficulty: DifficultyLevel.EASY,
      status: QuizStatus.DRAFT,
      negativeMarking: false,
      negativePoints: "",
      randomOrder: false,
      maxAttempts: "",
      startTime: "",
      endTime: "",
    })
  }

  const handleExportQuizzes = () => {
    const csvData = quizzes.map(quiz => ({
      title: quiz.title,
      description: quiz.description || "",
      difficulty: quiz.difficulty,
      status: quiz.status,
      timeLimit: quiz.timeLimit || "",
      negativeMarking: quiz.negativeMarking,
      negativePoints: quiz.negativePoints || "",
      randomOrder: quiz.randomOrder,
      maxAttempts: quiz.maxAttempts || "",
      questions: quiz._count.quizQuestions,
      attempts: quiz._count.quizAttempts,
      createdAt: quiz.createdAt,
    }))

    const csv = Papa.unparse(csvData)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", "quizzes.csv")
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toasts.success("Quizzes exported successfully")
  }

  const handleImportQuizzes = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      Papa.parse(file, {
        complete: async (results) => {
          try {
            const response = await fetch("/api/admin/quiz", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ importData: results.data }),
            })

            if (response.ok) {
              toasts.success("Quizzes imported successfully")
              fetchQuizzes()
            } else {
              toasts.error("Import failed")
            }
          } catch (error) {
            toasts.actionFailed("Quiz import")
          }
        },
        header: true,
        skipEmptyLines: true,
      })
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quizzes</h1>
          <p className="text-muted-foreground">
            Create and manage quiz assessments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportQuizzes}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" onClick={handleImportQuizzes}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Quiz
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Quizzes</CardTitle>
          <CardDescription>
            Manage all quiz assessments in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={columns} 
            data={quizzes} 
            searchKey="title"
            searchPlaceholder="Search quizzes..."
          />
        </CardContent>
      </Card>

      {/* Add Quiz Sheet */}
      <Sheet open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <SheetContent className="sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create New Quiz</SheetTitle>
            <SheetDescription>
              Create a new quiz with the specified settings.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid flex-1 auto-rows-min gap-6 px-4">
              <div className="grid gap-3">
                <Label htmlFor="add-title">Title</Label>
                <Input
                  id="add-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="add-description">Description</Label>
                <Textarea
                  id="add-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="add-difficulty">Difficulty</Label>
                <Select value={formData.difficulty} onValueChange={(value: DifficultyLevel) => setFormData({ ...formData, difficulty: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DifficultyLevel.EASY}>Easy</SelectItem>
                    <SelectItem value={DifficultyLevel.MEDIUM}>Medium</SelectItem>
                    <SelectItem value={DifficultyLevel.HARD}>Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3">
                <Label htmlFor="add-time-limit">Time Limit (minutes)</Label>
                <Input
                  id="add-time-limit"
                  type="number"
                  value={formData.timeLimit}
                  onChange={(e) => setFormData({ ...formData, timeLimit: e.target.value })}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="add-status">Status</Label>
                <Select value={formData.status} onValueChange={(value: QuizStatus) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={QuizStatus.DRAFT}>Draft</SelectItem>
                    <SelectItem value={QuizStatus.ACTIVE}>Active</SelectItem>
                    <SelectItem value={QuizStatus.ARCHIVED}>Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="add-negative-marking"
                    checked={formData.negativeMarking}
                    onCheckedChange={(checked) => setFormData({ ...formData, negativeMarking: checked })}
                  />
                  <Label htmlFor="add-negative-marking">Negative Marking</Label>
                </div>
              </div>
              {formData.negativeMarking && (
                <div className="grid gap-3">
                  <Label htmlFor="add-negative-points">Negative Points</Label>
                  <Input
                    id="add-negative-points"
                    type="number"
                    step="0.1"
                    value={formData.negativePoints}
                    onChange={(e) => setFormData({ ...formData, negativePoints: e.target.value })}
                  />
                </div>
              )}
              <div className="grid gap-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="add-random-order"
                    checked={formData.randomOrder}
                    onCheckedChange={(checked) => setFormData({ ...formData, randomOrder: checked })}
                  />
                  <Label htmlFor="add-random-order">Random Question Order</Label>
                </div>
              </div>
            </div>
            <SheetFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Quiz</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Edit Quiz Sheet */}
      <Sheet open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <SheetContent className="sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Quiz</SheetTitle>
            <SheetDescription>
              Update quiz settings and configuration.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid flex-1 auto-rows-min gap-6 px-4">
              <div className="grid gap-3">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="edit-difficulty">Difficulty</Label>
                <Select value={formData.difficulty} onValueChange={(value: DifficultyLevel) => setFormData({ ...formData, difficulty: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={DifficultyLevel.EASY}>Easy</SelectItem>
                    <SelectItem value={DifficultyLevel.MEDIUM}>Medium</SelectItem>
                    <SelectItem value={DifficultyLevel.HARD}>Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3">
                <Label htmlFor="edit-time-limit">Time Limit (minutes)</Label>
                <Input
                  id="edit-time-limit"
                  type="number"
                  value={formData.timeLimit}
                  onChange={(e) => setFormData({ ...formData, timeLimit: e.target.value })}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="edit-status">Status</Label>
                <Select value={formData.status} onValueChange={(value: QuizStatus) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={QuizStatus.DRAFT}>Draft</SelectItem>
                    <SelectItem value={QuizStatus.ACTIVE}>Active</SelectItem>
                    <SelectItem value={QuizStatus.ARCHIVED}>Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-negative-marking"
                    checked={formData.negativeMarking}
                    onCheckedChange={(checked) => setFormData({ ...formData, negativeMarking: checked })}
                  />
                  <Label htmlFor="edit-negative-marking">Negative Marking</Label>
                </div>
              </div>
              {formData.negativeMarking && (
                <div className="grid gap-3">
                  <Label htmlFor="edit-negative-points">Negative Points</Label>
                  <Input
                    id="edit-negative-points"
                    type="number"
                    step="0.1"
                    value={formData.negativePoints}
                    onChange={(e) => setFormData({ ...formData, negativePoints: e.target.value })}
                  />
                </div>
              )}
              <div className="grid gap-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-random-order"
                    checked={formData.randomOrder}
                    onCheckedChange={(checked) => setFormData({ ...formData, randomOrder: checked })}
                  />
                  <Label htmlFor="edit-random-order">Random Question Order</Label>
                </div>
              </div>
            </div>
            <SheetFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Quiz</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{quizToDelete?.title}"? This action cannot be undone and will remove all associated questions and results.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteDialogOpen(false)
              setQuizToDelete(null)
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => quizToDelete && handleDeleteQuiz(quizToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Quiz
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}