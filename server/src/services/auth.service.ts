import { prisma } from '../config/database';
import { comparePassword, hashPassword } from '../utils/password.utils';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/token.utils';
import { UnauthorizedError, BadRequestError } from '../middleware/error.middleware';
import type { LoginDto, ChangePasswordDto } from '../types';

export async function login(dto: LoginDto) {
  const user = await prisma.user.findUnique({
    where: { email: dto.email },
    include: { specialite: true },
  });

  if (!user || !user.is_active) {
    throw new UnauthorizedError('Email ou mot de passe incorrect');
  }

  const valid = await comparePassword(dto.password, user.password_hash);
  if (!valid) {
    throw new UnauthorizedError('Email ou mot de passe incorrect');
  }

  const payload = { userId: user.id, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const { password_hash, ...userWithoutPassword } = user;
  void password_hash;

  return { accessToken, refreshToken, user: userWithoutPassword };
}

export async function refreshTokens(refreshToken: string) {
  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });

    if (!user || !user.is_active) {
      throw new UnauthorizedError('Utilisateur introuvable ou inactif');
    }

    return {
      accessToken: signAccessToken({ userId: user.id, role: user.role }),
      refreshToken: signRefreshToken({ userId: user.id, role: user.role }),
    };
  } catch {
    throw new UnauthorizedError('Refresh token invalide');
  }
}

export async function changePassword(userId: string, dto: ChangePasswordDto) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const valid = await comparePassword(dto.currentPassword, user.password_hash);
  if (!valid) {
    throw new BadRequestError('Mot de passe actuel incorrect');
  }

  const newHash = await hashPassword(dto.newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { password_hash: newHash },
  });
}
