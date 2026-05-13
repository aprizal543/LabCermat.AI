/**
 * Nilai string sinkron dengan Prisma enum SampleStatus di schema.prisma.
 * Jangan ubah nilai string tanpa mengubah Prisma schema juga.
 */
export enum SampleStatus {
  MENUNGGU_PEMERIKSAAN = 'menunggu_pemeriksaan',
  DALAM_PROSES = 'dalam_proses',
  MENUNGGU_REVIEW = 'menunggu_review',
  TERVALIDASI = 'tervalidasi',
  MINTA_CEK_ULANG = 'minta_cek_ulang',
  DIBATALKAN = 'dibatalkan',
}

/**
 * Nilai string sinkron dengan Prisma enum SamplePriority di schema.prisma.
 */
export enum SamplePriority {
  RUTIN = 'rutin',
  URGENT = 'urgent',
  CITO = 'cito',
}
