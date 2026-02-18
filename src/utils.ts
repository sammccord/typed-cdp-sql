/**
 * Low-level template literal type utilities for SQL string parsing.
 */

/** Whitespace characters */
type WhitespaceChar = ' ' | '\n' | '\t' | '\r';

/** Trim leading whitespace */
type TrimStart<S extends string> =
  S extends `${WhitespaceChar}${infer R}` ? TrimStart<R> : S;

/** Trim trailing whitespace */
type TrimEnd<S extends string> =
  S extends `${infer R}${WhitespaceChar}` ? TrimEnd<R> : S;

/** Trim both ends */
export type Trim<S extends string> = TrimStart<TrimEnd<S>>;

/** Collapse multiple whitespace characters into single spaces */
export type CollapseWhitespace<S extends string> =
  S extends `${infer A}\n${infer B}` ? CollapseWhitespace<`${A} ${B}`> :
  S extends `${infer A}\r${infer B}` ? CollapseWhitespace<`${A} ${B}`> :
  S extends `${infer A}\t${infer B}` ? CollapseWhitespace<`${A} ${B}`> :
  S extends `${infer A}  ${infer B}` ? CollapseWhitespace<`${A} ${B}`> :
  S;

/**
 * Split a string by commas, respecting parentheses and bracket depth.
 * "a, b, c" → ["a", "b", "c"]
 * "cast(x as y), b" → ["cast(x as y)", "b"]
 * "parameters['from'], b" → ["parameters['from']", "b"]
 */
export type SplitByComma<
  S extends string,
  Depth extends 0[] = [],
  Current extends string = '',
  Result extends string[] = []
> =
  S extends `${infer Char}${infer Rest}`
    ? Char extends '(' | '['
      ? SplitByComma<Rest, [...Depth, 0], `${Current}${Char}`, Result>
      : Char extends ')' | ']'
        ? SplitByComma<Rest, Depth extends [0, ...infer D extends 0[]] ? D : [], `${Current}${Char}`, Result>
        : Char extends ','
          ? Depth['length'] extends 0
            ? SplitByComma<Rest, [], '', [...Result, Trim<Current>]>
            : SplitByComma<Rest, Depth, `${Current}${Char}`, Result>
          : SplitByComma<Rest, Depth, `${Current}${Char}`, Result>
    : Current extends ''
      ? Result
      : [...Result, Trim<Current>];

/** Strip a trailing semicolon if present */
export type StripSemicolon<S extends string> =
  S extends `${infer R};` ? Trim<R> : S;
