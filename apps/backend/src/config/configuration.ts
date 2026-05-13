import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'staging').default('development'),
  PORT: Joi.number().default(3001),
  APP_VERSION: Joi.string().default('1.0.0'),
  DATABASE_URL: Joi.string().required(),
  DIRECT_URL: Joi.string().required(),
  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_ANON_KEY: Joi.string().required(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),
  AI_SERVICE_URL: Joi.string().uri().default('http://localhost:8000'),
  CORS_ORIGIN: Joi.string().default('http://localhost:5175'),
});

export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3001', 10),
  appVersion: process.env.APP_VERSION ?? '1.0.0',
  database: {
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
  },
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  aiServiceUrl: process.env.AI_SERVICE_URL ?? 'http://localhost:8000',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5175',
});
