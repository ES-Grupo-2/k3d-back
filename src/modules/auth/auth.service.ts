import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from '../../lib/clientPrisma';
import { LoginInput, RegisterInput, VerifyEmailInput } from './auth.types';
import { sendVerificationEmail } from '../../utils/email';
import { AppError } from '../../utils/errors';

export class AuthService {
  
  static async register(data: RegisterInput) {
    const userExists = await prisma.user.findUnique({ where: { email: data.email } });
    if (userExists) {
      throw new AppError('E-mail já cadastrado!', 409);
    }

    const password_hash = await bcrypt.hash(data.password, 10);
    
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await sendVerificationEmail(data.email, verificationCode);

    const newUser = await prisma.user.create({
      data: {
        email: data.email,
        password_hash,
        role: data.role || 'OPERACIONAL',
        is_verified: false,
        verification_code: verificationCode,
        verification_expires_at: expiresAt,
      },
    });

    return { 
      message: 'Usuário criado com sucesso!', 
      userId: newUser.id 
    };
  }

  static async verifyEmail(data: VerifyEmailInput) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user) throw new AppError('Usuário não encontrado', 404);
    if (user.is_verified) throw new AppError('Conta já verificada', 409);
    if (user.verification_code !== data.code) throw new AppError('Código inválido', 400);
    if (!user.verification_expires_at || new Date() > user.verification_expires_at) {
      throw new AppError('Código expirado', 400);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        is_verified: true,
        verification_code: null,
        verification_expires_at: null,
      },
    });

    return { message: 'Conta ativada com sucesso!' };
  }

  static async login(data: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user) {
      throw new AppError('Credenciais inválidas', 401);
    }

    const passwordMatches = await bcrypt.compare(data.password, user.password_hash);
    if (!passwordMatches) {
      throw new AppError('Credenciais inválidas', 401);
    }

    if (!user.is_verified) {
      throw new AppError('Conta ainda não verificada', 403);
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET não configurado');
    }

    const expiresIn = (process.env.JWT_EXPIRES_IN || '8h') as SignOptions['expiresIn'];

    const signOptions: SignOptions = {
      expiresIn,
    };

    const token = jwt.sign(
      {
        email: user.email,
        role: user.role,
      },
      jwtSecret,
      {
        ...signOptions,
        subject: String(user.id),
      },
    );

    return {
      message: 'Login realizado com sucesso!',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isVerified: user.is_verified,
      },
    };
  }
}
