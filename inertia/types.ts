import type { Data } from '@generated/data'
import type { JSONDataTypes } from '@adonisjs/core/types/transformers'
import type { InferFlashData } from '@adonisjs/inertia/types'
import type InertiaMiddleware from '#middleware/inertia_middleware'

export type * from './types/index.js'

export type InertiaProps<T extends JSONDataTypes = {}> = Data.SharedProps & T

declare module '@inertiajs/core' {
  interface InertiaConfig {
    sharedPageProps: Data.SharedProps
    flashDataType: InferFlashData<InertiaMiddleware>
  }
}
