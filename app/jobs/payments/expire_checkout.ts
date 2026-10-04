import CreateCheckout from '#jobs/payments/create_checkout'

export default class ExpireCheckout extends CreateCheckout {
  async execute() {
    await this.recovery.run(this.payload.entityId, true)
  }
}
