# Lint Configuration

This project uses ESLint for code linting with support for:

- TypeScript
- Astro components
- JSX accessibility rules

## Scripts

- `pnpm run lint` - Check for linting errors
- `pnpm run lint:fix` - Automatically fix linting errors where possible

## Editor Integration

The project includes VS Code settings (`.vscode/settings.json`) that will:

- Sort imports on save
- Fix ESLint issues on save
- Enable Tailwind CSS IntelliSense
- Provide proper TypeScript support

## Configuration Files

- `eslint.config.mjs` - ESLint configuration using flat config format
- `.vscode/settings.json` - VS Code workspace settings
- `tsconfig.json` - TypeScript configuration
