/**
 * Kategoriya plitkalari uchun yumshoq (pastel) fon ranglari.
 * Tartib bo'yicha almashinadi — qo'shni plitkalar har xil rangda bo'ladi.
 * Qorong'i rejimda CSS bu rangni yuza bilan aralashtiradi (aqua-ui.css).
 */
const PASTELS = ['#dcebfb', '#ddf3ea', '#fdebd5', '#ece4fa', '#fbe3e8', '#fff2c7', '#d9f1f6']

export function pastel(index: number): string {
  return PASTELS[((index % PASTELS.length) + PASTELS.length) % PASTELS.length]
}
