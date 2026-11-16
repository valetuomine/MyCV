# Effects

Part of the `setup-frontend` skill. Read it before writing a `useEffect`, together with the `react-useeffect` skill, which holds the anti-patterns and their fixes from React's "You Might Not Need an Effect" guide. `eslint-plugin-react-you-might-not-need-an-effect` warns about the typical unnecessary effects (`reactYouMightNotNeedAnEffect/*` rules in `eslint.config.js`): fix a warning by removing the effect, never by silencing the rule.

Where that skill differs from the rules below, these project rules win: it accepts fetching in an effect and uses `//` comments in its examples, while this project fetches with RTK Query and comments with JSDoc only. The same goes for its mentions of React Query and SWR, which the project does not use.

- Treat `useEffect` as the last resort, used only to synchronize with something outside React: browser APIs (`document.title`, `<html>` attributes, timers), MSAL, or router state that has to change after render. Before writing one, reach for the simpler tool:
  - Derive values during render. `useMemo` is fine when a value is costly or must keep its identity, such as mapped form values passed to React Hook Form's `values`.
  - Run logic caused by a user action in that action's event handler.
  - Render `<Navigate replace>` when the destination follows from current state, instead of calling `navigate()` from an effect.
  - Read one-shot values, such as session-storage markers, in a `useState` initializer.
  - Fetch with RTK Query, never from an effect. The one exception is `useProfilePdfLoad`, which fetches a whole PDF only to learn when it is ready: RTK Query would keep the file in the store and doesn't cancel the request when the component goes away.
  - Reset a component's state for a different entity with a `key`.
  - Read the latest props or state inside an effect without making them dependencies with `useEffectEvent` (React 19.2+): wrap the logic that must see fresh values in an Effect Event and call it only from inside effects. Use it only for logic the effect fires, never to hide a real dependency.
  - Set app-wide state, such as the MSAL active account, once in its module (`src/auth/entraAuth.ts`) rather than from each route.

  Keep the effect when the alternative would be harder to follow, for example a timer that must be cancelled on unmount. Do not add refs or extra handlers only to avoid one. Every effect that subscribes or starts something returns its cleanup. Never silence a `react-hooks` lint rule to keep an effect.
