import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { prisma } from "../../lib/clientPrisma";
import { LoginInput, RegisterInput } from "./auth.types";
import { AppError } from "../../utils/errors";

export class AuthService {
  static async register(data: RegisterInput) {
    const userExists = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (userExists) {
      throw new AppError("E-mail já cadastrado!", 409);
    }

    const password_hash = await bcrypt.hash(data.password, 10);

    const newUser = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password_hash,
        role: data.role,
        created_at: new Date(),
      },
    });

    return {
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.created_at,
      },
    };
  }

  static async login(data: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });

    if (!user) {
      throw new AppError("Credenciais inválidas", 401);
    }

    const passwordMatches = await bcrypt.compare(
      data.password,
      user.password_hash,
    );

    if (!passwordMatches) {
      throw new AppError("Credenciais inválidas", 401);
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET não configurado");
    }

    const expiresIn = (process.env.JWT_EXPIRES_IN ||
      "8h") as SignOptions["expiresIn"];

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
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
