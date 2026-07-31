import { Hono } from 'hono';
import { getServerToolsClient } from '@shogo-ai/sdk/tools';
import { prisma } from './src/lib/db';

const app = new Hono();

import { createHash, randomBytes, timingSafeEqual } from 'crypto';

async function auditLog(userId: string, userName: string, action: string, module: string, details?: string) {
  try {
    await (prisma as any).auditLog.create({
      data: { userId, userName, action, module, details: details || null },
    });
  } catch (e: any) {
    console.error('Audit log write failed:', e.message);
  }
}

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || randomBytes(16).toString('hex');
  const h = createHash('sha256').update(s + password).digest('hex');
  return { hash: h, salt: s };
}

function verifyPassword(password: string, storedHash: string, salt: string): boolean {
  const { hash } = hashPassword(password, salt);
  return hash === storedHash;
}

app.post('/auth/login', async (c) => {
  const body = await c.req.json();
  const { username, password } = body;
  if (!username || !password) {
    return c.json({ ok: false, error: 'Username and password are required.' }, 400);
  }
  const loginId = username.toLowerCase();
  const user = await (prisma as any).user.findFirst({
    where: { username: loginId },
  });
  if (!user || !user.password) {
    return c.json({ ok: false, error: 'Invalid username or password.' }, 401);
  }
  const [storedHash, salt] = user.password.split(':');
  if (!verifyPassword(password, storedHash, salt)) {
    return c.json({ ok: false, error: 'Invalid username or password.' }, 401);
  }
  return c.json({ ok: true, user: { id: user.id, name: user.name, username: user.username, email: user.email, role: user.role } });
});
app.get('/user-management/list', async (c) => {
  const users = await (prisma as any).user.findMany({
    select: { id: true, name: true, username: true, email: true, role: true, createdAt: true, plainPassword: true },
    orderBy: { createdAt: 'asc' },
  });
  return c.json({ ok: true, items: users });
});

app.post('/user-management/create', async (c) => {
  const body = await c.req.json();
  const { name, username, email, password, role } = body;
  if (!name || !username || !password || !role) {
    return c.json({ ok: false, error: 'All fields are required (name, username, password, role).' }, 400);
  }
  const existing = await (prisma as any).user.findUnique({ where: { username: username.toLowerCase() } });
  if (existing) {
    return c.json({ ok: false, error: 'A user with this username already exists.' }, 409);
  }
  const { hash, salt } = hashPassword(password);
  const user = await (prisma as any).user.create({
    data: {
      name,
      username: username.toLowerCase(),
      email: email?.toLowerCase() || null,
      role,
      password: `${hash}:${salt}`,
      plainPassword: password,
    },
    select: { id: true, name: true, username: true, email: true, role: true, createdAt: true },
  });
  await auditLog('u1', 'Admin', 'create', 'admin', JSON.stringify({ name, username, role }));
  return c.json({ ok: true, user });
});

app.patch('/user-management/update/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { name, username, email, role } = body;
  const data: Record<string, unknown> = {};
  if (name) data.name = name;
  if (username) data.username = username.toLowerCase();
  if (email !== undefined) data.email = email?.toLowerCase() || null;
  if (role) data.role = role;
  if (Object.keys(data).length === 0) {
    return c.json({ ok: false, error: 'Nothing to update.' }, 400);
  }
  const user = await (prisma as any).user.update({
    where: { id },
    data,
    select: { id: true, name: true, username: true, email: true, role: true },
  });
  await auditLog('u1', 'Admin', 'update', 'admin', JSON.stringify(data));
  return c.json({ ok: true, user });
});

app.patch('/user-management/change-password/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { currentPassword, newPassword } = body;
  if (!newPassword) {
    return c.json({ ok: false, error: 'New password is required.' }, 400);
  }
  // If currentPassword provided, verify it first (for self-service password change)
  if (currentPassword) {
    const user = await (prisma as any).user.findUnique({ where: { id } });
    if (!user || !user.password) {
      return c.json({ ok: false, error: 'User not found.' }, 404);
    }
    const [storedHash, salt] = user.password.split(':');
    if (!verifyPassword(currentPassword, storedHash, salt)) {
      return c.json({ ok: false, error: 'Current password is incorrect.' }, 401);
    }
  }
  const { hash, salt } = hashPassword(newPassword);
  await (prisma as any).user.update({
    where: { id },
    data: { password: `${hash}:${salt}`, plainPassword: newPassword },
  });
  await auditLog('u1', 'Admin', 'update', 'admin', JSON.stringify({ changedPassword: true, targetUserId: id }));
  return c.json({ ok: true, message: 'Password updated successfully.' });
});

app.post('/user-management/batch-update-plain-passwords', async (c) => {
  const body = await c.req.json();
  const { passwords } = body; // { username: plainPassword }
  if (!passwords || typeof passwords !== 'object') {
    return c.json({ ok: false, error: 'passwords object required.' }, 400);
  }
  const results: any[] = [];
  for (const [username, plainPassword] of Object.entries(passwords)) {
    try {
      await (prisma as any).user.update({
        where: { username },
        data: { plainPassword: plainPassword as string },
      });
      results.push({ username, ok: true });
    } catch (e: any) {
      results.push({ username, ok: false, error: e.message });
    }
  }
  return c.json({ ok: true, results });
});

app.delete('/user-management/delete/:id', async (c) => {
  const id = c.req.param('id');
  // Prevent deleting the last admin
  const user = await (prisma as any).user.findUnique({ where: { id } });
  if (!user) {
    return c.json({ ok: false, error: 'User not found.' }, 404);
  }
  if (user.role === 'admin') {
    const adminCount = await (prisma as any).user.count({ where: { role: 'admin' } });
    if (adminCount <= 1) {
      return c.json({ ok: false, error: 'Cannot delete the last admin user.' }, 400);
    }
  }
  await (prisma as any).user.delete({ where: { id } });
  await auditLog('u1', 'Admin', 'delete', 'admin', JSON.stringify({ deletedUser: user.username }));
  return c.json({ ok: true, message: 'User deleted.' });
});

// Permission management
app.get('/permissions/:userId', async (c) => {
  const userId = c.req.param('userId');
  const permissions = await (prisma as any).userPermission.findMany({
    where: { userId },
    select: { permission: true },
  });
  return c.json({ ok: true, permissions: permissions.map((p: any) => p.permission) });
});

app.put('/permissions/:userId', async (c) => {
  const userId = c.req.param('userId');
  const body = await c.req.json();
  const { permissions } = body as { permissions: string[] };
  if (!Array.isArray(permissions)) {
    return c.json({ ok: false, error: 'permissions must be an array.' }, 400);
  }
  const user = await (prisma as any).user.findUnique({ where: { id: userId } });
  if (!user) return c.json({ ok: false, error: 'User not found.' }, 404);

  try {
    await (prisma as any).userPermission.deleteMany({ where: { userId } });
    for (const p of permissions) {
      await (prisma as any).userPermission.create({
        data: { userId, permission: p },
      });
    }
    await auditLog('u1', 'Admin', 'update', 'admin', JSON.stringify({ permissions }));
    return c.json({ ok: true, message: 'Permissions updated.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ ok: false, error: msg }, 500);
  }
});

app.get('/permissions-all', async (c) => {
  const allPerms = await (prisma as any).userPermission.findMany({
    select: { userId: true, permission: true },
  });
  return c.json({ ok: true, items: allPerms });
});

// ─── Plant permissions ───────────────────────────────────────────
app.get('/plants/:userId', async (c) => {
  const userId = c.req.param('userId');
  const plants = await (prisma as any).userPlant.findMany({
    where: { userId },
    select: { plantId: true, plantName: true },
  });
  return c.json({ ok: true, plants: plants.map((p: any) => ({ id: p.plantId, name: p.plantName })) });
});

app.put('/plants/:userId', async (c) => {
  const userId = c.req.param('userId');
  const body = await c.req.json();
  const { plants } = body as { plants: { id: string; name: string }[] };
  if (!Array.isArray(plants)) {
    return c.json({ ok: false, error: 'plants must be an array.' }, 400);
  }
  const user = await (prisma as any).user.findUnique({ where: { id: userId } });
  if (!user) return c.json({ ok: false, error: 'User not found.' }, 404);

  try {
    await (prisma as any).userPlant.deleteMany({ where: { userId } });
    for (const p of plants) {
      await (prisma as any).userPlant.create({
        data: { userId, plantId: p.id, plantName: p.name },
      });
    }
    return c.json({ ok: true, message: 'Plant assignments updated.' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ ok: false, error: msg }, 500);
  }
});

// Dashboard aggregation
app.get('/dashboard/kpis', async (c) => {
  const plant = c.req.query('plant');
  const dateFrom = c.req.query('dateFrom');
  const dateTo = c.req.query('dateTo');

  const where: Record<string, unknown> = {};
  if (plant) where.plantName = plant;
  if (dateFrom && dateTo) {
    where.entryDate = { gte: dateFrom, lte: dateTo };
  }

  const entries = await prisma.productionEntry.findMany({ where: where as never });
  const totalProd = entries.reduce((s, e) => s + e.productionTons, 0);
  const totalWaste = entries.reduce((s, e) => s + e.wasteTons, 0);
  const totalDowntime = entries.reduce((s, e) => s + e.downtimeMinutes, 0);
  const totalSettings = entries.reduce((s, e) => s + (e.numberOfSettings || 0), 0);
  const totalCycles = entries.reduce((s, e) => s + (e.numberOfCycles || 0), 0);

  const sections = ['Film Line', 'Slitter', 'Metallizer'];
  const sectionKpis = sections.map(section => {
    const secEntries = entries.filter(e => e.section === section);
    const secProd = secEntries.reduce((s, e) => s + e.productionTons, 0);
    const secWaste = secEntries.reduce((s, e) => s + e.wasteTons, 0);
    const secDt = secEntries.reduce((s, e) => s + e.downtimeMinutes, 0);
    const secSettings = secEntries.reduce((s, e) => s + (e.numberOfSettings || 0), 0);
    const secCycles = secEntries.reduce((s, e) => s + (e.numberOfCycles || 0), 0);
    return {
      section,
      production: secProd,
      waste: secWaste,
      wastePercent: secProd > 0 ? (secWaste / secProd * 100) : 0,
      downtimeHours: secDt / 60,
      settings: secSettings,
      cycles: secCycles,
    };
  });

  return c.json({ ok: true, total: { production: totalProd, waste: totalWaste, downtimeHours: totalDowntime / 60, settings: totalSettings, cycles: totalCycles }, sections: sectionKpis });
});

// Analytics aggregation
app.get('/analytics/production', async (c) => {
  const plant = c.req.query('plant');
  const section = c.req.query('section');
  const dateFrom = c.req.query('dateFrom');
  const dateTo = c.req.query('dateTo');
  const where: Record<string, unknown> = {};
  if (plant) where.plantName = plant;
  if (section) where.section = section;
  if (dateFrom && dateTo) where.entryDate = { gte: dateFrom, lte: dateTo };

  const entries = await prisma.productionEntry.findMany({ where: where as never, orderBy: { entryDate: 'asc' } });

  const dailyMap = new Map<string, { production: number; waste: number }>();
  const monthlyMap = new Map<string, { production: number; waste: number }>();

  entries.forEach(e => {
    const d = e.entryDate;
    const m = d.substring(0, 7);
    const cur = dailyMap.get(d) || { production: 0, waste: 0 };
    cur.production += e.productionTons;
    cur.waste += e.wasteTons;
    dailyMap.set(d, cur);

    const mon = monthlyMap.get(m) || { production: 0, waste: 0 };
    mon.production += e.productionTons;
    mon.waste += e.wasteTons;
    monthlyMap.set(m, mon);
  });

  const daily = Array.from(dailyMap.entries()).map(([date, v]) => ({ date, ...v }));
  const monthly = Array.from(monthlyMap.entries()).map(([month, v]) => ({ month, ...v }));

  return c.json({ ok: true, daily, monthly });
});

app.get('/analytics/downtime', async (c) => {
  const plant = c.req.query('plant');
  const section = c.req.query('section');
  const dateFrom = c.req.query('dateFrom');
  const dateTo = c.req.query('dateTo');
  const where: Record<string, unknown> = {};
  if (plant) where.plantName = plant;
  if (section) where.section = section;
  if (dateFrom && dateTo) where.entryDate = { gte: dateFrom, lte: dateTo };
  where.downtimeMinutes = { gt: 0 };

  const entries = await prisma.productionEntry.findMany({ where: where as never, orderBy: { entryDate: 'asc' } });

  const reasonMap = new Map<string, number>();
  const dailyMap = new Map<string, number>();
  entries.forEach(e => {
    const label = e.downtimeReasonLabel || 'Unknown';
    reasonMap.set(label, (reasonMap.get(label) || 0) + e.downtimeMinutes);
    dailyMap.set(e.entryDate, (dailyMap.get(e.entryDate) || 0) + e.downtimeMinutes);
  });

  const reasons = Array.from(reasonMap.entries())
    .map(([reason, minutes]) => ({ reason, minutes, hours: minutes / 60 }))
    .sort((a, b) => b.minutes - a.minutes);

  const daily = Array.from(dailyMap.entries())
    .map(([date, minutes]) => ({ date, downtimeHours: minutes / 60 }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const monthlyMap = new Map<string, number>();
  daily.forEach(d => {
    const m = d.date.substring(0, 7);
    monthlyMap.set(m, (monthlyMap.get(m) || 0) + d.downtimeHours);
  });
  const monthly = Array.from(monthlyMap.entries()).map(([month, downtimeHours]) => ({ month, downtimeHours }));

  return c.json({ ok: true, reasons, daily, monthly });
});

app.get('/analytics/film-wise', async (c) => {
  const plant = c.req.query('plant');
  const section = c.req.query('section');
  const dateFrom = c.req.query('dateFrom');
  const dateTo = c.req.query('dateTo');
  const where: Record<string, unknown> = {};
  if (plant) where.plantName = plant;
  if (section) where.section = section;
  if (dateFrom && dateTo) where.entryDate = { gte: dateFrom, lte: dateTo };

  const entries = await prisma.productionEntry.findMany({ where: where as never, orderBy: { entryDate: 'asc' } });

  const filmMap = new Map<string, { production: number; waste: number }>();
  entries.forEach(e => {
    const cur = filmMap.get(e.filmCodeName) || { production: 0, waste: 0 };
    cur.production += e.productionTons;
    cur.waste += e.wasteTons;
    filmMap.set(e.filmCodeName, cur);
  });

  const films = Array.from(filmMap.entries()).map(([film, v]) => ({ film, ...v }));

  const dailyFilmMap = new Map<string, Map<string, number>>();
  entries.forEach(e => {
    if (!dailyFilmMap.has(e.entryDate)) dailyFilmMap.set(e.entryDate, new Map());
    const dayMap = dailyFilmMap.get(e.entryDate)!;
    dayMap.set(e.filmCodeName, (dayMap.get(e.filmCodeName) || 0) + e.productionTons);
  });

  const daily = Array.from(dailyFilmMap.entries()).map(([date, filmMap]) => {
    const row: Record<string, unknown> = { date };
    filmMap.forEach((v, k) => { row[k] = v; });
    return row;
  });

  const filmsList = [...new Set(entries.map(e => e.filmCodeName))];

  return c.json({ ok: true, films, daily, filmsList });
});

app.get('/analytics/machine-wise', async (c) => {
  const plant = c.req.query('plant');
  const dateFrom = c.req.query('dateFrom');
  const dateTo = c.req.query('dateTo');
  const where: Record<string, unknown> = {};
  if (plant) where.plantName = plant;
  if (dateFrom && dateTo) where.entryDate = { gte: dateFrom, lte: dateTo };

  const entries = await prisma.productionEntry.findMany({ where: where as never, orderBy: { entryDate: 'asc' } });

  const machineMap = new Map<string, { section: string; production: number }>();
  entries.forEach(e => {
    const cur = machineMap.get(e.machineName) || { section: e.section, production: 0 };
    cur.production += e.productionTons;
    machineMap.set(e.machineName, cur);
  });

  const machines = Array.from(machineMap.entries()).map(([machine, v]) => ({ machine, ...v }));

  const dailyMachineMap = new Map<string, Map<string, number>>();
  entries.forEach(e => {
    if (!dailyMachineMap.has(e.entryDate)) dailyMachineMap.set(e.entryDate, new Map());
    const dayMap = dailyMachineMap.get(e.entryDate)!;
    dayMap.set(e.machineName, (dayMap.get(e.machineName) || 0) + e.productionTons);
  });

  const daily = Array.from(dailyMachineMap.entries()).map(([date, mMap]) => {
    const row: Record<string, unknown> = { date };
    mMap.forEach((v, k) => { row[k] = v; });
    return row;
  });

  const machinesList = [...new Set(entries.map(e => e.machineName))];

  return c.json({ ok: true, machines, daily, machinesList });
});

app.get('/analytics/settings', async (c) => {
  const plant = c.req.query('plant');
  const dateFrom = c.req.query('dateFrom');
  const dateTo = c.req.query('dateTo');
  const where: Record<string, unknown> = {};
  if (plant) where.plantName = plant;
  if (dateFrom && dateTo) where.entryDate = { gte: dateFrom, lte: dateTo };
  where.section = 'Slitter';

  const entries = await prisma.productionEntry.findMany({ where: where as never, orderBy: { entryDate: 'asc' } });

  const dailyMap = new Map<string, number>();
  const machineDailyMap = new Map<string, Map<string, number>>();
  entries.forEach(e => {
    dailyMap.set(e.entryDate, (dailyMap.get(e.entryDate) || 0) + (e.numberOfSettings || 0));
    if (!machineDailyMap.has(e.machineName)) machineDailyMap.set(e.machineName, new Map());
    const mDay = machineDailyMap.get(e.machineName)!;
    mDay.set(e.entryDate, (mDay.get(e.entryDate) || 0) + (e.numberOfSettings || 0));
  });

  const daily = Array.from(dailyMap.entries()).map(([date, settings]) => ({ date, settings }));
  const monthlyMap = new Map<string, number>();
  daily.forEach(d => {
    const m = d.date.substring(0, 7);
    monthlyMap.set(m, (monthlyMap.get(m) || 0) + d.settings);
  });
  const monthly = Array.from(monthlyMap.entries()).map(([month, settings]) => ({ month, settings }));

  const machinesList = [...new Set(entries.map(e => e.machineName))];
  const byMachine = machinesList.map(machine => {
    const mMap = machineDailyMap.get(machine) || new Map();
    return { machine, daily: Array.from(mMap.entries()).map(([date, settings]) => ({ date, settings })) };
  });

  return c.json({ ok: true, daily, monthly, byMachine, machinesList });
});

app.get('/analytics/cycles', async (c) => {
  const plant = c.req.query('plant');
  const dateFrom = c.req.query('dateFrom');
  const dateTo = c.req.query('dateTo');
  const where: Record<string, unknown> = {};
  if (plant) where.plantName = plant;
  if (dateFrom && dateTo) where.entryDate = { gte: dateFrom, lte: dateTo };
  where.section = 'Metallizer';

  const entries = await prisma.productionEntry.findMany({ where: where as never, orderBy: { entryDate: 'asc' } });

  const dailyMap = new Map<string, number>();
  entries.forEach(e => {
    dailyMap.set(e.entryDate, (dailyMap.get(e.entryDate) || 0) + (e.numberOfCycles || 0));
  });

  const daily = Array.from(dailyMap.entries()).map(([date, cycles]) => ({ date, cycles }));
  const monthlyMap = new Map<string, number>();
  daily.forEach(d => {
    const m = d.date.substring(0, 7);
    monthlyMap.set(m, (monthlyMap.get(m) || 0) + d.cycles);
  });
  const monthly = Array.from(monthlyMap.entries()).map(([month, cycles]) => ({ month, cycles }));

  return c.json({ ok: true, daily, monthly });
});

app.get('/analytics/target-machines', async (c) => {
  const plant = c.req.query('plant');
  const where: Record<string, unknown> = {};
  if (plant) where.plantName = plant;
  const targets = await prisma.target.findMany({ where: where as never, select: { machineName: true }, distinct: ['machineName'] });
  return c.json({ ok: true, machines: targets.map(t => t.machineName).sort() });
});

app.get('/analytics/target', async (c) => {
  const plant = c.req.query('plant');
  const machine = c.req.query('machine');
  const dateFrom = c.req.query('dateFrom');
  const dateTo = c.req.query('dateTo');
  const targetWhere: Record<string, unknown> = {};
  if (plant) targetWhere.plantName = plant;
  if (machine) targetWhere.machineName = machine;
  if (dateFrom && dateTo) targetWhere.targetDate = { gte: dateFrom, lte: dateTo };

  const prodWhere: Record<string, unknown> = {};
  if (plant) prodWhere.plantName = plant;
  if (machine) prodWhere.machineName = machine;
  if (dateFrom && dateTo) prodWhere.entryDate = { gte: dateFrom, lte: dateTo };

  const targets = await prisma.target.findMany({ where: targetWhere as never, orderBy: { targetDate: 'asc' } });
  const entries = await prisma.productionEntry.findMany({ where: prodWhere as never });

  // Build actual production map keyed by "date|machine|shift"
  const actualMap = new Map<string, number>();
  entries.forEach(e => {
    const key = `${e.entryDate}|${e.machineName}|${e.shift}`;
    actualMap.set(key, (actualMap.get(key) || 0) + e.productionTons);
  });

  // Enrich targets with actual + achievement
  const enriched = targets.map(t => {
    const key = `${t.targetDate}|${t.machineName}|${t.shift}`;
    const actual = actualMap.get(key) || 0;
    return { ...t, actual, achievement: t.dailyTargetTons > 0 ? (actual / t.dailyTargetTons * 100) : 0 };
  });

  // Daily aggregation: group by date
  const dailyMap = new Map<string, { target: number; actual: number }>();
  enriched.forEach(t => {
    const cur = dailyMap.get(t.targetDate) || { target: 0, actual: 0 };
    cur.target += t.dailyTargetTons;
    cur.actual += t.actual;
    dailyMap.set(t.targetDate, cur);
  });
  const daily = Array.from(dailyMap.entries())
    .map(([date, v]) => ({ date, target: v.target, actual: v.actual, achievement: v.target > 0 ? (v.actual / v.target * 100) : 0 }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Monthly aggregation
  const monthlyMap = new Map<string, { target: number; actual: number }>();
  daily.forEach(d => {
    const m = d.date.substring(0, 7);
    const cur = monthlyMap.get(m) || { target: 0, actual: 0 };
    cur.target += d.target;
    cur.actual += d.actual;
    monthlyMap.set(m, cur);
  });
  const monthly = Array.from(monthlyMap.entries())
    .map(([month, v]) => ({ month, target: v.target, actual: v.actual, achievement: v.target > 0 ? (v.actual / v.target * 100) : 0 }));

  return c.json({ ok: true, daily, monthly, targets: enriched });
});

// Reports
app.get('/reports', async (c) => {
  const plant = c.req.query('plant');
  const reportType = c.req.query('reportType');
  const section = c.req.query('section');
  const machine = c.req.query('machine');
  const shift = c.req.query('shift');
  const dateFrom = c.req.query('dateFrom');
  const dateTo = c.req.query('dateTo');

  const where: Record<string, unknown> = {};
  if (plant) where.plantName = plant;
  if (section) where.section = section;
  if (machine) where.machineName = machine;
  if (shift) where.shift = shift;
  if (dateFrom && dateTo) where.entryDate = { gte: dateFrom, lte: dateTo };

  if (reportType === 'Target') {
    const targets = await prisma.target.findMany({ where: where as never, orderBy: { targetDate: 'asc' } });
    const entries = await prisma.productionEntry.findMany({ where: where as never });
    const results = targets.map(t => {
      const matchingEntries = entries.filter(e =>
        e.entryDate === t.targetDate && e.machineName === t.machineName && e.shift === t.shift
      );
      const actual = matchingEntries.reduce((s, e) => s + e.productionTons, 0);
      return { ...t, actual, achievement: t.dailyTargetTons > 0 ? (actual / t.dailyTargetTons * 100) : 0 };
    });
    return c.json({ ok: true, data: results });
  }

  const entries = await prisma.productionEntry.findMany({ where: where as never, orderBy: { entryDate: 'desc' } });

  let data: unknown[] = [];
  switch (reportType) {
    case 'Overall Production':
      data = entries.map(e => ({ date: e.entryDate, machine: e.machineName, film: e.filmCodeName, production: e.productionTons, waste: e.wasteTons, wastePercent: e.wastePercent || (e.productionTons > 0 ? (e.wasteTons / e.productionTons * 100) : 0) }));
      break;
    case 'Film-wise Production': {
      const filmMap = new Map<string, { production: number; waste: number }>();
      entries.forEach(e => {
        const cur = filmMap.get(e.filmCodeName) || { production: 0, waste: 0 };
        cur.production += e.productionTons;
        cur.waste += e.wasteTons;
        filmMap.set(e.filmCodeName, cur);
      });
      data = Array.from(filmMap.entries()).map(([film, v]) => ({ film, ...v }));
      break;
    }
    case 'Machine-wise Production': {
      const mMap = new Map<string, { section: string; production: number }>();
      entries.forEach(e => {
        const cur = mMap.get(e.machineName) || { section: e.section, production: 0 };
        cur.production += e.productionTons;
        mMap.set(e.machineName, cur);
      });
      data = Array.from(mMap.entries()).map(([machine, v]) => ({ machine, ...v }));
      break;
    }
    case 'Waste':
      data = entries.map(e => ({ date: e.entryDate, machine: e.machineName, production: e.productionTons, waste: e.wasteTons, wastePercent: e.wastePercent || (e.productionTons > 0 ? (e.wasteTons / e.productionTons * 100) : 0) }));
      break;
    case 'Downtime':
      data = entries.filter(e => e.downtimeMinutes > 0).map(e => ({ date: e.entryDate, machine: e.machineName, downtimeHours: e.downtimeMinutes / 60, reason: e.downtimeReasonLabel || 'Unknown' }));
      break;
    case 'Settings':
      data = entries.filter(e => e.section === 'Slitter').map(e => ({ date: e.entryDate, machine: e.machineName, settings: e.numberOfSettings || 0 }));
      break;
    case 'Cycles':
      data = entries.filter(e => e.section === 'Metallizer').map(e => ({ date: e.entryDate, machine: e.machineName, film: e.filmCodeName, cycles: e.numberOfCycles || 0 }));
      break;
    default:
      data = entries;
  }

  return c.json({ ok: true, data });
});

// ─── Dispatch Dashboard KPIs ─────────────────────────────────────
app.get('/dashboard/dispatch-kpis', async (c) => {
  const plant = c.req.query('plant');
  const monthDateFrom = c.req.query('monthDateFrom');
  const monthDateTo = c.req.query('monthDateTo');
  const yesterdayDate = c.req.query('yesterdayDate');

  const whereMonth: Record<string, unknown> = {};
  const whereYesterday: Record<string, unknown> = {};
  if (plant) {
    whereMonth.plantName = plant;
    whereYesterday.plantName = plant;
  }
  if (monthDateFrom && monthDateTo) whereMonth.dispatchDate = { gte: monthDateFrom, lte: monthDateTo };
  if (yesterdayDate) whereYesterday.dispatchDate = { gte: yesterdayDate, lte: yesterdayDate };

  const [monthRows, yestRows] = await Promise.all([
    (prisma as any).dispatch.findMany({ where: whereMonth }),
    (prisma as any).dispatch.findMany({ where: whereYesterday }),
  ]);

  const sumByType = (rows: any[]) => {
    const total = rows.reduce((s: number, r: any) => s + r.quantityTons, 0);
    const exportTons = rows.filter((r: any) => r.dispatchType === 'Export').reduce((s: number, r: any) => s + r.quantityTons, 0);
    const localTons = rows.filter((r: any) => r.dispatchType === 'Local').reduce((s: number, r: any) => s + r.quantityTons, 0);
    return { total, exportTons, localTons };
  };

  const monthKpis = sumByType(monthRows);
  const yesterdayKpis = sumByType(yestRows);

  return c.json({ ok: true, month: monthKpis, yesterday: yesterdayKpis });
});

// ─── Dispatch Report Summary (standalone page) ─────────────────
app.get('/dispatch/report-summary', async (c) => {
  const plant = c.req.query('plant');
  const dateFrom = c.req.query('dateFrom');
  const dateTo = c.req.query('dateTo');
  const dispatchType = c.req.query('dispatchType');
  const customer = c.req.query('customer');

  const where: Record<string, unknown> = {};
  if (plant) where.plantName = plant;
  if (dateFrom && dateTo) where.dispatchDate = { gte: dateFrom, lte: dateTo };
  if (dispatchType) where.dispatchType = dispatchType;
  if (customer) where.customerName = customer;

  const rows = await (prisma as any).dispatch.findMany({ where });

  const total = rows.reduce((s: number, r: any) => s + r.quantityTons, 0);
  const exportTons = rows.filter((r: any) => r.dispatchType === 'Export').reduce((s: number, r: any) => s + r.quantityTons, 0);
  const localTons = rows.filter((r: any) => r.dispatchType === 'Local').reduce((s: number, r: any) => s + r.quantityTons, 0);
  const uniqueCustomers = new Set(rows.map((r: any) => r.customerName.toLowerCase())).size;

  // Daily trend (last 30 dates with Export/Local split)
  const dailyMap = new Map<string, { exportTons: number; localTons: number }>();
  rows.forEach((r: any) => {
    const cur = dailyMap.get(r.dispatchDate) || { exportTons: 0, localTons: 0 };
    if (r.dispatchType === 'Export') cur.exportTons += r.quantityTons;
    else cur.localTons += r.quantityTons;
    dailyMap.set(r.dispatchDate, cur);
  });
  const daily = Array.from(dailyMap.entries())
    .map(([date, v]) => ({ date, ...v, total: v.exportTons + v.localTons }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30);

  // Customer-wise Export vs Local
  const custMap = new Map<string, { exportTons: number; localTons: number }>();
  rows.forEach((r: any) => {
    const cur = custMap.get(r.customerName) || { exportTons: 0, localTons: 0 };
    if (r.dispatchType === 'Export') cur.exportTons += r.quantityTons;
    else cur.localTons += r.quantityTons;
    custMap.set(r.customerName, cur);
  });
  const customerWise = Array.from(custMap.entries())
    .map(([name, v]) => ({ name, ...v, total: v.exportTons + v.localTons }))
    .sort((a, b) => b.total - a.total);

  // Date-wise totals
  const dateMap = new Map<string, { exportTons: number; localTons: number }>();
  rows.forEach((r: any) => {
    const cur = dateMap.get(r.dispatchDate) || { exportTons: 0, localTons: 0 };
    if (r.dispatchType === 'Export') cur.exportTons += r.quantityTons;
    else cur.localTons += r.quantityTons;
    dateMap.set(r.dispatchDate, cur);
  });
  const dateWise = Array.from(dateMap.entries())
    .map(([date, v]) => ({ date, ...v, total: v.exportTons + v.localTons }))
    .sort((a, b) => b.date.localeCompare(a.date));

  return c.json({
    ok: true,
    total, exportTons, localTons, uniqueCustomers, recordCount: rows.length,
    daily, customerWise, dateWise,
  });
});

// ─── Customer management ────────────────────────────────────────
app.get('/customer-list', async (c) => {
  const plant = c.req.query('plant');
  const where: Record<string, unknown> = { status: 'Active' };
  if (plant) where.plantName = plant;
  const customers = await (prisma as any).customer.findMany({ where, orderBy: { name: 'asc' } });
  return c.json({ ok: true, items: customers.map((r: any) => ({ id: r.id, name: r.name, plantName: r.plantName })) });
});

app.post('/customer-add', async (c) => {
  const body = await c.req.json();
  const { name, plantName } = body;
  if (!name || !name.trim()) {
    return c.json({ ok: false, error: 'Customer name is required.' }, 400);
  }
  const trimmed = name.trim();
  const existing = await (prisma as any).customer.findFirst({ where: { name: trimmed, plantName: plantName || null } });
  if (existing) {
    return c.json({ ok: false, error: 'Customer already exists for this plant.' }, 409);
  }
  const customer = await (prisma as any).customer.create({
    data: { name: trimmed, plantId: body.plantId || null, plantName: plantName || null },
  });
  await auditLog('u1', 'Admin', 'create', 'admin', JSON.stringify({ name: trimmed, plantName }));
  return c.json({ ok: true, customer: { id: customer.id, name: customer.name, plantName: customer.plantName } });
});

app.delete('/customer-remove/:id', async (c) => {
  const id = c.req.param('id');
  const existing = await (prisma as any).customer.findUnique({ where: { id } });
  await (prisma as any).customer.delete({ where: { id } });
  await auditLog('u1', 'Admin', 'delete', 'customers', JSON.stringify({ deletedName: existing?.name || id }));
  return c.json({ ok: true });
});

// ─── Dispatch aggregation routes ─────────────────────────────────
app.get('/dispatch/customers', async (c) => {
  const plant = c.req.query('plant');
  const where: Record<string, unknown> = {};
  if (plant) where.plantName = plant;
  const rows = await (prisma as any).dispatch.findMany({ where, select: { customerName: true }, distinct: ['customerName'] });
  return c.json({ ok: true, items: rows.map((r: any) => r.customerName).sort() });
});

app.get('/dispatch/report', async (c) => {
  const plant = c.req.query('plant');
  const dateFrom = c.req.query('dateFrom');
  const dateTo = c.req.query('dateTo');
  const customer = c.req.query('customer');
  const filmCode = c.req.query('filmCode');
  const dispatchType = c.req.query('dispatchType');
  const search = c.req.query('search');
  const sort = c.req.query('sort');
  const order = c.req.query('order');

  const where: Record<string, unknown> = {};
  if (plant) where.plantName = plant;
  if (dateFrom && dateTo) where.dispatchDate = { gte: dateFrom, lte: dateTo };
  if (customer) where.customerName = customer;
  if (filmCode) where.filmCodeName = filmCode;
  if (dispatchType) where.dispatchType = dispatchType;

  let rows = await (prisma as any).dispatch.findMany({ where, orderBy: { dispatchDate: 'desc' } });

  if (search) {
    const q = search.toLowerCase();
    rows = rows.filter((r: any) =>
      r.customerName.toLowerCase().includes(q) ||
      r.filmCodeName.toLowerCase().includes(q) ||
      r.dispatchDate.includes(q) ||
      r.dispatchType.toLowerCase().includes(q)
    );
  }

  if (sort) {
    rows.sort((a: any, b: any) => {
      const va = a[sort] ?? '';
      const vb = b[sort] ?? '';
      if (typeof va === 'number') return order === 'asc' ? va - vb : vb - va;
      return order === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }

  return c.json({ ok: true, data: rows });
});

app.get('/dispatch/analytics', async (c) => {
  const plant = c.req.query('plant');
  const dateFrom = c.req.query('dateFrom');
  const dateTo = c.req.query('dateTo');
  const dispatchType = c.req.query('dispatchType');

  const where: Record<string, unknown> = {};
  if (plant) where.plantName = plant;
  if (dateFrom && dateTo) where.dispatchDate = { gte: dateFrom, lte: dateTo };
  if (dispatchType) where.dispatchType = dispatchType;

  const rows = await (prisma as any).dispatch.findMany({ where });

  // Daily
  const dailyMap = new Map<string, number>();
  rows.forEach((r: any) => dailyMap.set(r.dispatchDate, (dailyMap.get(r.dispatchDate) || 0) + r.quantityTons));
  const daily = Array.from(dailyMap.entries()).map(([date, tons]) => ({ date, tons })).sort((a, b) => a.date.localeCompare(b.date));

  // Customer-wise
  const custMap = new Map<string, number>();
  rows.forEach((r: any) => custMap.set(r.customerName, (custMap.get(r.customerName) || 0) + r.quantityTons));
  const customerWise = Array.from(custMap.entries()).map(([name, tons]) => ({ name, tons })).sort((a, b) => b.tons - a.tons);

  // Film-wise
  const filmMap = new Map<string, number>();
  rows.forEach((r: any) => filmMap.set(r.filmCodeName, (filmMap.get(r.filmCodeName) || 0) + r.quantityTons));
  const filmWise = Array.from(filmMap.entries()).map(([name, tons]) => ({ name, tons })).sort((a, b) => b.tons - a.tons);

  const totalTons = rows.reduce((s: number, r: any) => s + r.quantityTons, 0);

  return c.json({ ok: true, daily, customerWise, filmWise, totalTons, totalRecords: rows.length });
});

// ─── Audit Logs ──────────────────────────────────────────────────
app.get('/audit', async (c) => {
  const moduleFilter = c.req.query('module');
  const actionFilter = c.req.query('action');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  const page = parseInt(c.req.query('page') || '1');
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 200);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (moduleFilter) where.module = moduleFilter;
  if (actionFilter) where.action = actionFilter;
  if (startDate && endDate) {
    where.createdAt = { gte: new Date(startDate), lte: new Date(endDate) };
  }

  const [logs, total] = await Promise.all([
    (prisma as any).auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    (prisma as any).auditLog.count({ where }),
  ]);

  return c.json({
    ok: true,
    logs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

app.get('/audit/stats', async (c) => {
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);

  const [totalLogs, recentLogs, moduleCounts] = await Promise.all([
    (prisma as any).auditLog.count(),
    (prisma as any).auditLog.count({ where: { createdAt: { gte: last7Days } } }),
    (prisma as any).auditLog.groupBy({
      by: ['module'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),
  ]);

  return c.json({
    ok: true,
    stats: {
      totalLogs,
      last7Days: recentLogs,
      moduleBreakdown: moduleCounts.map((m: any) => ({ module: m.module, count: m._count.id })),
    },
  });
});

app.get('/audit/user/:userId', async (c) => {
  const userId = c.req.param('userId');
  const limit = parseInt(c.req.query('limit') || '20');
  const logs = await (prisma as any).auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return c.json({ ok: true, logs });
});

app.get('/audit/module/:module', async (c) => {
  const module = c.req.param('module');
  const limit = parseInt(c.req.query('limit') || '50');
  const logs = await (prisma as any).auditLog.findMany({
    where: { module },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return c.json({ ok: true, logs });
});

// ─── Export Quantity: Plant-wise aggregation ─────────────────────
app.get('/analytics/export-plant-wise', async (c) => {
  const month = c.req.query('month'); // format: "2026-07" or empty for all

  const allRecords = await (prisma as any).exportQuantity.findMany({
    orderBy: { exportDate: 'asc' },
    select: { plantName: true, exportDate: true, exportQuantityTons: true },
  });

  // Filter by month if provided
  const filtered = month ? allRecords.filter((r: any) => r.exportDate.startsWith(month)) : allRecords;

  // Group by plant
  const plantMap = new Map<string, number>();
  filtered.forEach((r: any) => {
    plantMap.set(r.plantName, (plantMap.get(r.plantName) || 0) + r.exportQuantityTons);
  });

  const plantData = Array.from(plantMap.entries()).map(([plant, tons]) => ({ plant, tons }));

  // Get all unique months
  const months = [...new Set(allRecords.map((r: any) => r.exportDate.substring(0, 7)))].sort().reverse();

  return c.json({ ok: true, plantData, months, total: plantData.reduce((s, p) => s + p.tons, 0) });
});

// ─── Dispatch: Plant-wise aggregation ────────────────────────────
app.get('/analytics/dispatch-plant-wise', async (c) => {
  const month = c.req.query('month');       // "2026-07" or empty
  const dispatchType = c.req.query('dispatchType'); // "Export" | "Local" | empty (All)

  const where: Record<string, unknown> = {};
  if (dispatchType) where.dispatchType = dispatchType;

  const allRecords = await (prisma as any).dispatch.findMany({
    where,
    orderBy: { dispatchDate: 'asc' },
    select: { plantName: true, dispatchDate: true, quantityTons: true },
  });

  const filtered = month ? allRecords.filter((r: any) => r.dispatchDate.startsWith(month)) : allRecords;

  const plantMap = new Map<string, number>();
  filtered.forEach((r: any) => {
    plantMap.set(r.plantName, (plantMap.get(r.plantName) || 0) + r.quantityTons);
  });
  const plantData = Array.from(plantMap.entries()).map(([plant, tons]) => ({ plant, tons }));

  const months = [...new Set(allRecords.map((r: any) => r.dispatchDate.substring(0, 7)))].sort().reverse();

  return c.json({ ok: true, plantData, months, total: plantData.reduce((s, p) => s + p.tons, 0) });
});

// ─── Dispatch Bulk Entry ────────────────────────────────────────
app.post('/dispatch/bulk', async (c) => {
  const body = await c.req.json();
  const { items, plantId, plantName, createdByName } = body;

  if (!Array.isArray(items) || items.length === 0) {
    return c.json({ ok: false, error: 'No items provided.' }, 400);
  }

  const created: any[] = [];
  const errors: { index: number; error: string }[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.customerName || !item.filmCodeId || !item.quantityTons || !item.dispatchDate) {
      errors.push({ index: i, error: `Row ${i + 1}: Missing required fields (date, customer, film code, quantity).` });
      continue;
    }
    try {
      const record = await (prisma as any).dispatch.create({
        data: {
          dispatchDate: item.dispatchDate,
          customerName: item.customerName,
          filmCodeId: item.filmCodeId,
          filmCodeName: item.filmCodeName || '',
          quantityTons: parseFloat(item.quantityTons),
          dispatchType: item.dispatchType || 'Local',
          plantId: plantId || null,
          plantName: plantName || null,
          createdByName: createdByName || '',
        },
      });
      created.push(record);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push({ index: i, error: `Row ${i + 1}: ${msg}` });
    }
  }

  return c.json({ ok: true, created: created.length, errors, total: items.length });
});

// ─── Film Codes Bulk Upload ─────────────────────────────────────
app.get('/film-codes-filtered', async (c) => {
  const plantId = c.req.query('plantId');
  const where: Record<string, unknown> = {};
  if (plantId) where.plantId = plantId;
  const items = await (prisma as any).filmCode.findMany({
    where,
    orderBy: { filmCodeName: 'asc' },
  });
  return c.json({ ok: true, items });
});

app.post('/film-codes/bulk', async (c) => {
  const body = await c.req.json();
  const { items, plantId, plantName } = body;

  if (!Array.isArray(items) || items.length === 0) {
    return c.json({ ok: false, error: 'No items provided.' }, 400);
  }

  const created: any[] = [];
  const skipped: { index: number; name: string; reason: string }[] = [];

  for (let i = 0; i < items.length; i++) {
    const name = (items[i].filmCodeName || '').trim();
    if (!name) {
      skipped.push({ index: i, name: '', reason: 'Empty film code name' });
      continue;
    }
    // Check duplicate within same plant
    const existing = await (prisma as any).filmCode.findFirst({
      where: { filmCodeName: name, plantId: plantId || null },
    });
    if (existing) {
      skipped.push({ index: i, name, reason: 'Already exists for this plant' });
      continue;
    }
    const record = await (prisma as any).filmCode.create({
      data: {
        filmCodeName: name,
        description: items[i].description || null,
        plantId: plantId || null,
        plantName: plantName || null,
        status: 'Active',
      },
    });
    created.push(record);
  }

  return c.json({ ok: true, created: created.length, skipped, total: items.length });
});

// Seed — only creates admin user if no users exist
app.post('/seed', async (c) => {
  const existingUsers = await (prisma as any).user.count();
  if (existingUsers === 0) {
    const { hash, salt } = hashPassword('admin123');
    await (prisma as any).user.create({
      data: { id: 'u1', username: 'admin', email: null, name: 'Admin', role: 'admin', password: `${hash}:${salt}` },
    });
    return c.json({ ok: true, message: 'Admin user created (admin / admin123)' });
  }
  return c.json({ ok: true, message: 'Users already exist. Nothing seeded.' });
});

export default app;
