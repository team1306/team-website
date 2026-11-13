/** Eligibility shared by manual approval controls and order creation. */
export function canApproveCategory(role: string, requiredRole: string, tierTwo = false): boolean {
  if (role === "teamAdministrator") return requiredRole !== "nProgramDirector";
  switch (requiredRole) {
    case "mentor":
      return ["mentor", "mentorLead", "programDirector"].includes(role);
    case "mentorLead":
      return ["mentorLead", "programDirector"].includes(role);
    case "studentLead":
      return role === "studentLead" || (role === "president" && !tierTwo);
    case "president":
      return role === "president";
    default:
      return false;
  }
}
