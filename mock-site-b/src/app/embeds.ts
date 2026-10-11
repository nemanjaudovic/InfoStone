// ID-jevi InfoStone komponenti koje ovaj sajt ugradjuje (kopiraj ih iz dashboard-a posle "Generate").
// Prazno = na sajtu se vidi prazan prozor sa opisom sta tu treba da bude.
// Brza zamena bez menjanja koda: http://localhost:420X/?form=ID&table=ID&search=ID
export const EMBEDS: Record<string, string> = {
  form: '',   // forma za prijavu
  table: '',  // tabela (rezultat AI pretrage nad prijavama)
  search: '', // AI pretraga (prostori / govornici)
};

export const EMBED_BASE = 'http://localhost:3000/api/components';
