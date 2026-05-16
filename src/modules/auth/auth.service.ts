import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/clientPrisma';
import { RegisterInput, VerifyEmailInput } from './auth.types';
import { sendVerificationEmail } from '../../utils/email';

export class AuthService {
  
  static async register(data: RegisterInput) {
    const userExists = await prisma.user.findUnique({ where: { email: data.email } });
    if (userExists) {
      throw new Error('E-mail já cadastrado!');
    }

    const password_hash = await bcrypt.hash(data.password, 10);
    
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

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

    sendVerificationEmail(newUser.email, verificationCode).catch(console.error);

    return { 
      message: 'Usuário criado com sucesso!', 
      userId: newUser.id 
    };
  }


  // analisar a criação de exceptions específicas ou retornar HTTP codes
  static async verifyEmail(data: VerifyEmailInput) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user) throw new Error('Usuário não encontrado');
    if (user.is_verified) throw new Error('Conta já verificada');
    if (user.verification_code !== data.code) throw new Error('Código inválido');
    if (!user.verification_expires_at || new Date() > user.verification_expires_at) {
      throw new Error('Código expirado');
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
}