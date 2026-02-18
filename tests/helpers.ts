/** Compile-time type assertion: Expect<true> compiles, Expect<false> errors */
export type Expect<T extends true> = T;

/** Check structural equality of two types */
export type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
