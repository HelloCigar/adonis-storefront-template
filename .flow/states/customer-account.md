---
capability: customer-account
---

# Customer Account — State

## Requirements

### Customers manage their account in one place

- Given a signed-in customer, when they open their account, then Overview, Orders, Addresses, Profile and Security are one area they can move between.
- Given a signed-out visitor, when they open any account page, then they are asked to sign in first.

### Customers edit their first and last name

- Given a customer on Profile, when they save a new first and last name, then their account greeting shows the new name.
- Given a customer who clears their first name, when they save, then the change is refused and the field explains why.

### Customers change their email with confirmation

- Given a customer on Profile, when they save a new email, then they keep signing in with the current one until the new one is confirmed from the emailed link.
- Given a pending change, when they cancel it, then the current email stays and no confirmation is sent.

### Customers change their password from their account

- Given a customer on Security, when they enter their current password and a new one, then the new password signs them in from then on.
- Given a wrong current password, when they submit, then the password is unchanged and they are told it is incorrect.

### Customers manage passkeys from their account

- Given a customer on Security, when they add, rename or remove a passkey, then the list reflects it.

### Customers manage saved addresses on their own page

- Given a customer on Addresses, when they add, edit, remove or set a default address, then they stay on Addresses and see the change.

### Customers are kept out of the store team's settings

- Given a customer, when they open the store settings area, then they land on the matching Profile or Security page of their account.

### Customers are reminded about carts they leave behind

- Given a signed-in customer who leaves items in their cart for four hours, when the store checks for idle carts, then they get one email listing those items with a way back to the cart.
- Given a customer who already got a reminder for a cart, when that cart stays idle, then no further reminder is sent for it.
- Given a cart that was checked out, whose items can no longer be bought, or that has been idle for more than a week, when the store checks for idle carts, then no reminder is sent.
- Given a shopper who never signed in, when they leave items in their cart, then no reminder is sent.

### Customers return to their cart from the reminder

- Given a customer who opens the link in their reminder, when the store loads, then their cart is open with the items they left.
- Given a link for a cart that was already checked out or has expired, when the customer opens it, then they are told the cart is no longer available.

### Customers stop cart reminders

- Given a customer who follows the unsubscribe link in a reminder and confirms, when idle carts are checked later, then they get no more cart reminders.
- Given an unsubscribe link that has expired or been altered, when it is opened, then nothing changes and the customer is told the link has expired.
- Given a customer on Profile, when they turn cart reminders off or back on, then future reminders follow that choice.
