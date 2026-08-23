# @takontuku/jarene

Jarene is an optional Takontuku module that adds a small, server-rendered quote to the shared
authentication panel. It is intentionally lightweight: no routes, middleware, database tables,
seeds, or user data.

Install it in a Takontuku app with:

```sh
bunx takontuku add jarene
```

Remove it with:

```sh
bunx takontuku remove jarene
```

The package ships a curated catalog of quotes from economists, mathematicians, and scientists.
Each entry keeps the original wording, an Indonesian translation, the author and discipline, and
a source reference. Indonesian locales show the translation; English locales show the original
wording. Attribution always includes the author, discipline, and a short source reference. Quote
selection happens once while Astro renders the auth page; no browser script or client-side state is
involved. The v1 catalog is package-owned and changes only through a release after its sources are
checked.

Auth imagery remains configurable per brand:

```js
takontuku({
  brand: {
    name: "Kedai Senja",
    locale: "id-ID",
    currency: "IDR",
    timeZone: "Asia/Jakarta",
    auth: {
      backgroundImage: "/images/auth-commerce.webp",
      backgroundPosition: "center 35%",
    },
  },
  modules: [auth(), jarene()],
});
```
