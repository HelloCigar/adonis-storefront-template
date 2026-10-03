import MakeStaff from './make_staff.js'

/** Compatibility alias for installations using the former seller role. */
export default class MakeSeller extends MakeStaff {
  static commandName = 'user:make-seller'
  static description = 'Legacy alias for user:make-staff (preserves existing admin access)'
}
