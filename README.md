# MIZAN Web

The public, static web edition of MIZAN — a client-side real-estate offer builder.

## Live site

After the first successful deployment:

`https://ykhaled2080-cmd.github.io/mizan-web/`

## Privacy

- Offers, presets and preferences are stored in the visitor's browser using `localStorage`.
- The site has no accounts, database or backend.
- Offer data is not uploaded to GitHub.
- PDF and image generation happens in the visitor's browser.

## Deployment

Pushes to `main` deploy automatically through GitHub Actions. The workflow copies the public static files, stamps asset query versions with the commit SHA, and publishes them to GitHub Pages. The live URL does not change.

Only public frontend files belong in this repository. Do not commit local user data, private source, secrets, customer records, or machine-specific configuration.
