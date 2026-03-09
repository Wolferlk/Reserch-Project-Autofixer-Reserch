import { NextResponse } from 'next/server'
import { getMongoClientPromise } from '@/lib/mongodb'

type SubmissionPayload = {
  page: string
  successStatus: 'success' | 'not_fixed' | ''
  errorName?: string
  windowsVersion?: string
  processorType?: string
  ramCapacity?: string
  errorFixedNote: string
  userName: string
  userEmail: string
  generatedOutput?: string
  detectedEnvironment?: {
    platform?: string
    userAgent?: string
    cpuCores?: number | null
    deviceMemoryGb?: number | null
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SubmissionPayload

    const page = String(body.page || '').trim()
    const successStatus = body.successStatus || ''
    const errorFixedNote = String(body.errorFixedNote || '').trim()
    const userName = String(body.userName || '').trim()
    const userEmail = String(body.userEmail || '').trim().toLowerCase()

    if (!page) {
      return NextResponse.json({ error: 'page is required' }, { status: 400 })
    }

    if (!successStatus || !['success', 'not_fixed'].includes(successStatus)) {
      return NextResponse.json({ error: 'successStatus must be success or not_fixed' }, { status: 400 })
    }

    if (errorFixedNote.length < 5) {
      return NextResponse.json({ error: 'errorFixedNote is required' }, { status: 400 })
    }

    if (userName.length < 2) {
      return NextResponse.json({ error: 'userName is required' }, { status: 400 })
    }

    if (!isValidEmail(userEmail)) {
      return NextResponse.json({ error: 'A valid userEmail is required' }, { status: 400 })
    }

    const dbName = process.env.MONGODB_DB_NAME || 'autofixer'
    const collectionName = process.env.MONGODB_ADMIN_COLLECTION || 'admin_submissions'

    const client = await getMongoClientPromise()
    const db = client.db(dbName)

    const doc = {
      page,
      successStatus,
      errorName: String(body.errorName || '').trim(),
      environment: {
        windowsVersion: String(body.windowsVersion || '').trim(),
        processorType: String(body.processorType || '').trim(),
        ramCapacity: String(body.ramCapacity || '').trim(),
      },
      errorFixedNote,
      user: {
        name: userName,
        email: userEmail,
      },
      generatedOutput: String(body.generatedOutput || '').trim(),
      detectedEnvironment: body.detectedEnvironment || {},
      createdAt: new Date(),
    }

    const insertResult = await db.collection(collectionName).insertOne(doc)

    return NextResponse.json({ ok: true, id: insertResult.insertedId.toString() }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
