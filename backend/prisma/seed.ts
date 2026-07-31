import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const adminPassword = await bcrypt.hash('admin123', 12);

  await prisma.user.upsert({
    where: { email: 'admin@ipak.com' },
    update: {},
    create: {
      email: 'admin@ipak.com',
      password: adminPassword,
      name: 'Admin',
      plant: 'ipak',
      role: 'admin',
      status: 'active',
      permissions: JSON.parse('["dashboard.view","production.view","production.create","production.edit","production.delete","production.approve","production.import","dispatch.view","dispatch.create","dispatch.edit","dispatch.approve","dispatchReport.view","packing.view","packing.create","packing.edit","packing.delete","analytics.view","admin.view","admin.users.manage","admin.machines.manage","admin.products.manage","admin.customers.manage"]'),
    },
  });

  const machines = [
    { plant: 'ipak', name: 'Metallizer-01', code: 'MET-01', type: 'Metallizer' },
    { plant: 'ipak', name: 'Metallizer-02', code: 'MET-02', type: 'Metallizer' },
    { plant: 'ipak', name: 'Extrusion-01', code: 'EXT-01', type: 'Extrusion' },
    { plant: 'ipak', name: 'Extrusion-02', code: 'EXT-02', type: 'Extrusion' },
    { plant: 'cpak', name: 'Metallizer-01', code: 'MET-01', type: 'Metallizer' },
    { plant: 'gpak', name: 'Metallizer-01', code: 'MET-01', type: 'Metallizer' },
    { plant: 'petpak', name: 'Extrusion-01', code: 'EXT-01', type: 'Extrusion' },
  ];

  for (const m of machines) {
    await prisma.machine.upsert({
      where: { plant_code: { plant: m.plant, code: m.code } },
      update: {},
      create: m,
    });
  }

  const products = [
    { code: 'PC-001', name: 'Metallized Film 12μ', category: 'Metallized' },
    { code: 'PC-002', name: 'Metallized Film 18μ', category: 'Metallized' },
    { code: 'PC-003', name: 'Plain Film 12μ', category: 'Plain' },
    { code: 'PC-004', name: 'Plain Film 25μ', category: 'Plain' },
  ];

  for (const p of products) {
    await prisma.product.upsert({ where: { code: p.code }, update: {}, create: p });
  }

  const customers = [
    { name: 'Customer A', type: 'Export', contactPerson: 'Ali' },
    { name: 'Customer B', type: 'Local', contactPerson: 'Ahmed' },
    { name: 'Customer C', type: 'Export', contactPerson: 'Sara' },
    { name: 'Customer D', type: 'Local', contactPerson: 'Hassan' },
  ];

  for (const c of customers) {
    const existing = await prisma.customer.findFirst({ where: { name: c.name } });
    if (!existing) await prisma.customer.create({ data: c });
  }

  console.log('✅ Seed complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
