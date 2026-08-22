export interface JareneQuote {
  id: string;
  author: string;
  discipline: {
    id: string;
    en: string;
  };
  original: string;
  translated: string;
  source: {
    title: string;
    detail: string;
    url: string;
  };
}

export const jareneQuotes: JareneQuote[] = [
  {
    id: "smith-consumption",
    author: "Adam Smith",
    discipline: { id: "Ekonom", en: "Economist" },
    original:
      "Consumption is the sole end and purpose of all production; and the interest of the producer ought to be attended to, only so far as it may be necessary for promoting that of the consumer.",
    translated:
      "Konsumsi adalah tujuan akhir dari seluruh produksi; kepentingan produsen patut diperhatikan hanya sejauh diperlukan untuk memajukan kepentingan konsumen.",
    source: {
      title: "The Wealth of Nations",
      detail: "Book IV, Chapter VIII",
      url: "https://www.gutenberg.org/files/3300/3300-h/3300-h",
    },
  },
  {
    id: "keynes-long-run",
    author: "John Maynard Keynes",
    discipline: { id: "Ekonom", en: "Economist" },
    original: "In the long run we are all dead.",
    translated: "Dalam jangka panjang, kita semua mati.",
    source: {
      title: "A Tract on Monetary Reform",
      detail: "1923, p. 80",
      url: "https://cooperative-individualism.org/keynes-john-maynard_a-tract-on-monetary-reform-1929.pdf",
    },
  },
  {
    id: "hardy-patterns",
    author: "G. H. Hardy",
    discipline: { id: "Matematikawan", en: "Mathematician" },
    original:
      "A mathematician, like a painter or a poet, is a maker of patterns. If his patterns are more permanent than theirs, it is because they are made with ideas.",
    translated:
      "Seorang matematikawan, seperti pelukis atau penyair, adalah pembuat pola. Jika polanya lebih abadi, itu karena pola tersebut dibuat dari gagasan.",
    source: {
      title: "A Mathematician's Apology",
      detail: "Chapter 10",
      url: "https://www.cambridge.org/core/books/abs/mathematicians-apology/10/1ECD7C400B32DDEC3ADFBBE39C89D4D1",
    },
  },
  {
    id: "poincare-names",
    author: "Henri Poincaré",
    discipline: { id: "Matematikawan", en: "Mathematician" },
    original: "Mathematics is the art of giving the same name to different things.",
    translated: "Matematika adalah seni memberi nama yang sama pada hal-hal yang berbeda.",
    source: {
      title: "Science and Method",
      detail: "The Future of Mathematics",
      url: "https://www.gutenberg.org/files/39713/39713-h/39713-h",
    },
  },
  {
    id: "pasteur-prepared-mind",
    author: "Louis Pasteur",
    discipline: { id: "Ilmuwan", en: "Scientist" },
    original: "In the fields of observation, chance favors only the prepared mind.",
    translated: "Di ranah pengamatan, kebetulan hanya berpihak pada pikiran yang siap.",
    source: {
      title: "University of Lille address",
      detail: "7 December 1854",
      url: "https://gallica.bnf.fr/ark:/12148/bpt6k7363q/f135.image",
    },
  },
  {
    id: "newton-seashore",
    author: "Isaac Newton",
    discipline: { id: "Ilmuwan", en: "Scientist" },
    original:
      "I seem to have been only like a boy playing on the seashore, and diverting myself in now and then finding a smoother pebble or a prettier shell than ordinary, while the great ocean of truth lay all undiscovered before me.",
    translated:
      "Aku merasa seperti seorang anak yang bermain di tepi laut, sesekali menemukan kerikil yang lebih halus atau kerang yang lebih indah, sementara samudra kebenaran terbentang belum tersingkap.",
    source: {
      title: "Anecdotes, Observations, and Characters of Books and Men",
      detail: "Rev. Joseph Spence, 1858, p. 40",
      url: "https://www.gutenberg.org/files/53311/53311-h/53311-h",
    },
  },
];

export function pickJareneQuote(random = Math.random()): JareneQuote {
  const safeRandom = Number.isFinite(random) ? Math.min(Math.max(random, 0), 0.999999) : 0;
  const firstQuote = jareneQuotes[0];
  if (!firstQuote) throw new Error("Jarene quote catalog cannot be empty.");
  return jareneQuotes[Math.floor(safeRandom * jareneQuotes.length)] ?? firstQuote;
}
