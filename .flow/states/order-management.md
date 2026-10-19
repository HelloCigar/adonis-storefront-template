---
capability: order-management
---

# Order Management — State

## Requirements

### Staff see the order's next action first

- Given an online order with something for staff to do, when they open it, then the first thing below the order's title is that action (Start packing, Mark as shipped, or Mark as delivered), with the stage progress (payment, packing, dispatch, delivery) shown alongside it.
- Given an order that has been waiting on staff, when the next action is something to do, then they see how long it has been waiting.
- Given an order that is waiting for payment, being cancelled, delivered, cancelled, or expired, when staff open it, then that place shows the order's current state and what it means, with no action and no waiting time.
- Given fulfillment is blocked, when staff open the order, then that place shows the main issue, its reason, and its fix, with any further blocking issues listed under it.
- Given a blocking payment or refund issue, when staff follow its fix, then they reach the payment summary where the matching recheck is offered.
- Given an action fails or its outcome is uncertain, when the response arrives, then staff see "Action needs attention" or "Check status before continuing" with the error and Refresh status.
- Given any screen size, when staff open the order, then the next action still comes before the order's contents, payments, and history.

### Everything needed for the next action is visible

- Given an order is ready to pack, when staff view the next action, then the pick list is shown with Start packing.
- Given an order is ready to ship, when staff view the next action, then the ship-to address, the parcel contents, and the carrier, tracking number, and optional tracking link entries are all shown without an extra step to reveal them.
- Given an order is ready to ship and has a customer email, when staff view the next action, then they are told that saving emails the tracking to that address and that tracking can't be changed after it is saved.
- Given an order has shipped, when staff view the next action, then they see when it shipped, when it was delivered or "Not yet confirmed", the carrier, the tracking number, and a link to track it when one was saved.

### Page-wide actions sit beside the order title

- Given any order, when staff open it, then they see the order number, its status, and the total, item count, whether it was an online checkout or a manual order, and the placed date in Philippine time.
- Given any order, when staff open it, then Refresh status is available beside the title.
- Given an order with a customer conversation, when staff open it, then Message customer is available beside the title with the number of unread messages.
- Given an online order, when staff open it, then a More actions menu beside the title offers Refund and Cancel order.

### Staff refund a payment from More actions

- Given an order with one refundable payment, when staff choose Refund, then they see the full remaining refundable amount and must confirm refunding it before the request is sent.
- Given an order with several refundable payments, when staff choose Refund, then they see each payment with its remaining refundable amount, pick one, and confirm refunding that amount.
- Given staff confirmed a refund, when the request is accepted, then the refund shows as pending until the provider confirms it.
- Given staff have not confirmed, when they try to request the refund, then nothing is sent.

### Staff cancel an order from More actions

- Given an order that can be cancelled, when staff choose Cancel order, then they see what cancelling does: whether it closes an unpaid checkout, which refunds it requests or keeps, and how many units return to stock, or that no refund or stock change is needed.
- Given the cancellation would request refunds, when staff confirm, then the confirmation names the refund total, as in "I confirm cancelling this order and refunding ₱1,200.00."
- Given the cancellation would not request refunds, when staff confirm, then the confirmation reads "I confirm cancelling this order."
- Given staff have not confirmed, when they try to cancel, then nothing is sent.

### Unavailable refund and cancel explain why

- Given a refund is not allowed right now, when staff open More actions, then Refund is listed but cannot be chosen, and shows the reason it is blocked.
- Given cancelling is not allowed right now, when staff open More actions, then Cancel order is listed but cannot be chosen, and shows the reason it is blocked.
- Given a cancellation is already requested, when staff open More actions, then Cancel order cannot be chosen and says "Cancellation is already requested. Refresh status to check the confirmed outcome."
- Given the order has shipped or been delivered, when staff open More actions, then Cancel order cannot be chosen and says "Orders can’t be cancelled after they ship."
- Given the order is cancelled or expired, when staff open More actions, then Cancel order cannot be chosen and says "This order is already closed."

### Failed customer emails are flagged near the top

- Given a customer email for the order failed, when staff open it, then a secondary alert next to the next action names the failed email and offers to retry it, without replacing the next action.
- Given staff retry a failed email, when the retry is queued, then the alert clears and the email shows as queued.
- Given a retried email fails again, when staff view the order, then it is flagged again with its failure message and retry stays available.
- Given no customer email has failed, when staff open the order, then no email alert is shown.

### The payment summary shows payments, refunds, and rechecks

- Given an order, when staff view its contents, then they see each item's title, variant, SKU, quantity, unit price, and line total, and the subtotal, discount with its code, shipping, tax, and total.
- Given an order with payments, when staff view the payment summary, then each payment shows its amount, provider, reference, and whether it is paid.
- Given an order with refunds, when staff view the payment summary, then each refund shows its amount, state, and reference, and refunds reported directly by the provider are listed as such.
- Given no captured payment is recorded, when staff view the payment summary, then they see "No captured payment is recorded. A checkout request is not payment confirmation."
- Given a checkout or refund needs a recheck with the provider, when staff view the payment summary, then the recheck is offered there.

### The order's history is one timeline

- Given an order with recorded events and customer emails, when staff view its history, then events and emails appear together in one list, newest first, each saying what happened, when, and who did it.
- Given a customer email failed, when staff view its entry in the timeline, then it is marked failed with its failure message and can be retried there.
- Given an event has extra details, when staff view it, then the details stay hidden until staff ask for them.
- Given the order has more history than its latest entries, when staff view the timeline, then older entries stay hidden until staff ask to see all of them.
- Given nothing has been recorded yet, when staff view the timeline, then they are told no events have been recorded yet.

### Customer details and the order note sit beside the main area

- Given an order, when staff open it, then beside the main area they see the customer's email and phone, or "No email recorded".
- Given the ship-to and bill-to addresses match, when staff view them, then one "Ship and bill to" address is shown; otherwise each is shown under its own heading.
- Given no address is recorded, when staff view the customer details, then they see "No address is recorded for this order."
- Given an order, when staff want to add or change its note, then they can do so in exactly one place on the page, and a note left at checkout appears there.

### Manual orders share the same layout

- Given a manual order, when staff open it, then Record payment and fulfillment takes the next-action place at the top, and the contents, customer details, note, and timeline sit where they do for online orders.
- Given a manual order, when staff open it, then no More actions menu is offered.
