/*
|--------------------------------------------------------------------------
| Validator file
|--------------------------------------------------------------------------
|
| The validator file is used for configuring global transforms for VineJS.
| The transform below converts all VineJS date outputs from JavaScript
| Date objects to Luxon DateTime instances, so that validated dates are
| ready to use with Lucid models and other parts of the app that expect
| Luxon DateTime.
|
*/

import { DateTime } from 'luxon'
import vine, { SimpleMessagesProvider, VineDate } from '@vinejs/vine'

declare module '@vinejs/vine/types' {
  interface VineGlobalTransforms {
    date: DateTime
  }
}

VineDate.transform((value) => DateTime.fromJSDate(value))

/** Store setup and store settings copy approved in the store setup brief; other rules keep Vine's defaults. */
vine.messagesProvider = new SimpleMessagesProvider({
  'storeName.required': 'Enter your store name.',
  'storeName.minLength': 'Store name must be at least 2 characters.',
  'storeName.maxLength': 'Store name must be 60 characters or fewer.',
  'contactEmail.required': 'Enter a contact email.',
  'contactEmail.email': 'Enter a valid email address.',
  'shippingFee.required': 'Enter a shipping fee.',
  'shippingFee.min': "Shipping fee can't be negative.",
  'shippingFee.max': "Shipping fee can't be more than ₱100,000.",
  'shippingFee.decimal': 'Shipping fee can have at most 2 decimal places.',
})
