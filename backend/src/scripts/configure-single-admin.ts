import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Step 1: Pre-update Database Inspection ---');
  const existingUsers = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`Found ${existingUsers.length} total user accounts:`);
  for (const u of existingUsers) {
    console.log(` - [${u.role}] ${u.email} (${u.name})`);
  }

  const existingComplaintsCount = await prisma.complaint.count();
  console.log(`Found ${existingComplaintsCount} total complaints preserved.`);

  console.log('\n--- Step 2: Configuring Exactly One Admin Account ---');
  const adminEmail = 'admin@civicai.org';
  const newPasswordPlain = 'admin1234';
  const hashedAdminPassword = await bcrypt.hash(newPasswordPlain, 10);

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log(`Updating existing admin account (${adminEmail}) with new secure bcrypt password...`);
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        role: Role.ADMIN,
        passwordHash: hashedAdminPassword,
      },
    });
  } else {
    console.log(`Creating new designated admin account (${adminEmail})...`);
    await prisma.user.create({
      data: {
        name: 'Municipal Admin Officer',
        email: adminEmail,
        role: Role.ADMIN,
        passwordHash: hashedAdminPassword,
      },
    });
  }

  console.log('\n--- Step 3: Demoting Any Other Accounts to CITIZEN Role ---');
  const demoteResult = await prisma.user.updateMany({
    where: {
      email: { not: adminEmail },
    },
    data: {
      role: Role.CITIZEN,
    },
  });
  console.log(`Ensured ${demoteResult.count} other user accounts are assigned the CITIZEN role.`);

  console.log('\n--- Step 4: Post-update Verification & Audit ---');
  const adminCount = await prisma.user.count({ where: { role: Role.ADMIN } });
  const citizenCount = await prisma.user.count({ where: { role: Role.CITIZEN } });
  const finalComplaintsCount = await prisma.complaint.count();
  const allUsersAfter = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`Admin accounts in DB: ${adminCount} (Target: 1)`);
  console.log(`Citizen accounts in DB: ${citizenCount}`);
  console.log(`Complaints in DB: ${finalComplaintsCount} (Target: ${existingComplaintsCount})`);

  for (const u of allUsersAfter) {
    console.log(` -> Verified user: ${u.email} | Role: ${u.role}`);
  }

  if (adminCount !== 1) {
    throw new Error(`CRITICAL: Found ${adminCount} ADMIN accounts, expected exactly 1!`);
  }

  const theAdmin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
  if (theAdmin?.email !== adminEmail) {
    throw new Error(`CRITICAL: Admin email is ${theAdmin?.email}, expected ${adminEmail}!`);
  }

  if (finalComplaintsCount !== existingComplaintsCount) {
    throw new Error(`CRITICAL: Complaint count changed from ${existingComplaintsCount} to ${finalComplaintsCount}!`);
  }

  console.log('\n✅ Single Admin configuration completed successfully with 100% data preservation.');
}

main()
  .catch((err) => {
    console.error('Configuration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
