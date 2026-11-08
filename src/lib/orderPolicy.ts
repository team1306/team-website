export function isAmazonVendor(vendor: string): boolean {
  return vendor.trim().toLowerCase() === "amazon";
}
