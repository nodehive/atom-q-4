import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { UserRole, QuizStatus } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== UserRole.USER) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Get quizzes that are either:
    // 1. Available to all users (no specific user assignment)
    // 2. Assigned to this user via quizUsers relationship
    // 3. Assigned to this user via quizAttempt (enrollment)
    const quizzes = await db.quiz.findMany({
      where: {
        OR: [
          {
            quizUsers: {
              none: {}
            }
          },
          {
            quizUsers: {
              some: {
                userId: userId
              }
            }
          },
          {
            quizAttempts: {
              some: {
                userId: userId
              }
            }
          }
        ],
        status: QuizStatus.ACTIVE
      },
      include: {
        _count: {
          select: {
            quizQuestions: true,
            quizAttempts: true
          }
        },
        quizAttempts: {
          where: {
            userId: userId
          },
          orderBy: {
            createdAt: "desc"
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    const formattedQuizzes = quizzes.map(quiz => ({
      ...quiz,
      userAttempt: quiz.quizAttempts[0] || null,
      attemptCount: quiz.quizAttempts.length
    }))

    return NextResponse.json(formattedQuizzes)
  } catch (error) {
    console.error("Error fetching user quizzes:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}