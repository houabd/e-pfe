import type { Response } from 'express';
import * as xlsx from 'xlsx';
import PDFDocument from 'pdfkit';
import { prisma } from '../config/database';
import { hashPassword, generateInitialPassword } from '../utils/password.utils';
import { isValidEmailForRole } from '../utils/email.validator';
import { NotFoundError, ConflictError, BadRequestError } from '../middleware/error.middleware';
import type { CreateUserDto, UserFilters } from '../types';
import type { Role } from '@prisma/client';

const USER_SELECT = {
  id: true,
  email: true,
  nom: true,
  prenom: true,
  role: true,
  is_active: true,
  matricule: true,
  annee_universitaire: true,
  date_naissance: true,
  created_at: true,
  specialite: { select: { id: true, nom: true } },
} as const;

// ─── Lecture ──────────────────────────────────────────────────────────────────

export async function getUsers(filters: UserFilters) {
  const { page = 1, limit = 20, role, specialite_id, is_active, search } = filters;
  const skip = (page - 1) * limit;

  const where = {
    ...(role ? { role } : {}),
    ...(specialite_id ? { specialite_id } : {}),
    ...(is_active !== undefined ? { is_active } : {}),
    ...(search
      ? {
          OR: [
            { nom: { contains: search, mode: 'insensitive' as const } },
            { prenom: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { matricule: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      select: USER_SELECT,
      orderBy: { created_at: 'desc' },
    }),
  ]);

  return { data: users, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

// ─── Création ─────────────────────────────────────────────────────────────────

export async function createUser(dto: CreateUserDto) {
  if (!isValidEmailForRole(dto.email, dto.role)) {
    throw new BadRequestError(`Email invalide pour le rôle ${dto.role}. Domaine attendu : ${dto.role === 'ETUDIANT' ? '@etu.univ-bejaia.dz' : '@univ-bejaia.dz'}`);
  }

  const exists = await prisma.user.findUnique({ where: { email: dto.email } });
  if (exists) throw new ConflictError('Un utilisateur avec cet email existe déjà');

  const initialPassword = generateInitialPassword(new Date(dto.date_naissance));
  const password_hash = await hashPassword(initialPassword);

  return prisma.user.create({
    data: { ...dto, password_hash },
    select: USER_SELECT,
  });
}

// ─── Toggle actif ─────────────────────────────────────────────────────────────

export async function toggleUserActive(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('Utilisateur');

  return prisma.user.update({
    where: { id },
    data: { is_active: !user.is_active },
    select: { id: true, is_active: true, email: true, nom: true, prenom: true },
  });
}

// ─── Suppression (soft delete) ────────────────────────────────────────────────

export async function deleteUser(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('Utilisateur');
  await prisma.user.update({ where: { id }, data: { is_active: false } });
}

// ─── Import Excel ─────────────────────────────────────────────────────────────

const VALID_ROLES: Role[] = ['CHEF_DEPT', 'CHEF_EQUIPE', 'CHEF_EQUIPE', 'RESP_SPECIALITE', 'TECHNICIEN', 'ENSEIGNANT', 'ETUDIANT'];

interface ImportRow {
  email?: unknown;
  nom?: unknown;
  prenom?: unknown;
  role?: unknown;
  date_naissance?: unknown;
  matricule?: unknown;
  annee_universitaire?: unknown;
}

export async function importUsers(buffer: Buffer) {
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new BadRequestError('Fichier Excel vide ou invalide');

  const rows = xlsx.utils.sheet_to_json<ImportRow>(sheet, { defval: '' });
  if (rows.length === 0) throw new BadRequestError('Aucune ligne trouvée dans le fichier');
  if (rows.length > 500) throw new BadRequestError('Le fichier ne peut pas dépasser 500 lignes');

  const specialites = await prisma.specialite.findMany({ select: { id: true, nom: true } });
  const specialiteMap = new Map(specialites.map((s) => [s.nom.toLowerCase(), s.id]));

  const existingEmails = new Set(
    (await prisma.user.findMany({ select: { email: true } })).map((u) => u.email),
  );

  const imported: string[] = [];
  const errors: { row: number; message: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const email = String(row.email ?? '').trim().toLowerCase();
    const nom = String(row.nom ?? '').trim();
    const prenom = String(row.prenom ?? '').trim();
    const roleRaw = String(row.role ?? '').trim().toUpperCase() as Role;
    const dateNaissanceRaw = row.date_naissance;
    const matricule = row.matricule ? String(row.matricule).trim() : undefined;
    const anneeUniv = row.annee_universitaire ? String(row.annee_universitaire).trim() : undefined;

    if (!email) { errors.push({ row: rowNum, message: 'Email manquant' }); continue; }
    if (!nom || nom.length < 2) { errors.push({ row: rowNum, message: 'Nom invalide (min 2 caractères)' }); continue; }
    if (!prenom || prenom.length < 2) { errors.push({ row: rowNum, message: 'Prénom invalide (min 2 caractères)' }); continue; }
    if (!VALID_ROLES.includes(roleRaw)) { errors.push({ row: rowNum, message: `Rôle invalide : ${roleRaw}` }); continue; }
    if (!isValidEmailForRole(email, roleRaw)) {
      errors.push({ row: rowNum, message: `Email non conforme au rôle ${roleRaw}` });
      continue;
    }
    if (existingEmails.has(email)) { errors.push({ row: rowNum, message: `Email déjà utilisé : ${email}` }); continue; }

    let dateNaissance: Date;
    if (dateNaissanceRaw instanceof Date) {
      dateNaissance = dateNaissanceRaw;
    } else {
      const parsed = new Date(String(dateNaissanceRaw));
      if (isNaN(parsed.getTime())) {
        errors.push({ row: rowNum, message: 'Date de naissance invalide (format : YYYY-MM-DD)' });
        continue;
      }
      dateNaissance = parsed;
    }

    const specialiteNom = (row as Record<string, unknown>)['specialite'];
    let specialite_id: string | undefined;
    if (specialiteNom) {
      specialite_id = specialiteMap.get(String(specialiteNom).toLowerCase());
      if (!specialite_id) {
        errors.push({ row: rowNum, message: `Spécialité introuvable : ${specialiteNom}` });
        continue;
      }
    }

    try {
      const initialPassword = generateInitialPassword(dateNaissance);
      const password_hash = await hashPassword(initialPassword);

      await prisma.user.create({
        data: { email, nom, prenom, role: roleRaw, date_naissance: dateNaissance, password_hash, matricule, annee_universitaire: anneeUniv, specialite_id },
      });

      existingEmails.add(email);
      imported.push(email);
    } catch {
      errors.push({ row: rowNum, message: 'Erreur lors de la création' });
    }
  }

  return {
    imported: imported.length,
    total: rows.length,
    errors,
  };
}

// ─── Export ───────────────────────────────────────────────────────────────────

export async function exportUsers(
  format: 'excel' | 'pdf',
  filters: UserFilters,
  res: Response,
): Promise<void> {
  const { data: users } = await getUsers({ ...filters, limit: 1000, page: 1 });

  if (format === 'excel') {
    const rows = users.map((u) => ({
      Nom: u.nom,
      Prénom: u.prenom,
      Email: u.email,
      Rôle: u.role,
      Spécialité: u.specialite?.nom ?? '',
      Matricule: u.matricule ?? '',
      'Année universitaire': u.annee_universitaire ?? '',
      Actif: u.is_active ? 'Oui' : 'Non',
      'Date création': u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '',
    }));

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(rows);

    ws['!cols'] = [
      { wch: 15 }, { wch: 15 }, { wch: 35 }, { wch: 16 },
      { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 8 }, { wch: 14 },
    ];

    xlsx.utils.book_append_sheet(wb, ws, 'Utilisateurs');
    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="utilisateurs_${Date.now()}.xlsx"`);
    res.send(buf);
    return;
  }

  if (format === 'pdf') {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="utilisateurs_${Date.now()}.pdf"`);
    doc.pipe(res);

    doc.fontSize(16).font('Helvetica-Bold').text('Liste des Utilisateurs — e-PFE', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`Université de Béjaïa — Département Informatique`, { align: 'center' });
    doc.fontSize(9).text(`Exporté le ${new Date().toLocaleDateString('fr-FR')} — ${users.length} utilisateur(s)`, { align: 'center' });
    doc.moveDown(1.5);

    const headers = ['Nom', 'Prénom', 'Email', 'Rôle', 'Spécialité', 'Actif'];
    const colWidths = [80, 80, 200, 100, 100, 40];
    const startX = 40;
    let y = doc.y;

    doc.font('Helvetica-Bold').fontSize(9);
    let x = startX;
    headers.forEach((h, i) => {
      doc.rect(x, y, colWidths[i], 18).fillAndStroke('#2563eb', '#1e40af');
      doc.fillColor('white').text(h, x + 4, y + 4, { width: colWidths[i] - 8, lineBreak: false });
      x += colWidths[i];
    });

    doc.font('Helvetica').fontSize(8).fillColor('black');
    y += 18;

    users.forEach((u, idx) => {
      if (y > 530) {
        doc.addPage({ layout: 'landscape' });
        y = 40;
      }
      const bg = idx % 2 === 0 ? '#f8fafc' : 'white';
      x = startX;
      const rowData = [u.nom, u.prenom, u.email, u.role, u.specialite?.nom ?? '—', u.is_active ? 'Oui' : 'Non'];
      rowData.forEach((val, i) => {
        doc.rect(x, y, colWidths[i], 16).fillAndStroke(bg, '#e2e8f0');
        doc.fillColor('#1e293b').text(val, x + 4, y + 3, { width: colWidths[i] - 8, lineBreak: false });
        x += colWidths[i];
      });
      y += 16;
    });

    doc.end();
    return;
  }

  throw new BadRequestError('Format invalide. Utilisez "excel" ou "pdf"');
}
