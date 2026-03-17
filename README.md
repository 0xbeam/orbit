# 🌀 orbit — typescript application framework

> AI-native personal CRM with calendar sync, email integration, relationship decay tracking, and Claude-powered daily briefings. Desktop + web.

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)](https://nextjs.org/) [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![Electron](https://img.shields.io/badge/Electron-35-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

| Feature | Description |
|---------|-------------|
| **Contact management** | Full contact cards with relationship strength indicators and decay tracking |
| **Google Calendar sync** | Auto-syncs calendar events, displays day view with countdown timers |
| **Email integration** | Gmail thread display, compose panel, per-contact email history |
| **AI daily briefing** | Claude-powered morning brief summarizing today's meetings and priorities |
| **Relationship decay** | Visual indicators showing which relationships need attention |
| **Lost contacts** | Surface contacts you haven't engaged with recently |
| **Desktop app** | Electron wrapper for native macOS experience |
| **Auto-sync** | Background sync for calendar and email data |

## Quick Start

```bash
git clone https://github.com/0xbeam/orbit.git && cd orbit
npm install
cp .env.example .env   # add Google OAuth + Anthropic API key
npm run dev             # web at localhost:3000
```

Desktop:

```bash
npm run electron:dev    # launch Electron app
npm run electron:build  # build .dmg for macOS
```

## Structure

```
src/
├── app/
│   ├── calendar/     Google Calendar sync + display
│   ├── compose/      Email compose
│   ├── contacts/     Contact management
│   ├── email/        Gmail thread viewer
│   ├── now/          Today's overview
│   └── settings/     App configuration
├── components/       UI components (ContactCard, Timeline, DecayIndicator, etc.)
├── db/               Drizzle ORM schema + queries
└── lib/              Shared utilities
electron/             Electron main process
```

## Stack

Next.js 16 · React 19 · TypeScript · Drizzle ORM · Vercel Postgres · Google APIs · Claude Agent SDK · Electron · Tailwind CSS

## License

MIT
