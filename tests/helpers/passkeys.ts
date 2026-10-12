import env from '#start/env'
import User from '#models/account/user'
import type { Page } from 'playwright'
import { isoCBOR } from '@simplewebauthn/server/helpers'
import type { RecordedSignal } from '#tests/helpers/types'
import { generateKeyPairSync, randomBytes } from 'node:crypto'

/**
 * Stores a passkey directly, for tests that do not depend on the
 * credential being real
 */
export async function createPasskey(user: User, name: string) {
  const credentialId = `credential-${user.id}-${name}`
  await User.passkeys.create(user, {
    credentialId,
    publicKey: new Uint8Array([1, 2, 3]),
    counter: 0,
    transports: ['internal'],
    deviceType: 'multiDevice',
    backedUp: true,
    aaguid: '00000000-0000-0000-0000-000000000000',
    name,
  })

  return (await User.passkeys.findByCredentialId(credentialId))!
}

/**
 * Attaches a Chromium virtual authenticator that behaves like Touch ID
 * and approves prompts on its own
 */
export async function addVirtualAuthenticator(page: Page) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('WebAuthn.enable')
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  })

  return {
    /**
     * Creates a passkey for the user without going through the
     * registration UI. The public key is stored on the server and
     * the signing key on the authenticator.
     */
    async addPasskey(user: User) {
      if (!user.webauthnUserHandle) {
        user.webauthnUserHandle = randomBytes(64).toString('base64url')
        await user.save()
      }

      const credentialId = randomBytes(32)
      const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' })
      const jwk = publicKey.export({ format: 'jwk' })

      await User.passkeys.create(user, {
        credentialId: credentialId.toString('base64url'),
        publicKey: isoCBOR.encode(
          new Map<number, number | Uint8Array>([
            [1, 2],
            [3, -7],
            [-1, 1],
            [-2, Buffer.from(jwk.x!, 'base64url')],
            [-3, Buffer.from(jwk.y!, 'base64url')],
          ])
        ),
        counter: 0,
        transports: ['internal'],
        deviceType: 'multiDevice',
        backedUp: true,
        aaguid: '00000000-0000-0000-0000-000000000000',
        name: 'Passkey',
      })

      await cdp.send('WebAuthn.addCredential', {
        authenticatorId,
        credential: {
          credentialId: credentialId.toString('base64'),
          isResidentCredential: true,
          rpId: env.get('PASSKEY_RP_ID'),
          privateKey: privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64'),
          userHandle: Buffer.from(user.webauthnUserHandle, 'base64url').toString('base64'),
          signCount: 0,
        },
      })

      return (await User.passkeys.findByCredentialId(credentialId.toString('base64url')))!
    },
  }
}

/**
 * Replaces the Signal API methods with recorders, so tests can assert
 * which signals the page sent. Init scripts run on the next full page
 * load, hence the reload.
 */
export async function recordPasskeySignals(page: Page) {
  await page.context().addInitScript(`
    window.__passkeySignals = []
    for (const name of [
      'signalUnknownCredential',
      'signalAllAcceptedCredentials',
      'signalCurrentUserDetails',
    ]) {
      PublicKeyCredential[name] = async (options) => {
        window.__passkeySignals.push({ name, options })
      }
    }
  `)
  await page.reload()

  return {
    /**
     * Waits until at least "count" signals were sent and returns them
     */
    async waitFor(count: number): Promise<RecordedSignal[]> {
      await page.waitForFunction(`window.__passkeySignals.length >= ${count}`)
      return page.evaluate('window.__passkeySignals')
    },
  }
}

/**
 * Clicks "Add a passkey" and waits for the passkey to be saved. Waits
 * on the request rather than the toast, since a toast from a previous
 * attempt may still be visible.
 */
export async function addPasskey(page: Page) {
  const saved = page.waitForResponse(
    (response) =>
      response.url().endsWith('/settings/passkeys') && response.request().method() === 'POST'
  )
  await page.getByRole('button', { name: 'Add a passkey', exact: true }).click()
  await saved
}
