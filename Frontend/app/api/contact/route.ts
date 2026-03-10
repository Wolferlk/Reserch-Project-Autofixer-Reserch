import { NextResponse } from 'next/server'
import { getMongoClientPromise } from '@/lib/mongodb'

type ContactPayload = {
  name?: string
  email?: string
  phone?: string
  subject?: string
  message?: string
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ContactPayload

    const name = String(body.name || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const phone = String(body.phone || '').trim()
    const subject = String(body.subject || '').trim().toLowerCase()
    const message = String(body.message || '').trim()

    if (name.length < 2) {
      return NextResponse.json({ success: false, message: 'Full name is required.' }, { status: 400 })
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ success: false, message: 'A valid email address is required.' }, { status: 400 })
    }

    if (!subject) {
      return NextResponse.json({ success: false, message: 'Subject is required.' }, { status: 400 })
    }

    if (message.length < 10) {
      return NextResponse.json({ success: false, message: 'Message must be at least 10 characters long.' }, { status: 400 })
    }

    const dbName = process.env.MONGODB_DB_NAME || 'autofixer'
    const collectionName = process.env.MONGODB_CONTACT_COLLECTION || 'contact_messages'

    const client = await getMongoClientPromise()
    const db = client.db(dbName)

    const forwardedFor = request.headers.get('x-forwarded-for')
    const userAgent = request.headers.get('user-agent')

    const doc = {
      name,
      email,
      phone,
      subject,
      message,
      status: 'new',
      source: 'contact_page',
      metadata: {
        userAgent: userAgent || '',
        ip: forwardedFor?.split(',')[0]?.trim() || '',
      },
      createdAt: new Date(),
    }

    const result = await db.collection(collectionName).insertOne(doc)

    return NextResponse.json(
      {
        success: true,
        message: 'Contact form received successfully',
        id: result.insertedId.toString(),
      },
      { status: 201 },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown server error'
    return NextResponse.json({ success: false, message }, { status: 500 })
  }
}
