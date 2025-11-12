import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id')
  if (!tenantId) return NextResponse.json({ error: 'Missing x-tenant-id' }, { status: 400 })

  const tasks = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL app.tenant_id = ${tenantId}`
    return tx.task.findMany()
  })

  return NextResponse.json(tasks)
}