import vine from '@vinejs/vine'
import type { Infer } from '@vinejs/vine/types'
import { dashboardPeriods } from '#services/dashboard/summary_service'

const day = () =>
  vine
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)

export const dashboardQueryValidator = vine.create({
  start: day().optional(),
  end: day().optional(),
  period: vine.enum(dashboardPeriods).optional(),
})

export type DashboardQuery = Infer<typeof dashboardQueryValidator>
