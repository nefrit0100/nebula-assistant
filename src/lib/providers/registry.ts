import type { ProviderDefinition, ProviderId } from "./types"

/**
 * The provider registry: display metadata and connection options for every
 * supported provider. Adding a provider = an entry here + an adapter in
 * src/lib/providers/server/adapters + its id in PROVIDER_IDS.
 */
export const PROVIDERS: Record<ProviderId, ProviderDefinition> = {
  openai: {
    id: "openai",
    name: "OpenAI",
    description: "GPT models through the OpenAI API.",
    keyLabel: "API key",
    keyPlaceholder: "sk-…",
    keyUrl: "https://platform.openai.com/api-keys",
    docsUrl: "https://platform.openai.com/docs/models",
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    description:
      "Claude models through the Claude API. If some models decline a request, Anthropic may re-run it on a fallback model, billed at that model's rates.",
    keyLabel: "API key",
    keyPlaceholder: "sk-ant-…",
    keyUrl: "https://platform.claude.com/settings/keys",
    docsUrl: "https://platform.claude.com/docs/en/about-claude/models/overview",
  },
  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    description: "DeepSeek models through the DeepSeek platform.",
    keyLabel: "API key",
    keyPlaceholder: "sk-…",
    keyUrl: "https://platform.deepseek.com/api_keys",
    docsUrl: "https://api-docs.deepseek.com/",
  },
  alibaba: {
    id: "alibaba",
    name: "Alibaba Cloud",
    description: "Qwen models through Alibaba Cloud Model Studio.",
    keyLabel: "API key",
    keyPlaceholder: "sk-…",
    keyUrl: "https://modelstudio.console.alibabacloud.com/?tab=playground#/api-key",
    docsUrl: "https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope",
    options: [
      {
        key: "region",
        label: "Region",
        type: "select",
        defaultValue: "intl",
        choices: [
          { value: "intl", label: "International (Singapore)" },
          { value: "us", label: "US (Virginia)" },
          { value: "cn", label: "China (Beijing)" },
          { value: "custom", label: "Workspace endpoint", hint: "Use a workspace-specific URL" },
        ],
        help: "Keys only work in the region where they were created.",
      },
      {
        key: "baseUrl",
        label: "Workspace endpoint",
        type: "url",
        placeholder: "https://<workspace>.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1",
        help: "Must be an aliyuncs.com address ending in /compatible-mode/v1.",
        visibleWhen: { key: "region", value: "custom" },
      },
    ],
  },
  zhipu: {
    id: "zhipu",
    name: "Zhipu AI",
    description: "GLM models through Z.ai or BigModel.",
    keyLabel: "API key",
    keyPlaceholder: "Your Zhipu API key",
    keyUrl: "https://z.ai/manage-apikey/apikey-list",
    docsUrl: "https://docs.z.ai/guides/overview/quick-start",
    options: [
      {
        key: "platform",
        label: "Platform",
        type: "select",
        defaultValue: "zai",
        choices: [
          { value: "zai", label: "Z.ai (international)" },
          { value: "bigmodel", label: "BigModel (China)" },
        ],
      },
    ],
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter",
    description: "Hundreds of models from many labs behind one key.",
    keyLabel: "API key",
    keyPlaceholder: "sk-or-…",
    keyUrl: "https://openrouter.ai/settings/keys",
    docsUrl: "https://openrouter.ai/docs/quickstart",
  },
  opencode: {
    id: "opencode",
    name: "OpenCode",
    description: "Curated models through OpenCode Zen or an OpenCode Go plan.",
    keyLabel: "API key",
    keyPlaceholder: "Your OpenCode API key",
    keyUrl: "https://opencode.ai/auth",
    docsUrl: "https://opencode.ai/docs/zen/",
    options: [
      {
        key: "plan",
        label: "Plan",
        type: "select",
        defaultValue: "zen",
        choices: [
          { value: "zen", label: "Zen", hint: "Pay as you go" },
          { value: "go", label: "Go", hint: "Subscription" },
        ],
      },
    ],
  },
}

export const PROVIDER_LIST: ProviderDefinition[] = [
  PROVIDERS.openai,
  PROVIDERS.anthropic,
  PROVIDERS.deepseek,
  PROVIDERS.alibaba,
  PROVIDERS.zhipu,
  PROVIDERS.openrouter,
  PROVIDERS.opencode,
]

/** Fills in defaults for a provider's options and drops unknown keys. */
export function normalizeProviderOptions(
  provider: ProviderId,
  input: Record<string, unknown> | null | undefined,
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const option of PROVIDERS[provider].options ?? []) {
    const raw = input?.[option.key]
    if (option.type === "select") {
      const allowed = option.choices.map((choice) => choice.value)
      result[option.key] = typeof raw === "string" && allowed.includes(raw) ? raw : option.defaultValue
    } else if (typeof raw === "string" && raw.trim()) {
      result[option.key] = raw.trim()
    }
  }
  return result
}
