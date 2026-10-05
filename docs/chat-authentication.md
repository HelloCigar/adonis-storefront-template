# Chat authentication

Ravex attaches to the application's HTTP server through `ChatProvider`. Socket.IO
bypasses the Adonis HTTP router, so chat authentication is registered on the root
Socket.IO namespace once at startup, before constructing Ravex.

Clients use the existing store login session. Browser clients should connect to
the same application origin with `auth: {}`; no token or client-supplied user is
required. For example, a Ravex client can use:

```ts
const client = new ChatClient({ url: window.location.origin, auth: {} })
```

The socket middleware reads the configured Adonis session store in read-only
mode, authenticates through the `web` guard, and requires a staff or admin account,
matching the inbox access boundary. Guests, customers, invalid sessions, deleted
accounts, and browser requests from another origin are rejected. `APP_URL`, when
set, defines the allowed browser origin; otherwise the request host and the
environment's HTTP/HTTPS scheme are used. Clients without an Origin header still
require a valid session.

After verification, the middleware replaces `auth.user` with the database user's
string ID, a stable `user-<id>` username, and display name. Client identity fields,
roles, and metadata are never trusted or copied. Session cookies remain HTTP-only;
the browser sends them automatically.

Authentication runs on each connection and reconnection. Existing sockets are
not revoked automatically on logout, session expiry, or role changes. Ravex room
access and message persistence require separate application setup; this middleware
only establishes trusted staff identity. Shutdown clears Ravex timers and closes
Socket.IO connections.
