import { PrismaClient } from '../backend/node_modules/@prisma/client';

const prisma = new PrismaClient();

const passwordMap: Record<string, string> = {
  admin: 'admin123',
  imtiaz: 'imtiaz123',
  operator: 'operator123',
  manager: 'manager123',
};

async function main() {
  console.log('Updating plain passwords...');
  
  for (const [username, password] of Object.entries(passwordMap)) {
    try {
      const user = await (prisma as any).user.update({
        where: { username },
        data: { plainPassword: password },
      });
      console.log(`✅ Updated ${username}: ${password}`);
    } catch (e: any) {
      console.log(`❌ Failed to update ${username}: ${e.message}`);
    }
  }
  
  console.log('Done!');
}

main()
  .catch(console.error)
  .finally(() => (prisma as any).$disconnect());
