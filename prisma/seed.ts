import { PrismaClient, Role } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'acme' },
    update: {},
    create: { name: 'Acme Inc.', slug: 'acme' },
  })

  // admin account
  const admin = await prisma.user.upsert({
    where: { email: 'admin@acme.test' },
    update: {},
    create: { email: 'admin@acme.test', passwordHash: 'seeded-no-login' },
  })

  await prisma.membership.upsert({
    where: { userId_tenantId: { userId: admin.id, tenantId: tenant.id } },
    update: { role: Role.OWNER },
    create: { userId: admin.id, tenantId: tenant.id, role: Role.OWNER },
  })

  // member account
  const member = await prisma.user.upsert({
    where: { email: 'member@acme.test' },
    update: {},
    create: { email: 'member@acme.test', passwordHash: 'seeded-no-login' },
  })

  await prisma.membership.upsert({
    where: { userId_tenantId: { userId: member.id, tenantId: tenant.id } },
    update: { role: Role.MEMBER },
    create: { userId: member.id, tenantId: tenant.id, role: Role.MEMBER },
  })

  console.log('Seeded tenant & users')
}

main().finally(() => prisma.$disconnect())
