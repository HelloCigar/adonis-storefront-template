import { HttpContext } from '@adonisjs/core/http'
import { BaseSerializer } from '@adonisjs/core/transformers'
import type { ApplicationService } from '@adonisjs/core/types'
import type { SimplePaginatorMetaKeys } from '@adonisjs/lucid/types/querybuilder'

/** Serializes transformer output for JSON responses, wrapped in a `data` key. */
class ApiSerializer extends BaseSerializer<{
  Wrap: 'data'
  PaginationMetaData: SimplePaginatorMetaKeys
}> {
  wrap = 'data' as const

  definePaginationMetaData(metaData: unknown): SimplePaginatorMetaKeys {
    if (!this.isLucidPaginatorMetaData(metaData)) {
      throw new Error('Invalid pagination metadata. Expected metadata from a Lucid paginator')
    }
    return metaData
  }
}

/** Also serializes transformer output outside a request, such as AI tool results. */
export const serializer = new ApiSerializer()
const serialize = serializer.serialize.bind(serializer) as ApiSerializer['serialize']

declare module '@adonisjs/core/http' {
  export interface HttpContext {
    serialize: typeof serialize
  }
}

/** Attaches `serialize` to every HTTP context, for JSON endpoints built on transformers. */
export default class ApiProvider {
  constructor(protected app: ApplicationService) {}

  async boot() {
    HttpContext.instanceProperty('serialize', serialize)
  }
}
