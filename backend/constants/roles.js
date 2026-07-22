/**
 * Central role registry.
 *
 * WHY: hardcoding role strings ('admin', 'staff'...) across route files was
 * the root cause of the earlier privilege-escalation risk — every file had
 * its own opinion about which roles existed and what they were called.
 * Now there is exactly one source of truth. Adding a new role (e.g. a
 * future 'deliveryRider') means editing this file only.
 */

const ROLES = Object.freeze({
  CUSTOMER: 'customer',
  SUPPORT: 'support',
  DELIVERY: 'delivery',
  CASHIER: 'cashier',
  KITCHEN_STAFF: 'kitchenStaff',
  STAFF: 'staff', // generic/legacy staff role, kept for backward compatibility
  MANAGER: 'manager',
  ADMIN: 'admin',
  SUPER_ADMIN: 'superAdmin'
});

// Operational roles: day-to-day staff who run the kitchen/counter/delivery.
// Used for routes like order-status updates, kitchen queue, delivery assignment.
const OPERATIONAL_ROLES = [
  ROLES.KITCHEN_STAFF,
  ROLES.CASHIER,
  ROLES.DELIVERY,
  ROLES.SUPPORT,
  ROLES.STAFF,
  ROLES.MANAGER,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN
];

// Roles that are allowed to manage catalog/orders (menu, categories, deals, order status)
// Kept as an alias of OPERATIONAL_ROLES for backward compatibility with
// existing route files that already import STAFF_LEVEL.
const STAFF_LEVEL = OPERATIONAL_ROLES;

// Roles that are allowed to manage other users' roles / accounts, and
// create new staff accounts directly.
const ADMIN_LEVEL = [ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN];

// The only role a user can ever be assigned via public self-registration
const DEFAULT_SELF_REGISTER_ROLE = ROLES.CUSTOMER;

// Roles a superAdmin/admin may hand out via the promote or create-staff
// endpoints. superAdmin itself is deliberately excluded — that tier can
// only be set directly in the database, never over the API, so it can
// never be granted by mistake or by a compromised admin account.
const ASSIGNABLE_ROLES = [
  ROLES.CUSTOMER,
  ROLES.SUPPORT,
  ROLES.DELIVERY,
  ROLES.CASHIER,
  ROLES.KITCHEN_STAFF,
  ROLES.STAFF,
  ROLES.MANAGER,
  ROLES.ADMIN
];

// Roles that represent a staff member of some kind (i.e. not a customer).
// Used to decide, e.g., which accounts are eligible for the admin-created
// "staff account" flow rather than the public registration flow.
const STAFF_ROLES = ASSIGNABLE_ROLES.filter((r) => r !== ROLES.CUSTOMER);

module.exports = {
  ROLES,
  OPERATIONAL_ROLES,
  STAFF_LEVEL,
  ADMIN_LEVEL,
  DEFAULT_SELF_REGISTER_ROLE,
  ASSIGNABLE_ROLES,
  STAFF_ROLES
};
