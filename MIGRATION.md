# Migration Guide: Setting up beam.host with Shadcn/Tailwind/React

The components I've integrated (`AuroraBackground` and `Demo`) are built for a modern React environment. Your current codebase is a vanilla Express app. To use these components, follow these steps to bootstrap a modern frontend.

## 1. Bootstrap a Modern Frontend
I recommend using **Next.js** for the best developer experience with Shadcn.

Run this in your terminal (outside the `server` or `public` folders):
```bash
npx create-next-app@latest frontend --typescript --tailwind --eslint
```
*Select "Yes" for `src/` directory and "Yes" for App Router.*

## 2. Initialize Shadcn UI
Navigate to your new `frontend` folder and run:
```bash
npx shadcn-ui@latest init
```
*When prompted for the component path, use `components` (or `src/components`).*

## 3. Install Component Dependencies
The Aurora Background component requires `framer-motion`:
```bash
npm install framer-motion clsx tailwind-merge
```

## 4. Move Integrated Files
I've already created these files in your current directory. You should move them into your new `frontend` project:
- Move `lib/utils.ts` to `frontend/lib/utils.ts`
- Move `components/ui/aurora-background.tsx` to `frontend/components/ui/aurora-background.tsx`
- Move `components/demo.tsx` to `frontend/components/demo.tsx`

## 5. Update Tailwind Config
Copy the `tailwind.config.js` I created (or the `extend` section) into your `frontend/tailwind.config.js`. This includes:
- The `aurora` animation and keyframes.
- The `addVariablesForColors` plugin for global CSS variables.

## 6. Use the Component
In your Next.js `page.tsx`, you can now import and use the demo:
```tsx
import { AuroraBackgroundDemo } from "@/components/demo";

export default function Home() {
  return (
    <main>
      <AuroraBackgroundDemo />
    </main>
  );
}
```

## Why this structure?
- **@/lib/utils**: This is where the `cn` helper lives. It combines `clsx` and `tailwind-merge` to handle conditional classes cleaner than standard template strings.
- **components/ui**: Shadcn follows an "atomic" design where base components live in `ui/` and feature-specific components live in `components/`.
