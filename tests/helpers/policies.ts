import User, { type UserRole } from '#models/account/user'

/** A signed-in user with the given role, for checking policies without the database. */
export function actor(role: UserRole, id = '1') {
  const user = new User()
  user.id = id
  user.role = role
  return user
}
