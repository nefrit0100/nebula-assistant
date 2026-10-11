import { CATALOG_VERIFIED_ON, catalogModels } from "@/lib/providers/catalog"
import { PROVIDER_LIST } from "@/lib/providers/registry"
import type { ModelInfo, ProviderId } from "@/lib/providers/types"

export type PublicCatalog = {
  /** Date the curated model details were last checked against provider docs. */
  verifiedOn: string
  providers: {
    id: ProviderId
    name: string
    description: string
    /** Where to create an API key for this provider. */
    keyUrl: string
    docsUrl: string
    /** Curated models. A key can use more: Nebula also lists whatever the provider offers it. */
    models: Omit<ModelInfo, "provider" | "source">[]
  }[]
}

/** The public GET /api/catalog payload: static registry and catalog data, nothing per-user. */
export function publicCatalog(): PublicCatalog {
  return {
    verifiedOn: CATALOG_VERIFIED_ON,
    providers: PROVIDER_LIST.map((provider) => ({
      id: provider.id,
      name: provider.name,
      description: provider.description,
      keyUrl: provider.keyUrl,
      docsUrl: provider.docsUrl,
      models: catalogModels(provider.id).map(({ provider: _provider, source: _source, ...model }) => model),
    })),
  }
}
