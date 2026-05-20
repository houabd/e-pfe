import type { Response } from 'express';
import PDFDocument from 'pdfkit';
import * as xlsx from 'xlsx';
import { prisma } from '../config/database';
import { NotFoundError, BadRequestError, ConflictError } from '../middleware/error.middleware';
import { notifyUser } from './notification.service';
import type { CreateSoutenanceDto } from '../types';

// ─── Sélection commune ────────────────────────────────────────────────────────

const SOUTENANCE_INCLUDE = {
  theme: {
    include: {
      theme_specialites: { include: { specialite: { select: { id: true, nom: true } } } },
      affectation: {
        include: {
          encadrant: { select: { id: true, nom: true, prenom: true, email: true } },
          etudiants: {
            include: {
              etudiant: { select: { id: true, nom: true, prenom: true, matricule: true } },
            },
          },
        },
      },
    },
  },
  jury: {
    include: {
      enseignant: { select: { id: true, nom: true, prenom: true, email: true } },
    },
  },
} as const;

// ─── Lecture ──────────────────────────────────────────────────────────────────

export async function getSoutenances(filters: {
  annee_universitaire?: string;
  specialite_id?: string;
  page?: number;
  limit?: number;
}) {
  const { page = 1, limit = 20, annee_universitaire, specialite_id } = filters;
  const skip = (page - 1) * limit;

  const where = {
    ...(annee_universitaire ? { annee_universitaire } : {}),
    ...(specialite_id ? { theme: { theme_specialites: { some: { specialite_id } } } } : {}),
  };

  const [total, soutenances] = await Promise.all([
    prisma.soutenance.count({ where }),
    prisma.soutenance.findMany({
      where,
      skip,
      take: limit,
      include: SOUTENANCE_INCLUDE,
      orderBy: [{ date_soutenance: 'asc' }, { heure: 'asc' }],
    }),
  ]);

  return { data: soutenances, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export async function getSoutenanceById(id: string) {
  const s = await prisma.soutenance.findUnique({ where: { id }, include: SOUTENANCE_INCLUDE });
  if (!s) throw new NotFoundError('Soutenance');
  return s;
}

// ─── Création ─────────────────────────────────────────────────────────────────

export async function createSoutenance(dto: CreateSoutenanceDto) {
  const theme = await prisma.theme.findUnique({
    where: { id: dto.theme_id },
    include: {
      soutenance: { select: { id: true } },
      affectation: { include: { etudiants: true, encadrant: { select: { id: true } } } },
    },
  });
  if (!theme) throw new NotFoundError('Thème');
  if (theme.soutenance) throw new ConflictError('Une soutenance est déjà planifiée pour ce thème');
  if (!theme.is_affecte) throw new BadRequestError("Le thème n'est pas encore affecté");

  // L'encadrant (thème OU affectation) ne peut pas être dans le jury
  const encadrantIds = [
    theme.encadrant_id,
    theme.affectation?.encadrant_id,
  ].filter(Boolean) as string[];

  const encadrantInJury = dto.jury.some((j) => encadrantIds.includes(j.enseignant_id));
  if (encadrantInJury) {
    throw new BadRequestError("L'encadrant du thème ne peut pas être membre du jury");
  }

  if (dto.jury.length > 4) {
    throw new BadRequestError('Le jury ne peut pas dépasser 4 membres');
  }

  const soutenance = await prisma.soutenance.create({
    data: {
      theme_id: dto.theme_id,
      date_soutenance: dto.date_soutenance,
      heure: dto.heure,
      salle: dto.salle,
      annee_universitaire: dto.annee_universitaire,
      jury: { create: dto.jury },
    },
    include: SOUTENANCE_INCLUDE,
  });

  // Marquer le thème comme soutenu
  await prisma.theme.update({ where: { id: dto.theme_id }, data: { is_soutenu: true } });

  const dateStr = new Date(dto.date_soutenance).toLocaleDateString('fr-FR');
  const baseMsg = `Soutenance planifiée le ${dateStr} à ${dto.heure} — Salle ${dto.salle}`;

  // Notifier les étudiants
  if (theme.affectation) {
    for (const ae of theme.affectation.etudiants) {
      await notifyUser(ae.etudiant_id, 'SOUTENANCE_PLANIFIEE', baseMsg, { soutenance_id: soutenance.id });
    }
  }

  // Notifier les membres du jury
  for (const juryMembre of dto.jury) {
    await notifyUser(
      juryMembre.enseignant_id,
      'SOUTENANCE_PLANIFIEE',
      `Vous êtes membre du jury (${juryMembre.role}) — ${baseMsg}`,
      { soutenance_id: soutenance.id },
    );
  }

  return soutenance;
}

// ─── Modification ─────────────────────────────────────────────────────────────

export async function updateSoutenance(id: string, dto: Partial<CreateSoutenanceDto>) {
  const soutenance = await prisma.soutenance.findUnique({
    where: { id },
    include: {
      theme: {
        select: {
          encadrant_id: true,
          affectation: { select: { encadrant_id: true } },
        },
      },
    },
  });
  if (!soutenance) throw new NotFoundError('Soutenance');

  if (dto.jury) {
    const encadrantIds = [
      soutenance.theme.encadrant_id,
      soutenance.theme.affectation?.encadrant_id,
    ].filter(Boolean) as string[];

    if (dto.jury.some((j) => encadrantIds.includes(j.enseignant_id))) {
      throw new BadRequestError("L'encadrant du thème ne peut pas être membre du jury");
    }
    if (dto.jury.length > 4) {
      throw new BadRequestError('Le jury ne peut pas dépasser 4 membres');
    }
  }

  const { jury, ...rest } = dto;
  return prisma.soutenance.update({
    where: { id },
    data: {
      ...rest,
      ...(jury ? { jury: { deleteMany: {}, create: jury } } : {}),
    },
    include: SOUTENANCE_INCLUDE,
  });
}

// ─── Enseignants disponibles pour le jury ─────────────────────────────────────

export async function getEnseignantsDisponibles(filters: {
  date?: string;
  heure?: string;
  theme_id?: string;
}) {
  // Encadrant(s) à exclure du jury
  const excludeIds = new Set<string>();
  if (filters.theme_id) {
    const theme = await prisma.theme.findUnique({
      where: { id: filters.theme_id },
      select: {
        encadrant_id: true,
        affectation: { select: { encadrant_id: true } },
      },
    });
    if (theme?.encadrant_id) excludeIds.add(theme.encadrant_id);
    if (theme?.affectation?.encadrant_id) excludeIds.add(theme.affectation.encadrant_id);
  }

  // Enseignants déjà dans un jury à ce créneau
  const busyIds = new Set<string>();
  if (filters.date && filters.heure) {
    const conflits = await prisma.soutenanceJury.findMany({
      where: {
        soutenance: {
          date_soutenance: new Date(filters.date),
          heure: filters.heure,
        },
      },
      select: { enseignant_id: true },
    });
    conflits.forEach((c) => busyIds.add(c.enseignant_id));
  }

  const notIn = [...excludeIds, ...busyIds];

  return prisma.user.findMany({
    where: {
      role: { in: ['ENSEIGNANT', 'CHEF_EQUIPE'] },
      is_active: true,
      ...(notIn.length > 0 ? { id: { notIn } } : {}),
    },
    select: {
      id: true, nom: true, prenom: true, email: true,
      specialite: { select: { id: true, nom: true } },
    },
    orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
  });
}

// ─── Export PDF du planning ───────────────────────────────────────────────────

export async function exportPDF(
  filters: { annee_universitaire?: string; specialite_id?: string },
  res: Response,
): Promise<void> {
  const { data: soutenances } = await getSoutenances({ ...filters, limit: 1000, page: 1 });

  const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="planning_soutenances_${Date.now()}.pdf"`);
  doc.pipe(res);

  // ── En-tête ──
  doc.fontSize(17).font('Helvetica-Bold').fillColor('#1e293b')
    .text('Planning des Soutenances PFE', { align: 'center' });
  doc.fontSize(10).font('Helvetica').fillColor('#475569')
    .text('Université de Béjaïa — Département Informatique', { align: 'center' });
  if (filters.annee_universitaire) {
    doc.fontSize(9).text(`Année universitaire : ${filters.annee_universitaire}`, { align: 'center' });
  }
  doc.fontSize(8).fillColor('#64748b')
    .text(`Généré le ${new Date().toLocaleDateString('fr-FR')} — ${soutenances.length} soutenance(s)`, { align: 'center' });
  doc.moveDown(1.2);

  if (soutenances.length === 0) {
    doc.fontSize(12).fillColor('#94a3b8').text('Aucune soutenance planifiée pour ces critères.', { align: 'center' });
    doc.end();
    return;
  }

  // ── Colonnes ──
  // Heure | Salle | Thème | Étudiant(s) | Spécialité | Encadrant | Président | Examinateur(s)
  const startX = 30;
  const colWidths = [42, 38, 150, 95, 65, 90, 90, 100];
  const headers = ['Heure', 'Salle', 'Thème', 'Étudiant(s)', 'Spécialité', 'Encadrant', 'Président', 'Examinateur(s)'];
  const ROW_H = 28;
  const HEADER_H = 17;

  const drawHeader = (y: number): number => {
    doc.font('Helvetica-Bold').fontSize(8).fillColor('white');
    let x = startX;
    headers.forEach((h, i) => {
      doc.rect(x, y, colWidths[i], HEADER_H).fillAndStroke('#1e40af', '#1e3a8a');
      doc.fillColor('white').text(h, x + 3, y + 4, { width: colWidths[i] - 6, lineBreak: false });
      x += colWidths[i];
    });
    return y + HEADER_H;
  };

  // ── Grouper par date ──
  const byDate = new Map<string, typeof soutenances>();
  for (const s of soutenances) {
    const key = new Date(s.date_soutenance).toLocaleDateString('fr-FR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(s);
  }

  let y = doc.y;
  let first = true;

  for (const [dateLabel, items] of byDate) {
    if (!first && y > 470) {
      doc.addPage({ layout: 'landscape' });
      y = 30;
    }
    first = false;

    // Titre de groupe (date)
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0f172a')
      .text(dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1), startX, y);
    y += 14;
    y = drawHeader(y);

    for (let idx = 0; idx < items.length; idx++) {
      if (y + ROW_H > 555) {
        doc.addPage({ layout: 'landscape' });
        y = 30;
        y = drawHeader(y);
      }

      const s = items[idx];
      const bg = idx % 2 === 0 ? '#f1f5f9' : '#ffffff';

      const etudiants = (s.theme.affectation?.etudiants ?? [])
        .map((ae) => `${ae.etudiant.prenom} ${ae.etudiant.nom}`)
        .join('\n') || '—';

      const specialites = s.theme.theme_specialites
        .map((ts) => ts.specialite.nom).join(', ') || '—';

      const encadrant = s.theme.affectation?.encadrant
        ? `${s.theme.affectation.encadrant.prenom} ${s.theme.affectation.encadrant.nom}`
        : '—';

      const president = s.jury.find((j) => j.role === 'PRESIDENT');
      const examinateurs = s.jury.filter((j) => j.role === 'EXAMINATEUR');

      const cells = [
        s.heure,
        s.salle,
        s.theme.titre,
        etudiants,
        specialites,
        encadrant,
        president ? `${president.enseignant.prenom} ${president.enseignant.nom}` : '—',
        examinateurs.map((e) => `${e.enseignant.prenom} ${e.enseignant.nom}`).join('\n') || '—',
      ];

      let x = startX;
      cells.forEach((val, i) => {
        doc.rect(x, y, colWidths[i], ROW_H).fillAndStroke(bg, '#cbd5e1');
        doc.font('Helvetica').fontSize(7.5).fillColor('#1e293b')
          .text(val, x + 3, y + 4, { width: colWidths[i] - 6, height: ROW_H - 6, lineBreak: true, ellipsis: true });
        x += colWidths[i];
      });

      y += ROW_H;
    }

    y += 10;
  }

  doc.end();
}

// ─── Export Excel du planning ─────────────────────────────────────────────────

export async function exportExcel(
  filters: { annee_universitaire?: string; specialite_id?: string },
  res: Response,
): Promise<void> {
  const { data: soutenances } = await getSoutenances({ ...filters, limit: 1000, page: 1 });

  const rows = soutenances.map((s) => {
    const etudiants = (s.theme.affectation?.etudiants ?? [])
      .map((ae) => `${ae.etudiant.prenom} ${ae.etudiant.nom}`)
      .join(', ') || '—';

    const specialites = s.theme.theme_specialites
      .map((ts) => ts.specialite.nom).join(', ') || '—';

    const encadrant = s.theme.affectation?.encadrant
      ? `${s.theme.affectation.encadrant.prenom} ${s.theme.affectation.encadrant.nom}`
      : '—';

    const president = s.jury.find((j) => j.role === 'PRESIDENT');
    const examinateurs = s.jury.filter((j) => j.role === 'EXAMINATEUR');

    return {
      'Date': new Date(s.date_soutenance).toLocaleDateString('fr-FR'),
      'Heure': s.heure,
      'Salle': s.salle,
      'Thème': s.theme.titre,
      'Spécialité(s)': specialites,
      'Étudiant(s)': etudiants,
      'Encadrant': encadrant,
      'Président': president
        ? `${president.enseignant.prenom} ${president.enseignant.nom}`
        : '—',
      'Examinateur(s)': examinateurs
        .map((e) => `${e.enseignant.prenom} ${e.enseignant.nom}`)
        .join(', ') || '—',
      'Année universitaire': s.annee_universitaire,
    };
  });

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 14 }, { wch: 8 }, { wch: 10 }, { wch: 45 }, { wch: 20 },
    { wch: 35 }, { wch: 25 }, { wch: 25 }, { wch: 35 }, { wch: 14 },
  ];
  xlsx.utils.book_append_sheet(wb, ws, 'Planning Soutenances');

  const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="planning_soutenances_${Date.now()}.xlsx"`);
  res.end(buf);
}
