import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole, AttemptStatus } from "@prisma/client"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.USER) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const { id } = await params

    // Check if quiz exists and is active
    const quiz = await db.quiz.findUnique({
      where: { id },
      include: {
        quizQuestions: {
          select: {
            points: true
          }
        }
      }
    })

    if (!quiz) {
      return NextResponse.json(
        { message: "Quiz not found" },
        { status: 404 }
      )
    }

    if (quiz.status !== "ACTIVE") {
      return NextResponse.json(
        { message: "Quiz is not active" },
        { status: 400 }
      )
    }

    // Check time constraints
    const now = new Date()
    if (quiz.startTime && new Date(quiz.startTime) > now) {
      return NextResponse.json(
        { message: "Quiz has not started yet" },
        { status: 400 }
      )
    }

    if (quiz.endTime && new Date(quiz.endTime) < now) {
      return NextResponse.json(
        { message: "Quiz has expired" },
        { status: 400 }
      )
    }

    // Check if user has access to this quiz
    const hasAccess = await db.quizUser.findFirst({
      where: {
        quizId: id,
        userId
      }
    })

    // If quiz has specific user assignments, check if user is assigned
    const assignedUsers = await db.quizUser.findMany({
      where: { quizId: id }
    })

    if (assignedUsers.length > 0 && !hasAccess) {
      return NextResponse.json(
        { message: "You don't have access to this quiz" },
        { status: 403 }
      )
    }

    // Check max attempts
    if (quiz.maxAttempts) {
      const attemptCount = await db.quizAttempt.count({
        where: {
          quizId: id,
          userId
        }
      })

      if (attemptCount >= quiz.maxAttempts) {
        return NextResponse.json(
          { message: "Maximum attempts reached" },
          { status: 400 }
        )
      }
    }

    // Check for any existing attempt (in progress or completed)
    const existingAttempt = await db.quizAttempt.findFirst({
      where: {
        quizId: id,
        userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // If there's an in-progress attempt, return it
    if (existingAttempt && existingAttempt.status === AttemptStatus.IN_PROGRESS) {
      return NextResponse.json({ 
        message: "Quiz already in progress",
        attemptId: existingAttempt.id
      })
    }

    // Calculate total points
    const totalPoints = quiz.quizQuestions.reduce((sum, qq) => sum + qq.points, 0)

    // If there's already a completed attempt and no max attempts limit, 
    // or if we haven't reached max attempts, create a new one
    let attempt
    if (existingAttempt) {
      // Update the existing attempt to restart it
      attempt = await db.quizAttempt.update({
        where: { id: existingAttempt.id },
        data: {
          status: AttemptStatus.IN_PROGRESS,
          startedAt: new Date(),
          totalPoints: totalPoints,
          score: null,
          timeTaken: null,
          submittedAt: null
        }
      })
    } else {
      // Create new attempt
      attempt = await db.quizAttempt.create({
        data: {
          quizId: id,
          userId,
          status: AttemptStatus.IN_PROGRESS,
          startedAt: new Date(),
          totalPoints: totalPoints
        }
      })
    }

    return NextResponse.json({ 
      message: "Quiz started successfully",
      attemptId: attempt.id
    })
  } catch (error) {
    console.error("Error starting quiz:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}