import nodemailer from 'nodemailer';
import { AppError } from './errors';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendVerificationEmail(toEmail: string, verificationCode: string): Promise<void> {
  await transporter.sendMail({
    from: '"Sistema K3D" <kria3dk3d@gmail.com>',
    to: toEmail,
    subject: 'Seu código de acesso para K3D',
    // editar o html
    html: `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>Confirmação de Cadastro</h2>
        <p>Para ativar sua conta, utilize o código abaixo:</p>
        <div style="font-size: 24px; font-weight: bold; background-color: #f4f4f4; padding: 10px; display: inline-block;">
          ${verificationCode}
        </div>
        <p>Este código expira em 15 minutos.</p>
      </div>
    `,
  }).catch(() => {
    throw new AppError('Falha no envio do email', 502);
  });
}
