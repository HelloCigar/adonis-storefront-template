---
capability: shopping-assistant
---

# Shopping Assistant — State

## Requirements

### Shoppers open the shopping assistant while browsing

- Given the shopping assistant is on, when anyone, signed in or not, views a storefront page other than checkout or payment, then they can open the shopping assistant.
- Given the shopping assistant is open, when the shopper looks before typing, then they see that it is an AI assistant, that conversations may be reviewed by the store, and three suggested questions that fit the page.
- Given a shopper is viewing a product or collection, when they ask about "this", then the shopping assistant answers about that product or collection.
- Given a shopper is in checkout or payment, when they look for the shopping assistant, then it is not offered.
- Given the shopping assistant is off, when anyone views the storefront, then it is not offered anywhere.

### The shopping assistant answers from what the storefront shows

- Given a question about the store, when the shopper asks it, then the answer uses only what the storefront shows anyone: products, variants, prices, availability, collections, reviews, policies, blog and content pages, the shipping fee, and the contact email.
- Given the answer mentions products, when it is shown, then each product appears with its image, name, price and availability, and opens its product page.
- Given a question about stock, when the shopping assistant answers, then it says only "in stock" or "out of stock", never a count.
- Given a question about discount codes, when the shopping assistant answers, then it reveals no codes.
- Given the shopper writes in Filipino, Taglish or another language, when the shopping assistant replies, then it replies in that language and quotes store content as written.
- Given an off-topic request, when the shopper sends it, then the shopping assistant politely declines, says it can only help with this store's products, orders, shipping and policies, and offers the suggested questions again.

### The shopping assistant points shoppers to a person when it can't help

- Given the store's content doesn't answer the question, when the shopper asks it, then the shopping assistant says it doesn't know rather than guessing.
- Given the shopper asks for a person, or it can't help with one of their orders, when it replies, then it points them to that order's chat with staff.
- Given the shopper asks for a person, or it can't help with anything else, when it replies, then it gives the store's contact email.

### Signed-in shoppers ask about their own orders

- Given a signed-out shopper, when they ask about an order, then they are asked to sign in first, and after signing in they continue the same conversation.
- Given a signed-in shopper, when they ask about an order in their account, then the shopping assistant shares what their order page shows: status, items, totals, shipping details, carrier and tracking.
- Given a guest order that isn't in their account, when they ask about it, then the shopping assistant can't see it and explains how to add it to their account.
- Given an order number that isn't in their account, when they ask about it, then the reply is the same as for an order that doesn't exist.

### The shopping assistant proposes adding to cart and the shopper confirms

- Given the shopper wants a product, when the shopping assistant proposes adding it, then the proposal shows the product's image, name, variant, quantity of 1 to 10, and line price, with Add and Not now.
- Given a proposal, when the shopper chooses Add, then the item is added to their cart and the shopping assistant confirms with the new cart count and a way to check out.
- Given a proposal, when the shopper chooses Not now or ignores it, then their cart is unchanged.
- Given the variant has sold out since the proposal, when the shopper chooses Add, then the cart is unchanged, they see "This variant is unavailable.", and the shopping assistant offers in-stock alternatives.
- Given the quantity is no longer available, when the shopper chooses Add, then the cart is unchanged, they see "The requested quantity is not available.", and the shopping assistant offers in-stock alternatives.
- Given a proposal more than 30 minutes old, or whose product price has changed, when the shopper views it, then it can't be added and shows "No longer available — ask again".

### Shopping assistant conversations follow the shopper

- Given an open conversation, when the shopper moves between storefront pages, then the conversation continues.
- Given any shopper, when they start a new conversation, then a fresh one begins.
- Given a signed-in shopper, when they return later, then they can find their past conversations.
- Given a signed-in shopper, when they delete a past conversation, then it is gone for them and for admins.
- Given a signed-out visitor, when they return on the same browser, then only their current conversation is kept.
- Given a shopper signs out, when anyone uses that browser, then the account's conversations are not shown.
- Given a conversation's last message was 90 days ago, when anyone looks for it, then it has been removed.

### Shopping assistant use is limited

- Given a message longer than 1,000 characters, when the shopper tries to send it, then it is not sent.
- Given a shopper has sent 30 messages within the last hour, counted per signed-in shopper or per browser when signed out, when they send another, then it is not answered and they see "You've sent a lot of messages. Please try again in a little while, or reach us at <contact email>."

### Shoppers are told when the shopping assistant is unavailable

- Given the AI service fails or doesn't reply, when the shopper sends a message, then they see "The assistant isn't available right now. You can reach us at <contact email>." and can try sending again.
- Given an admin switches the shopping assistant off while a shopper has a conversation open, when the shopper sends a message, then they see the same message and can't send more, and the shopping assistant is gone from the next page they open.
