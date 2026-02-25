/**
 * AST node types for the CDP SQL query builder.
 *
 * All nodes are plain readonly objects with a `kind` discriminant.
 * The compiler pattern-matches on `kind` to generate SQL.
 */

// ── Expression nodes ─────────────────────────────────────────────────────────

export interface ColumnNode {
  readonly kind: 'Column'
  readonly table?: string
  readonly name: string
}

export interface StarNode {
  readonly kind: 'Star'
  readonly table?: string
}

export interface ValueNode {
  readonly kind: 'Value'
  readonly value: string | number | boolean | null
}

export interface RawNode {
  readonly kind: 'Raw'
  readonly sql: string
}

export interface MapAccessNode {
  readonly kind: 'MapAccess'
  readonly column: AstNode
  readonly key: string
}

export interface ArrayIndexNode {
  readonly kind: 'ArrayIndex'
  readonly array: AstNode
  readonly index: number
}

export interface FunctionCallNode {
  readonly kind: 'FunctionCall'
  readonly name: string
  readonly args: readonly AstNode[]
}

export interface CastNode {
  readonly kind: 'Cast'
  readonly expr: AstNode
  readonly targetType: string
  readonly doubleColon: boolean
}

export interface BinaryOpNode {
  readonly kind: 'BinaryOp'
  readonly left: AstNode
  readonly op: string
  readonly right: AstNode
}

export interface AndNode {
  readonly kind: 'And'
  readonly conditions: readonly AstNode[]
}

export interface OrNode {
  readonly kind: 'Or'
  readonly conditions: readonly AstNode[]
}

export interface NotNode {
  readonly kind: 'Not'
  readonly expr: AstNode
}

export interface BetweenNode {
  readonly kind: 'Between'
  readonly expr: AstNode
  readonly low: AstNode
  readonly high: AstNode
}

export interface InNode {
  readonly kind: 'In'
  readonly expr: AstNode
  readonly values: readonly AstNode[]
  readonly negated: boolean
}

export interface IsNullNode {
  readonly kind: 'IsNull'
  readonly expr: AstNode
  readonly negated: boolean
}

export interface ParensNode {
  readonly kind: 'Parens'
  readonly expr: AstNode
}

// ── Structural nodes ─────────────────────────────────────────────────────────

export interface AliasNode {
  readonly kind: 'Alias'
  readonly expr: AstNode
  readonly alias: string
}

export interface TableNode {
  readonly kind: 'Table'
  readonly name: string
  readonly alias?: string
}

export interface JoinNode {
  readonly kind: 'Join'
  readonly type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS'
  readonly table: TableNode
  readonly on?: AstNode
}

export interface OrderByItemNode {
  readonly kind: 'OrderByItem'
  readonly expr: AstNode
  readonly direction?: 'ASC' | 'DESC'
}

export interface CteNode {
  readonly kind: 'Cte'
  readonly name: string
  readonly query: SelectQueryNode
}

// ── Query node ───────────────────────────────────────────────────────────────

export interface SelectQueryNode {
  readonly kind: 'SelectQuery'
  readonly ctes: readonly CteNode[]
  readonly distinct: boolean
  readonly selections: readonly AstNode[]
  readonly from: TableNode
  readonly joins: readonly JoinNode[]
  readonly where: readonly AstNode[]      // implicitly ANDed
  readonly groupBy: readonly AstNode[]
  readonly having: readonly AstNode[]     // implicitly ANDed
  readonly orderBy: readonly OrderByItemNode[]
  readonly limit?: number
}

// ── Union type ───────────────────────────────────────────────────────────────

export type AstNode =
  | ColumnNode
  | StarNode
  | ValueNode
  | RawNode
  | MapAccessNode
  | ArrayIndexNode
  | FunctionCallNode
  | CastNode
  | BinaryOpNode
  | AndNode
  | OrNode
  | NotNode
  | BetweenNode
  | InNode
  | IsNullNode
  | ParensNode
  | AliasNode
  | TableNode
  | JoinNode
  | OrderByItemNode
  | CteNode
  | SelectQueryNode
