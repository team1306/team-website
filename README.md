This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Sign-in and local development

Production uses Slack OAuth. Configure its callback as `/auth/callback` on the deployed origin.
The “Continue as test user” option is available only with `npm run dev`. Anonymous sessions
are rejected outside development, and new anonymous profiles are stored as students;
the development UI grants the temporary student-lead role only in memory.
Do not use a production database for local test accounts or sample purchases.

## Checks before merging

- `npx tsc --noEmit --incremental false`
- `npm run build`
- `npm run lint`

See [merge review](docs/merge-review.md) for results and remaining limitations.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

The UI uses Open Sans, with JetBrains Mono for branding, and shadcn base-vega components.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
