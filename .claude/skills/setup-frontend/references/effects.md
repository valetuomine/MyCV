# Effects

Part of the `setup-frontend` skill. Read it before writing a `useEffect`.

- Treat `useEffect` as the last resort, used only to synchronize with something outside React: browser APIs (`document.title`, `<html>` attributes, timers), MSAL, or router state that has to change after render. Before writing one, reach for the simpler tool:
  - Derive values during render. `useMemo` is fine when a value is costly or must keep its identity, such as mapped form values passed to React Hook Form's `values`.
  - Run logic caused by a user action in that action's event handler.
  - Render `<Navigate replace>` when the destination follows from current state, instead of calling `navigate()` from an effect.
  - Read one-shot values, such as session-storage markers, in a `useState` initializer.
  - Fetch with RTK Query, never from an effect.
  - Reset a component's state for a different entity with a `key`.
  - Set app-wide state, such as the MSAL active account, once in its module (`src/auth/entraAuth.ts`) rather than from each route.

  Keep the effect when the alternative would be harder to follow, for example a timer that must be cancelled on unmount. Do not add refs or extra handlers only to avoid one. Every effect that subscribes or starts something returns its cleanup. Never silence a `react-hooks` lint rule to keep an effect.
