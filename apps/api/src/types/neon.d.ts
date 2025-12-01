declare module "@neondatabase/serverless" {
  /**
   * Minimal type declaration for the Neon serverless client.
   * This is enough for our usage and can be replaced by the official
   * types once the dependency is installed.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function neon(
    connectionString: string
  ): <TRow = any>(
    strings: TemplateStringsArray,
    ...params: unknown[]
  ) => Promise<TRow[]>;
}


