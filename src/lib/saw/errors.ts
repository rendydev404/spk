export class SawValidationError extends Error {
  readonly masalah: string[];
  constructor(masalah: string[]) {
    super(`Data perhitungan SAW tidak valid: ${masalah.join("; ")}`);
    this.name = "SawValidationError";
    this.masalah = masalah;
  }
}
