import { PrismaClient, LaboratoryType } from '@prisma/client';

// Fixed seed ID agar upsert idempotent — tidak berubah antar run
const QC_INSTRUMENT_SEED_ID = '00000000-0000-0000-0000-000000000010';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ============================================================
  // SEED: Roles (4 role wajib)
  // ============================================================

  const roles = [
    {
      name: 'analis',
      description: 'Analis laboratorium — mencatat sampel, memproses pemeriksaan, menginput hasil',
      permissions: ['create:sample', 'read:sample', 'update:sample_status', 'create:qc', 'read:sop'],
    },
    {
      name: 'supervisor',
      description: 'Supervisor laboratorium — meninjau hasil, memvalidasi, memantau QC',
      permissions: ['read:sample', 'validate:sample', 'recheck:sample', 'read:qc', 'read:audit_log'],
    },
    {
      name: 'admin',
      description: 'Admin laboratorium — mengelola user, role, master data, SOP',
      permissions: [
        'create:user', 'read:user', 'update:user', 'delete:user',
        'create:laboratory', 'update:laboratory',
        'create:sop', 'update:sop', 'delete:sop',
        'read:audit_log',
      ],
    },
    {
      name: 'auditor',
      description: 'Auditor internal — hanya melihat riwayat aktivitas, dokumen, laporan QC',
      permissions: ['read:audit_log', 'read:qc', 'read:sop', 'read:sample'],
    },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {
        description: role.description,
        permissions: role.permissions,
      },
      create: {
        name: role.name,
        description: role.description,
        permissions: role.permissions,
      },
    });
    console.log(`  ✅ Role: ${role.name}`);
  }

  // ============================================================
  // SEED: Laboratory (1 laboratorium dummy)
  // ============================================================

  const labDummy = await prisma.laboratory.upsert({
    where: {
      // upsert by name — tidak ada unique constraint di name,
      // jadi kita check dulu apakah sudah ada
      id: '00000000-0000-0000-0000-000000000001',
    },
    update: {
      name: 'Lab Klinik Utama',
      type: LaboratoryType.klinik,
      address: 'Jl. Kesehatan No. 1, Jakarta',
      contact: '021-12345678',
      isActive: true,
    },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Lab Klinik Utama',
      type: LaboratoryType.klinik,
      address: 'Jl. Kesehatan No. 1, Jakarta',
      contact: '021-12345678',
      isActive: true,
    },
  });

  console.log(`  ✅ Laboratory: ${labDummy.name} (id: ${labDummy.id})`);

  // ============================================================
  // SEED: QcInstrument (1 alat demo untuk Lab Klinik Utama)
  // ID tetap agar upsert idempotent di setiap run
  // ============================================================

  const qcInstrument = await prisma.qcInstrument.upsert({
    where: { id: QC_INSTRUMENT_SEED_ID },
    update: {
      name: 'Hematology Analyzer XN-1000',
      serialNumber: 'XN-001',
      department: 'Hematologi',
      isActive: true,
    },
    create: {
      id: QC_INSTRUMENT_SEED_ID,
      laboratoryId: labDummy.id,
      name: 'Hematology Analyzer XN-1000',
      serialNumber: 'XN-001',
      department: 'Hematologi',
      isActive: true,
    },
  });

  console.log(`  ✅ QcInstrument: ${qcInstrument.name} (id: ${qcInstrument.id})`);

  // ============================================================
  // SUMMARY
  // ============================================================

  const roleCount = await prisma.role.count();
  const labCount = await prisma.laboratory.count();

  console.log('\n📊 Seed summary:');
  console.log(`  Roles      : ${roleCount}`);
  console.log(`  Laboratories: ${labCount}`);
  console.log('\n✅ Seeding selesai.\n');
}

main()
  .catch((error) => {
    console.error('❌ Seed gagal:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
