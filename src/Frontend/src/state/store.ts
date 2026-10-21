import { configureStore } from "@reduxjs/toolkit"
import { baseApi } from "../api/baseApi"

/** The Redux store, holding the RTK Query cache and its middleware. */
export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware),
})
