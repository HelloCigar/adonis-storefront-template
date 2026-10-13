import DiscountCode from '#models/checkout/discount_code'

export const countDiscounts = async () => {
  const codes = await DiscountCode.all()
  return codes.length
}
