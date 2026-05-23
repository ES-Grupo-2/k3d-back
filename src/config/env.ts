import { z } from 'zod';
import 'dotenv/config'; 

const envSchema = z.object({
  DATABASE_URL: z.string({
    required_error: 'The DATABASE_URL variable is required.',
  }).url('DATABASE_URL must be a valid URL.'),
  
  DIRECT_URL: z.string({
    required_error: 'The DIRECT_URL variable is required.',
  }).url('DIRECT_URL must be a valid URL.'),

  JWT_SECRET: z.string({
    required_error: 'The JWT_SECRET variable is required for API security.',
  }).min(16, 'JWT_SECRET must be at least 16 characters long for security.'),
  
  JWT_EXPIRES_IN: z.string().default('8h'),

  MINIO_ENDPOINT: z.string({ required_error: 'MINIO_ENDPOINT is required.' }),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_USE_SSL: z.preprocess(
    (val) => val === 'true', 
    z.boolean()
  ).default(false),
  MINIO_ACCESS_KEY: z.string({ required_error: 'MINIO_ACCESS_KEY is required.' }),
  MINIO_SECRET_KEY: z.string({ required_error: 'MINIO_SECRET_KEY is required.' }),
  MINIO_BUCKET: z.string({ required_error: 'MINIO_BUCKET is required.' }),

  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const _env = envSchema.safeParse(process.env);

if (_env.success === false) {
  console.error('\n[Configuration Error] Invalid or missing environment variables:');
  
  console.error(JSON.stringify(_env.error.format(), null, 2));
  
  process.exit(1);
}

export const env = _env.data;