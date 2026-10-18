// Existing records may contain 화성갑, 화성시 을, or spaces around the city name.
export const normalizeRequestDistrict = (value: string = ""): string =>
  value.replace(/화\s*성\s*시?\s*/g, "").trim();
