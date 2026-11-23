import { autoExpeditieVendor } from "./constants";

export function isAmazonVendor(vendor: string): boolean {
  return vendor.trim().toLowerCase() === autoExpeditieVendor;
}
