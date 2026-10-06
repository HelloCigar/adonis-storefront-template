// import { AiTool } from '@adonis-agora/agent'
// import type { AiToolCtx, ToolHandler } from '@adonis-agora/agent'
// import vine from '@vinejs/vine'
// import { Infer } from '@vinejs/vine/types'

// const inputSchema = vine.create({ city: vine.string().minLength(3), province: vine.string() })
// type InputType = Infer<typeof inputSchema>

// @AiTool({
//   name: 'getWeather',
//   kind: 'read',
//   description: 'Current weather for a city.',
//   input: inputSchema,
//   roles: ['MEMBER'],
// })
// export default class GetWeatherTool implements ToolHandler<InputType> {
//   async execute({ city }: InputType, _ctx: AiToolCtx) {
//     return { city: city, tempC: 21 }
//   }
// }
