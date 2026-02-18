/**
 * SQL string normalization: collapse whitespace, trim, strip semicolons.
 */

import type { Trim, CollapseWhitespace, StripSemicolon } from './utils';

/** Normalize a SQL string for parsing: lowercase, collapse whitespace, trim, strip trailing semicolon */
export type Normalize<S extends string> = StripSemicolon<Trim<CollapseWhitespace<Lowercase<S>>>>;
