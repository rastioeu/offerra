/**
 * Telefónne číslo — kontrola, nie overenie.
 *
 * Rozdiel je podstatný a v appke ho treba pomenovať: toto len hovorí, že
 * to VYZERÁ ako telefónne číslo. Či ho človek naozaj vlastní, sa nevie —
 * na to by bola potrebná SMS s kódom a k tomu platený SMS poskytovateľ,
 * ktorý projekt nemá (viď `reports/AUDIT_PRED_BUILDOM_1_3_0.md`).
 *
 * Kontrola je ZÁMERNE mierna. Prísny formát by odmietol zahraničné čísla
 * a človeka, ktorý si ho píše po svojom — a číslo, ktoré appka odmietne,
 * je horšie než číslo v inom tvare.
 */

/** Aspoň deväť číslic. Slovenské číslo ich má deväť aj bez predvoľby. */
export const MIN_PHONE_DIGITS = 9;

export function phoneDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function isUsablePhone(value: string | null | undefined): boolean {
  return phoneDigits(value ?? '').length >= MIN_PHONE_DIGITS;
}
