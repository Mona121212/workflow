
// src/routes/tasks.ts
import type { Request, Response } from 'express'
import { prisma } from '../db'

export async function listTasks(req: Request, res: Response) {
  const tenantId = req.headers['x-tenant-id'] as string // 
  if (!tenantId) return res.status(400).send('Missing x-tenant-id')

  const data = await prisma.$transaction(async (tx) => {
    
    await tx.$executeRaw`SET LOCAL app.tenant_id = ${tenantId}`

    
    const tasks = await tx.task.findMany()
    return tasks
  })

  res.json(data)
}
