# LAT — Language Translator

A single-page translator built with plain HTML, CSS, and JavaScript, backed by a small
serverless function that calls **DeepL** (high-quality) with **MyMemory** as a fallback
for the two languages DeepL doesn't support (Yoruba, Amharic).

## Why a serverless function?

DeepL gives far better, correct translations than free lookup-based services — but its
API key can't be safely put in front-end JavaScript (anyone could read it from page
source and burn your quota), and DeepL doesn't allow direct browser calls (no CORS).
So the frontend calls a tiny `/api/translate` function on your own hosting, which holds
the key server-side and calls DeepL for you. Everything else is still plain static files.

## Files

- `index.html`, `style.css`, `script.js` — the frontend (unchanged shape from before)
- `lib/translate-core.js` — shared translation logic (DeepL + MyMemory fallback)
- `netlify/functions/translate.js` — Netlify Functions adapter
- `api/translate.js` — Vercel Serverless Functions adapter
- `netlify.toml` — maps `/api/translate` to the Netlify function, so the frontend can
  call the same path on either platform

No npm dependencies — both functions use the runtime's built-in `fetch`.

## 1. Get a free DeepL API key

1. Go to <https://www.deepl.com/en/pro-api> and sign up for **DeepL API Free**
   (500,000 characters/month, no cost). Some signup flows ask for a card — you are
   **not charged** unless you separately upgrade to a paid plan.
2. Copy your API key from the account page. Free-plan keys end in `:fx` — the function
   detects that suffix automatically and calls the right DeepL endpoint.

## 2. Deploy

Because of the serverless function, this is a one-command CLI deploy rather than a
plain drag-and-drop — still free, still no separate backend to manage.

### Netlify

```
npx netlify-cli deploy --prod
```

Follow the prompts to create/link a site. Then set your key:

```
npx netlify-cli env:set DEEPL_API_KEY "your-key-here"
```

(or Site settings → Environment variables in the Netlify dashboard), then redeploy
(`npx netlify-cli deploy --prod`) so the function picks it up.

### Vercel

```
npx vercel --prod
```

Then set the key in Project Settings → Environment Variables (`DEEPL_API_KEY`), or via
CLI:

```
npx vercel env add DEEPL_API_KEY
```

and redeploy.

### GitHub Pages

Won't work here — GitHub Pages only serves static files, it can't run the
`/api/translate` function. Use Netlify or Vercel instead.

## Test locally

```
npx netlify-cli dev
```

or

```
npx vercel dev
```

Either serves the site and runs `/api/translate` locally. Put your key in a `.env`
file first (`DEEPL_API_KEY=your-key-here`) — see `.env.example`.

## Notes

- **Auto-Detect** is handled by DeepL itself when you leave Source on Auto-Detect
  (its detection is reliable — no more guesswork).
- **Yoruba and Amharic** aren't yet supported by DeepL, so those two automatically use
  MyMemory instead — quality for just those two is more variable than the rest.
- If `DEEPL_API_KEY` isn't set yet, translations for DeepL-covered languages return a
  clear error explaining that, rather than failing silently.
