# Order chat

Order chat runs on Socket.IO, attached to the application's HTTP server by `ChatProvider`.
The provider binds the Socket.IO `Server` as a container singleton, so application code
can resolve it with `app.container.make(Server)`. There is no separate chat engine.

## Authentication

Socket.IO bypasses the Adonis HTTP router, so `ChatUserMiddleware` is registered on the
root namespace at startup. Browser clients connect to the same application origin and
send nothing in `auth`:

```ts
import { io } from 'socket.io-client'

const socket = io({ withCredentials: true })
```

The middleware reads the configured session store in read-only mode (flash messages are
not consumed and no cookie is written) and authenticates through the `web` guard. Any
signed-in account may connect: customers, staff, and admins. Guests, invalid or destroyed
sessions, deleted accounts, and browser requests from another origin are rejected.
`APP_URL`, when set, defines the allowed browser origin; otherwise the request host and
the environment's HTTP/HTTPS scheme are used. Clients without an Origin header still
need a valid session.

After verification the socket carries only `socket.data = { userId }`. Client-supplied
identity, roles, and metadata are ignored. Authentication runs on each connection and
reconnection; existing sockets are not revoked on logout or session expiry, but every
chat event reloads the account and order and checks `ChatOrderPolicy` again.

## Rooms and events

`ChatOrderRoomHandler` in `app/sockets/chat/order_room_handler.ts` handles all chat
events. Socket handlers live in `app/sockets/` (imported as `#sockets/*`) because they
are neither HTTP controllers nor emitter listeners. Each order has one room,
`order:<orderId>`. A thread exists only for orders placed with a customer account. The
account holder and store staff can read it, and new messages are accepted only while the
order is `confirmed`.

| Client → server | Payload            | Reply                     |
| --------------- | ------------------ | ------------------------- |
| `order:join`    | `{ roomKey }`      | `{ roomKey, messages }`   |
| `order:leave`   | `{ roomKey }`      | `null`                    |
| `message:send`  | `{ roomKey, body }`| the stored message        |
| `message:read`  | `{ roomKey }`      | `null`                    |
| `typing:start`, `typing:stop` | `{ roomKey }` | no acknowledgement |

Replies are `{ ok: true, data }` or `{ ok: false, error: { code, message } }`, where
`code` is `NOT_FOUND`, `FORBIDDEN`, `VALIDATION`, `RATE_LIMITED`, or `INTERNAL`.
Sending, reading, and typing require having joined the room on that socket.

The server emits `message:new` (the stored message plus `roomKey`) to the room,
`message:read { roomKey, side }` when one side reads the thread, and
`typing:start` / `typing:stop { roomKey, side }`. Events name the side (`customer` or
`staff`), never an account id.

Messages are trimmed text of up to 2,000 characters; the sender's name and side come
from the account, not the client. A message is stored in `order_messages` before it is
broadcast, so a failed write is never shown as delivered. Each account may send 30
messages per minute.

## Photos

Photos are uploaded over HTTP, not the socket: `POST /chat/orders/:orderId/messages`
(`chat.messages.store`) takes 1–4 `images` (JPG, PNG, WebP, or GIF, up to 5 MB each)
and an optional `body` caption, checks `ChatOrderPolicy.send`, and redirects back. Each
account may upload 10 times per minute. The message and its images are stored in one
transaction through the `images` attachment collection on `OrderMessage`
(`@jrmc/adonis-attachment`, files under `chat/orders/<orderId>/`), so a failed upload
leaves no message behind. A photo-only message has an empty `body`.

`OrderChatService.post` dispatches `OrderMessagePosted` for every stored message, typed
or uploaded, and the room handler broadcasts it as `message:new`. Each message carries
`images: [{ id, url, name, mimeType, width, height }]`.

Photos are private to the order. They are served only by
`GET /chat/orders/:orderId/images/:id` (`chat.images.show`), which requires a session
and `ChatOrderPolicy.view`, and checks that the photo was sent in that order's chat.
The attachment package's public `/attachments/:id` route is turned off; the
application's own `attachments.show` route serves catalogue media and avatars at the
same URL and returns 404 for chat photos.

Shutdown closes Socket.IO connections before Adonis waits for the HTTP server to close.
