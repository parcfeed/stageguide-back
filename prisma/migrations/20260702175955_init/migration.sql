/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `partners` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "StatutEntretien" AS ENUM ('PROPOSE', 'CONFIRME', 'ANNULE', 'TERMINE');

-- AlterTable
ALTER TABLE "offres_emploi" ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "offres_stage" ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "partners" ADD COLUMN     "userId" TEXT;

-- CreateTable
CREATE TABLE "entretiens" (
    "id" TEXT NOT NULL,
    "partenaireId" TEXT NOT NULL,
    "candidatureId" TEXT NOT NULL,
    "offreStageId" TEXT,
    "offreEmploiId" TEXT,
    "utilisateurId" TEXT NOT NULL,
    "dateProposee" TIMESTAMP(3) NOT NULL,
    "lieu" TEXT,
    "message" TEXT,
    "statut" "StatutEntretien" NOT NULL DEFAULT 'PROPOSE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entretiens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "entretiens_partenaireId_statut_idx" ON "entretiens"("partenaireId", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "partners_userId_key" ON "partners"("userId");

-- AddForeignKey
ALTER TABLE "partners" ADD CONSTRAINT "partners_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entretiens" ADD CONSTRAINT "entretiens_partenaireId_fkey" FOREIGN KEY ("partenaireId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entretiens" ADD CONSTRAINT "entretiens_candidatureId_fkey" FOREIGN KEY ("candidatureId") REFERENCES "candidatures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entretiens" ADD CONSTRAINT "entretiens_offreStageId_fkey" FOREIGN KEY ("offreStageId") REFERENCES "offres_stage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entretiens" ADD CONSTRAINT "entretiens_offreEmploiId_fkey" FOREIGN KEY ("offreEmploiId") REFERENCES "offres_emploi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entretiens" ADD CONSTRAINT "entretiens_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
