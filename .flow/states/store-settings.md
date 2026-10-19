---
capability: store-settings
---

# Store Settings — State

## Requirements

### Admins set the store name

- Given a valid store name of 2 to 60 characters after trimming, when an admin saves it in store setup or store settings, then it replaces the default name and the "Your store" label wherever the store's name is shown: storefront, page titles, emails, and invoices.
- Given no store name has been saved, when anyone views the store, then the deployment's default name is shown.
- Given the store name is blank, when the admin saves, then nothing is saved and they see "Enter your store name."
- Given the store name is shorter than 2 characters, when the admin saves, then nothing is saved and they see "Store name must be at least 2 characters."
- Given the store name is longer than 60 characters, when the admin saves, then nothing is saved and they see "Store name must be 60 characters or fewer."

### Admins set the store's contact email

- Given a valid contact email, when an admin saves it, then shoppers see it as the way to reach the store and their replies go to it.
- Given the contact email is blank, when the admin saves, then nothing is saved and they see "Enter a contact email."
- Given the contact email is not a valid address, when the admin saves, then nothing is saved and they see "Enter a valid email address."
- Given any contact email is saved, when the store sends email, then the address it is sent from is unchanged from the deployment's.

### Admins set the flat shipping fee

- Given a fee from PHP 0 to PHP 100,000 with at most two decimal places, when an admin saves it, then every order placed afterwards uses that fee, and PHP 0 means free shipping.
- Given an order was placed before the fee changed, when anyone views that order, its invoice, or its emails, then it still shows the fee it was placed with.
- Given a shopper is partway through checkout when the fee changes, when they place their order, then the new fee applies and they see it before paying.
- Given the fee is blank, when the admin saves, then nothing is saved and they see "Enter a shipping fee."
- Given the fee is below zero, when the admin saves, then nothing is saved and they see "Shipping fee can't be negative."
- Given the fee is above PHP 100,000, when the admin saves, then nothing is saved and they see "Shipping fee can't be more than ₱100,000."
- Given the fee has more than two decimal places, when the admin saves, then nothing is saved and they see "Shipping fee can have at most 2 decimal places."

### Admins write the store's policies

- Given the four policies (Refund, Shipping, Privacy, and Terms of service), when an admin writes one as formatted text and saves, then it appears in the storefront's policy list and footer links.
- Given a policy is left empty, when shoppers browse the storefront, then that policy does not appear, and setup can still be finished.
- Given no policy text exists for a policy, when an admin opens it, then it starts blank with no generated template text.
- Given a policy was supplied with the deployment and no admin has saved one, when an admin opens it, then it is pre-filled with the deployment's text.
- Given an admin has saved their own version of a policy, when the store is later deployed with different text for it, then shoppers still see the admin's version.

### Store settings are edited in an admin-only area

- Given store setup is finished, when an admin opens store settings, then they can change the store name, contact email, shipping fee, and policies under the same rules and messages as store setup, and switch the shopping assistant on or off.
- Given a staff member, when they try to open store settings, then they cannot.

### Admins switch the shopping assistant on or off

- Given the store has an AI service set up, when an admin turns the shopping assistant on or off in store settings, then shoppers can or can no longer use it on the storefront.
- Given no admin has changed it, when an admin opens store settings, then the shopping assistant is off.
- Given the store has no AI service set up, when an admin tries to turn the shopping assistant on, then it stays off and they see "AI isn't set up for this store yet."
