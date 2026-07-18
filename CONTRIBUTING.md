# Contributing

Thanks for improving StudentOS AI. Open an issue before major product changes, keep pull requests focused, and include a concise description, screenshots for UI changes, and verification steps.

## Development standards

- Use TypeScript and existing project conventions.
- Keep user data behind RLS; never use service-role keys in the browser.
- Keep AI keys in Supabase secrets.
- Add forward-only migrations for schema changes.
- Run `npm run build` and `npm run lint` before opening a PR.
- Preserve Demo Mode isolation: it must never write sample data to a real account.

By contributing, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
