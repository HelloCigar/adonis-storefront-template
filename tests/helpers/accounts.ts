import User, { type UserRole } from '#models/account/user'

export const account = (email: string, role: UserRole = 'customer') =>
  User.create({ email, role, fullName: email, password: 'secret-password' })

export const signup = (email: string) => ({
  fullName: 'Customer',
  email,
  password: 'secret-password',
  passwordConfirmation: 'secret-password',
})

export const roleAccount = (role: UserRole) =>
  User.create({
    email: `${role}@example.com`,
    role,
    fullName: role,
    password: 'secret-password',
  })

export const storeOwner = () =>
  User.create({
    fullName: 'Store Owner',
    email: 'seller@example.com',
    password: 'secret-password',
    role: 'staff',
  })

export const storeStaff = () =>
  User.create({
    fullName: 'Store Staff',
    email: 'staff@example.com',
    password: 'secret-password',
    role: 'staff',
  })
