import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function normalizePassword(password: string): string {
  return password.replace(/\//g, '');
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(normalizePassword(password), hash);
}

export function generateInitialPassword(dateNaissance: Date): string {
  const day = String(dateNaissance.getDate()).padStart(2, '0');
  const month = String(dateNaissance.getMonth() + 1).padStart(2, '0');
  const year = dateNaissance.getFullYear();
  return `${day}${month}${year}`;
}
