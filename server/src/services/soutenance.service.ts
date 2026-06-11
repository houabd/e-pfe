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

  if (dto.jury.length > 4) {
    throw new BadRequestError('Le jury ne peut pas dépasser 4 membres');
  }

  const salleOccupee = await prisma.soutenance.findFirst({
    where: {
      salle: dto.salle,
      date_soutenance: dto.date_soutenance,
      heure: dto.heure,
    },
  });
  if (salleOccupee) throw new ConflictError(`La salle "${dto.salle}" est déjà occupée à ce créneau`);

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

  const dateStr = new Date(dto.date_soutenance).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const details = `le ${dateStr} à ${dto.heure} — Salle ${dto.salle}`;
  const titre = soutenance.theme.titre;

  // Notifier les étudiants
  if (theme.affectation) {
    for (const ae of theme.affectation.etudiants) {
      await notifyUser(
        ae.etudiant_id,
        'SOUTENANCE_PLANIFIEE',
        `Votre soutenance a été planifiée. Thème : "${titre}" — ${details}`,
        { soutenance_id: soutenance.id },
      );
    }
    // Notifier l'encadrant
    if (theme.affectation.encadrant?.id) {
      await notifyUser(
        theme.affectation.encadrant.id,
        'SOUTENANCE_PLANIFIEE',
        `La soutenance de votre étudiant a été planifiée. Thème : "${titre}" — ${details}`,
        { soutenance_id: soutenance.id },
      );
    }
  }

  // Notifier les membres du jury
  for (const juryMembre of dto.jury) {
    const roleLabel = juryMembre.role === 'PRESIDENT' ? 'Président du jury' : 'Examinateur';
    await notifyUser(
      juryMembre.enseignant_id,
      'SOUTENANCE_PLANIFIEE',
      `Vous êtes ${roleLabel} pour la soutenance : "${titre}" — ${details}`,
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
      jury: { select: { enseignant_id: true, role: true } },
      theme: {
        select: {
          encadrant_id: true,
          affectation: { select: { encadrant_id: true } },
        },
      },
    },
  });
  if (!soutenance) throw new NotFoundError('Soutenance');

  // Mémoriser l'ancien jury pour détecter les membres retirés
  const oldJuryIds = new Set(soutenance.jury.map((j) => j.enseignant_id));

  if (dto.jury && dto.jury.length > 4) {
    throw new BadRequestError('Le jury ne peut pas dépasser 4 membres');
  }

  if (dto.salle || dto.date_soutenance || dto.heure) {
    const salleOccupee = await prisma.soutenance.findFirst({
      where: {
        salle: dto.salle ?? soutenance.salle,
        date_soutenance: dto.date_soutenance ?? soutenance.date_soutenance,
        heure: dto.heure ?? soutenance.heure,
        id: { not: id },
      },
    });
    if (salleOccupee) throw new ConflictError(`La salle "${dto.salle ?? soutenance.salle}" est déjà occupée à ce créneau`);
  }

  const { jury, ...rest } = dto;
  const updated = await prisma.soutenance.update({
    where: { id },
    data: {
      ...rest,
      ...(jury ? { jury: { deleteMany: {}, create: jury } } : {}),
    },
    include: SOUTENANCE_INCLUDE,
  });

  const dateStr = new Date(updated.date_soutenance).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const details = `le ${dateStr} à ${updated.heure} — Salle ${updated.salle}`;
  const titre = updated.theme.titre;

  for (const ae of updated.theme.affectation?.etudiants ?? []) {
    await notifyUser(
      ae.etudiant_id,
      'SOUTENANCE_MODIFIEE',
      `Votre soutenance a été modifiée. Thème : "${titre}" — ${details}`,
      { soutenance_id: id },
    );
  }
  for (const j of updated.jury) {
    const roleLabel = j.role === 'PRESIDENT' ? 'Président du jury' : 'Examinateur';
    await notifyUser(
      j.enseignant.id,
      'SOUTENANCE_MODIFIEE',
      `Soutenance modifiée (vous êtes ${roleLabel}). Thème : "${titre}" — ${details}`,
      { soutenance_id: id },
    );
  }

  // Notifier les membres retirés du jury
  if (jury) {
    const newJuryIds = new Set(jury.map((j) => j.enseignant_id));
    const removedIds = [...oldJuryIds].filter((eid) => !newJuryIds.has(eid));
    for (const eid of removedIds) {
      await notifyUser(
        eid,
        'SOUTENANCE_MODIFIEE',
        `Vous avez été retiré du jury pour la soutenance du thème "${titre}" (${details}).`,
        { soutenance_id: id },
      );
    }
  }

  // Notifier l'encadrant du thème
  const encadrantId = updated.theme.affectation?.encadrant?.id;
  if (encadrantId) {
    await notifyUser(
      encadrantId,
      'SOUTENANCE_MODIFIEE',
      `La soutenance de votre étudiant a été modifiée. Thème : "${titre}" — ${details}`,
      { soutenance_id: id },
    );
  }

  return updated;
}

// ─── Suppression ──────────────────────────────────────────────────────────────

export async function deleteSoutenance(id: string): Promise<void> {
  const soutenance = await prisma.soutenance.findUnique({
    where: { id },
    include: SOUTENANCE_INCLUDE,
  });
  if (!soutenance) throw new NotFoundError('Soutenance');

  const dateStr = new Date(soutenance.date_soutenance).toLocaleDateString('fr-FR');
  const msg = `La soutenance du ${dateStr} à ${soutenance.heure} (Salle ${soutenance.salle}) pour "${soutenance.theme.titre}" a été annulée.`;

  for (const ae of soutenance.theme.affectation?.etudiants ?? []) {
    await notifyUser(ae.etudiant_id, 'SOUTENANCE_ANNULEE', msg, { theme_id: soutenance.theme.id });
  }
  for (const j of soutenance.jury) {
    await notifyUser(j.enseignant.id, 'SOUTENANCE_ANNULEE', msg, { theme_id: soutenance.theme.id });
  }

  await prisma.soutenance.delete({ where: { id } });
}

// ─── Ma soutenance (étudiant) ────────────────────────────────────────────────

export async function getMaSoutenance(etudiantId: string) {
  const ae = await prisma.affectationEtudiant.findFirst({
    where: { etudiant_id: etudiantId },
    select: {
      affectation: {
        select: {
          theme: {
            select: {
              id: true,
              soutenance: { include: SOUTENANCE_INCLUDE },
            },
          },
        },
      },
    },
  });
  return ae?.affectation?.theme?.soutenance ?? null;
}

// ─── Mes jurys (enseignant) ───────────────────────────────────────────────────

export async function getMesSoutenancesJury(enseignantId: string) {
  const jurys = await prisma.soutenanceJury.findMany({
    where: { enseignant_id: enseignantId },
    select: {
      role: true,
      soutenance: { include: SOUTENANCE_INCLUDE },
    },
    orderBy: [{ soutenance: { date_soutenance: 'asc' } }, { soutenance: { heure: 'asc' } }],
  });
  return jurys.map((j) => ({ ...j.soutenance, role_jury: j.role }));
}

// ─── Enseignants disponibles pour le jury ─────────────────────────────────────

export async function getEnseignantsDisponibles(filters: {
  date?: string;
  heure?: string;
  theme_id?: string;
  soutenance_id?: string; // exclure uniquement les conflits des AUTRES soutenances
}) {
  // Enseignants déjà dans un jury à ce créneau (sauf la soutenance en cours d'édition)
  const busyIds = new Set<string>();
  if (filters.date && filters.heure) {
    const conflits = await prisma.soutenanceJury.findMany({
      where: {
        soutenance: {
          date_soutenance: new Date(filters.date),
          heure: filters.heure,
          ...(filters.soutenance_id ? { id: { not: filters.soutenance_id } } : {}),
        },
      },
      select: { enseignant_id: true },
    });
    conflits.forEach((c) => busyIds.add(c.enseignant_id));
  }

  const notIn = [...busyIds];

  return prisma.user.findMany({
    where: {
      role: { in: ['ENSEIGNANT', 'CHEF_EQUIPE', 'CHEF_DEPT', 'RESP_SPECIALITE'] as import('@prisma/client').Role[] },
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
