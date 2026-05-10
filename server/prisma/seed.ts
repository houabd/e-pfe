import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Peuplement de la base de données...');

  // Spécialités
  const specialites = await Promise.all([
    prisma.specialite.upsert({ where: { nom: 'ASR' }, update: {}, create: { nom: 'ASR' } }),
    prisma.specialite.upsert({ where: { nom: 'IA' }, update: {}, create: { nom: 'IA' } }),
    prisma.specialite.upsert({ where: { nom: 'GL - Ingénieur' }, update: {}, create: { nom: 'GL - Ingénieur' } }),
    prisma.specialite.upsert({ where: { nom: 'GL - LMD' }, update: {}, create: { nom: 'GL - LMD' } }),
  ]);

  console.log(`✓ ${specialites.length} spécialités créées`);

  const hash = (date: string) => bcrypt.hashSync(date, 10);

  // Chef de département
  const chefDept = await prisma.user.upsert({
    where: { email: 'chef.dept@univ-bejaia.dz' },
    update: {},
    create: {
      email: 'chef.dept@univ-bejaia.dz',
      password_hash: hash('01011970'),
      nom: 'Benali',
      prenom: 'Mohamed',
      role: 'CHEF_DEPT',
      date_naissance: new Date('1970-01-01'),
    },
  });

  // Responsable de filière
  const respFiliere = await prisma.user.upsert({
    where: { email: 'resp.filiere@univ-bejaia.dz' },
    update: {},
    create: {
      email: 'resp.filiere@univ-bejaia.dz',
      password_hash: hash('15031975'),
      nom: 'Hamdi',
      prenom: 'Fatima',
      role: 'RESP_FILIERE',
      specialite_id: specialites[1].id, // IA
      date_naissance: new Date('1975-03-15'),
    },
  });

  // Technicien
  const tech = await prisma.user.upsert({
    where: { email: 'technicien@univ-bejaia.dz' },
    update: {},
    create: {
      email: 'technicien@univ-bejaia.dz',
      password_hash: hash('20061985'),
      nom: 'Khelifi',
      prenom: 'Salim',
      role: 'TECHNICIEN',
      date_naissance: new Date('1985-06-20'),
    },
  });

  // Enseignants
  const ens1 = await prisma.user.upsert({
    where: { email: 'ali.boukhalfa@univ-bejaia.dz' },
    update: {},
    create: {
      email: 'ali.boukhalfa@univ-bejaia.dz',
      password_hash: hash('10041980'),
      nom: 'Boukhalfa',
      prenom: 'Ali',
      role: 'ENSEIGNANT',
      specialite_id: specialites[1].id, // IA
      date_naissance: new Date('1980-04-10'),
    },
  });

  const ens2 = await prisma.user.upsert({
    where: { email: 'sara.messai@univ-bejaia.dz' },
    update: {},
    create: {
      email: 'sara.messai@univ-bejaia.dz',
      password_hash: hash('05091978'),
      nom: 'Messai',
      prenom: 'Sara',
      role: 'ENSEIGNANT',
      specialite_id: specialites[0].id, // ASR
      date_naissance: new Date('1978-09-05'),
    },
  });

  // Étudiants
  const etud1 = await prisma.user.upsert({
    where: { email: 'amira.bensaid@etu.univ-bejaia.dz' },
    update: {},
    create: {
      email: 'amira.bensaid@etu.univ-bejaia.dz',
      password_hash: hash('12022002'),
      nom: 'Bensaid',
      prenom: 'Amira',
      role: 'ETUDIANT',
      specialite_id: specialites[1].id, // IA
      date_naissance: new Date('2002-02-12'),
      matricule: '202210001',
      annee_universitaire: '2025-2026',
    },
  });

  const etud2 = await prisma.user.upsert({
    where: { email: 'karim.hadjadj@etu.univ-bejaia.dz' },
    update: {},
    create: {
      email: 'karim.hadjadj@etu.univ-bejaia.dz',
      password_hash: hash('08112001'),
      nom: 'Hadjadj',
      prenom: 'Karim',
      role: 'ETUDIANT',
      specialite_id: specialites[1].id, // IA
      date_naissance: new Date('2001-11-08'),
      matricule: '202210002',
      annee_universitaire: '2025-2026',
    },
  });

  console.log(`✓ Utilisateurs créés : ${[chefDept, respFiliere, tech, ens1, ens2, etud1, etud2].map((u) => u.email).join(', ')}`);

  // Session CHOIX active
  const session = await prisma.session.upsert({
    where: { id: 'seed-session-choix' },
    update: {},
    create: {
      id: 'seed-session-choix',
      type: 'CHOIX',
      date_debut: new Date('2025-09-01'),
      date_fin: new Date('2025-11-30'),
      annee_universitaire: '2025-2026',
      is_active: true,
    },
  });

  console.log(`✓ Session créée : ${session.type} (${session.annee_universitaire})`);

  // Thème de démonstration
  await prisma.theme.upsert({
    where: { id: 'seed-theme-1' },
    update: {},
    create: {
      id: 'seed-theme-1',
      titre: 'Système de recommandation basé sur le Deep Learning',
      description:
        "Développement d'un système de recommandation utilisant les réseaux de neurones profonds pour personnaliser les résultats de recherche dans le domaine académique.",
      mots_cles: ['deep learning', 'recommandation', 'NLP', 'Python'],
      type_pfe: 'CLASSIQUE',
      sous_types: ['RECHERCHE'],
      propose_par_id: ens1.id,
      encadrant_id: ens1.id,
      session_id: session.id,
      statut_validation: 'VALIDE',
      theme_specialites: { create: [{ specialite_id: specialites[1].id }] },
    },
  });

  console.log('✓ Thème de démonstration créé');
  console.log('\n Seed terminé avec succès !');
  console.log('\n Comptes de test :');
  console.log('  Chef de département : chef.dept@univ-bejaia.dz / 01011970');
  console.log('  Resp. filière       : resp.filiere@univ-bejaia.dz / 15031975');
  console.log('  Technicien          : technicien@univ-bejaia.dz / 20061985');
  console.log('  Enseignant 1        : ali.boukhalfa@univ-bejaia.dz / 10041980');
  console.log('  Enseignant 2        : sara.messai@univ-bejaia.dz / 05091978');
  console.log('  Étudiant 1          : amira.bensaid@etu.univ-bejaia.dz / 12022002');
  console.log('  Étudiant 2          : karim.hadjadj@etu.univ-bejaia.dz / 08112001');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
