import type { Role } from '@prisma/client';

const STUDENT_DOMAIN = '@se.univ-bejaia.dz';
const TEACHER_DOMAIN = '@univ-bejaia.dz';

export function isValidEmailForRole(email: string, role: Role): boolean {
  if (role === 'ETUDIANT') {
    return email.endsWith(STUDENT_DOMAIN);
  }
  if (role === 'ENSEIGNANT') {
    return email.endsWith(TEACHER_DOMAIN) && !email.endsWith(STUDENT_DOMAIN);
  }
  return email.endsWith(TEACHER_DOMAIN) || email.endsWith(STUDENT_DOMAIN);
}

export function extractDomainFromRole(role: Role): string {
  return role === 'ETUDIANT' ? STUDENT_DOMAIN : TEACHER_DOMAIN;
}
