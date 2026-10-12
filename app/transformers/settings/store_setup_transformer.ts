import { BaseTransformer } from '@adonisjs/core/transformers'
import type StoreSetting from '#models/settings/store_setting'

type Checklist = { product: boolean; staff: boolean; policies: boolean }

const labels = {
  product: 'Add a product shoppers can buy',
  staff: 'Invite a staff member',
  policies: 'Write your store policies',
} as const

export default class StoreSetupTransformer extends BaseTransformer<{
  settings: StoreSetting
  checklist: Checklist
}> {
  toObject() {
    const { settings, checklist } = this.resource
    return {
      finished: settings.setupFinished,
      nextStep: settings.nextSetupStep,
      checklist: settings.checklistVisible
        ? {
            items: (Object.keys(labels) as (keyof Checklist)[]).map((key) => ({
              key,
              label: labels[key],
              ticked: checklist[key],
            })),
          }
        : null,
    }
  }
}
