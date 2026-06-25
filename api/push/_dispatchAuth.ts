import type { ApiRequest } from './_shared.js'

const getHeaderValue = (request: ApiRequest, name: string): string | undefined => {
  const value = request.headers[name.toLowerCase()]

  return Array.isArray(value) ? value[0] : value
}

const getBearerToken = (request: ApiRequest): string | null => {
  const authorization = getHeaderValue(request, 'authorization')
  const prefix = 'Bearer '

  return authorization?.startsWith(prefix) ? authorization.slice(prefix.length).trim() : null
}

export const getDispatchSecretNames = (): string[] => (process.env.CRON_SECRET ? ['CRON_SECRET'] : [])

export const hasDispatchSecret = (): boolean => getDispatchSecretNames().length > 0

export const isDispatchAuthorized = (request: ApiRequest): boolean => {
  const cronSecret = process.env.CRON_SECRET
  const bearerToken = getBearerToken(request)

  if (!cronSecret || !bearerToken) {
    return false
  }

  return bearerToken === cronSecret
}
