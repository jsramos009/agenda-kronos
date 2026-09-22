import { z } from "zod";

const customerInputSchema = z.object({
  name: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(8).max(30).optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
  consent: z.boolean(),
});

export function parseCustomerInput(input: unknown) {
  return customerInputSchema.safeParse(input);
}

export function canCreateCustomer(roleKey: string) {
  return ["owner", "admin", "reception"].includes(roleKey);
}

export type CustomerMembership = {
  organization_id: string;
  role: string;
};

export function selectCustomerMembership(
  memberships: CustomerMembership[],
  requestedOrganizationId?: string,
) {
  return (
    memberships.find(
      (membership) => membership.organization_id === requestedOrganizationId,
    ) ?? memberships[0]
  );
}
