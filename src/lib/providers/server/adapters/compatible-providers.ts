import "server-only"

import { ProviderError } from "../provider-error"
import { createCompatibleAdapter } from "./openai-compatible"

export const deepseekAdapter = createCompatibleAdapter({
  id: "deepseek",
  baseURL: () => "https://api.deepseek.com",
  streamUsage: true,
})

const ALIBABA_REGIONS: Record<string, string> = {
  intl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
  us: "https://dashscope-us.aliyuncs.com/compatible-mode/v1",
  cn: "https://dashscope.aliyuncs.com/compatible-mode/v1",
}

/**
 * Workspace endpoints are user-supplied, so they are held to a strict allowlist:
 * HTTPS, an aliyuncs.com host, the default port, and the compatible-mode path.
 * This keeps the server from being pointed at arbitrary hosts (SSRF).
 */
export function resolveAlibabaBaseUrl(options: Record<string, string>): string {
  if (options.region !== "custom") return ALIBABA_REGIONS[options.region] ?? ALIBABA_REGIONS.intl
  const validated = validateAlibabaEndpoint(options.baseUrl)
  if (!validated) {
    throw new ProviderError("invalid_input", "The workspace endpoint must be an https://…aliyuncs.com/compatible-mode/v1 URL.")
  }
  return validated
}

export function validateAlibabaEndpoint(value: string | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    const hostOk = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.aliyuncs\.com$/.test(url.hostname)
    const pathOk = url.pathname.replace(/\/+$/, "") === "/compatible-mode/v1"
    if (url.protocol !== "https:" || !hostOk || !pathOk || url.port || url.username || url.password || url.search || url.hash) {
      return null
    }
    return `https://${url.hostname}/compatible-mode/v1`
  } catch {
    return null
  }
}

export const alibabaAdapter = createCompatibleAdapter({
  id: "alibaba",
  baseURL: resolveAlibabaBaseUrl,
  streamUsage: true,
  filter: (id) =>
    /^(qwen|qwq|qvq)/.test(id) &&
    !/(tts|asr|realtime|omni|image|video|embedding|rerank|ocr|audio|livetranslate|-mt-|-\d{4}-\d{2}-\d{2}$)/.test(id),
})

const ZHIPU_PLATFORMS: Record<string, string> = {
  zai: "https://api.z.ai/api/paas/v4",
  bigmodel: "https://open.bigmodel.cn/api/paas/v4",
}

export const zhipuAdapter = createCompatibleAdapter({
  id: "zhipu",
  baseURL: (options) => ZHIPU_PLATFORMS[options.platform] ?? ZHIPU_PLATFORMS.zai,
  streamUsage: true,
  filter: (id) => /^glm/i.test(id) && !/(embedding|cogview|cogvideo|voice|tts|asr|realtime|image|video)/i.test(id),
})
