import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole, DifficultyLevel, QuizStatus } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const quizzes = await db.quiz.findMany({
      include: {
        _count: {
          select: {
            quizQuestions: true,
            quizAttempts: true,
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    return NextResponse.json(quizzes)
  } catch (error) {
    console.error("Error fetching quizzes:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const { 
      title, 
      description, 
      timeLimit, 
      difficulty, 
      negativeMarking, 
      negativePoints, 
      randomOrder, 
      maxAttempts, 
      startTime, 
      endTime 
    } = await request.json()

    const quiz = await db.quiz.create({
      data: {
        title,
        description,
        timeLimit,
        difficulty: difficulty || DifficultyLevel.MEDIUM,
        status: QuizStatus.ACTIVE,
        negativeMarking: negativeMarking || false,
        negativePoints: negativePoints || 0.5,
        randomOrder: randomOrder || false,
        maxAttempts,
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        creatorId: session.user.id,
      },
      include: {
        _count: {
          select: {
            quizQuestions: true,
            quizAttempts: true,
          }
        }
      }
    })

    return NextResponse.json(quiz, { status: 201 })
  } catch (error) {
    console.error("Error creating quiz:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}