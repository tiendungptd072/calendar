import type { ApiRequest } from './_shared.js'

const DISPATCH_SECRET_ENV_NAMES = [
  'CRON_SECRET',
  'DISPATCH_SECRET',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SECRET_KEY',
] as const

const getHeaderValue = (request: ApiRequest, name: string): string | undefined => {
  const value = request.headers[name.toLowerCase()]

  return Array.isArray(value) ? value[0] : value
}

const getBearerToken = (request: ApiRequest): string | null => {
  const authorization = getHeaderValue(request, 'authorization')
  const prefix = 'Bearer '

  return authorization?.startsWith(prefix) ? authorization.slice(prefix.length).trim() : null
}

export const getDispatchSecretNames = (): string[] =>
  DISPATCH_SECRET_ENV_NAMES.filter((name) => Boolean(process.env[name]))

export const hasDispatchSecret = (): boolean => getDispatchSecretNames().length > 0

export const isVercelCronRequest = (request: ApiRequest): boolean => {
  const userAgent = getHeaderValue(request, 'user-agent')
  const cronSchedule = getHeaderValue(request, 'x-vercel-cron-schedule')

  return userAgent === 'vercel-cron/1.0' && typeof cronSchedule === 'string'
}

export const isDispatchAuthorized = (request: ApiRequest): boolean => {
  if (isVercelCronRequest(request)) {
    return true
  }

  const bearerToken = getBearerToken(request)
  if (!bearerToken) {
    return false
  }

  return DISPATCH_SECRET_ENV_NAMES.some((name) => process.env[name] === bearerToken)
}
