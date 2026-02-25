/**
 * Compiles AST nodes into ClickHouse-compatible SQL strings.
 */

import type {
  AstNode,
  SelectQueryNode,
  ColumnNode,
  StarNode,
  ValueNode,
  RawNode,
  MapAccessNode,
  ArrayIndexNode,
  FunctionCallNode,
  CastNode,
  BinaryOpNode,
  AndNode,
  OrNode,
  NotNode,
  BetweenNode,
  InNode,
  IsNullNode,
  ParensNode,
  AliasNode,
  TableNode,
  JoinNode,
  OrderByItemNode,
  CteNode,
} from './ast'

/** Compile a SelectQueryNode into a SQL string */
export function compileQuery(node: SelectQueryNode): string {
  const parts: string[] = []

  // WITH
  if (node.ctes.length > 0) {
    const ctes = node.ctes.map(compileCte)
    parts.push(`WITH ${ctes.join(', ')}`)
  }

  // SELECT [DISTINCT]
  const distinct = node.distinct ? 'SELECT DISTINCT' : 'SELECT'
  const selections = node.selections.map(compileNode).join(', ')
  parts.push(`${distinct} ${selections}`)

  // FROM
  parts.push(`FROM ${compileTable(node.from)}`)

  // JOINs
  for (const join of node.joins) {
    parts.push(compileJoin(join))
  }

  // WHERE
  if (node.where.length > 0) {
    const conditions = node.where.map(compileNode)
    parts.push(`WHERE ${conditions.join(' AND ')}`)
  }

  // GROUP BY
  if (node.groupBy.length > 0) {
    parts.push(`GROUP BY ${node.groupBy.map(compileNode).join(', ')}`)
  }

  // HAVING
  if (node.having.length > 0) {
    const conditions = node.having.map(compileNode)
    parts.push(`HAVING ${conditions.join(' AND ')}`)
  }

  // ORDER BY
  if (node.orderBy.length > 0) {
    parts.push(`ORDER BY ${node.orderBy.map(compileOrderByItem).join(', ')}`)
  }

  // LIMIT
  if (node.limit !== undefined) {
    parts.push(`LIMIT ${node.limit}`)
  }

  return parts.join(' ')
}

function compileNode(node: AstNode): string {
  switch (node.kind) {
    case 'Column':
      return compileColumn(node)
    case 'Star':
      return node.table ? `${node.table}.*` : '*'
    case 'Value':
      return compileValue(node)
    case 'Raw':
      return node.sql
    case 'MapAccess':
      return compileMapAccess(node)
    case 'ArrayIndex':
      return `${compileNode(node.array)}[${node.index}]`
    case 'FunctionCall':
      return compileFunctionCall(node)
    case 'Cast':
      return compileCast(node)
    case 'BinaryOp':
      return compileBinaryOp(node)
    case 'And':
      return compileAnd(node)
    case 'Or':
      return compileOr(node)
    case 'Not':
      return `NOT ${compileNode(node.expr)}`
    case 'Between':
      return compileBetween(node)
    case 'In':
      return compileIn(node)
    case 'IsNull':
      return `${compileNode(node.expr)} IS ${node.negated ? 'NOT ' : ''}NULL`
    case 'Parens':
      return `(${compileNode(node.expr)})`
    case 'Alias':
      return compileAlias(node)
    case 'Table':
      return compileTable(node)
    case 'SelectQuery':
      return `(${compileQuery(node)})`
    case 'OrderByItem':
      return compileOrderByItem(node)
    case 'Cte':
      return compileCte(node)
    case 'Join':
      return compileJoin(node)
  }
}

function compileColumn(node: ColumnNode): string {
  return node.table ? `${node.table}.${node.name}` : node.name
}

function compileValue(node: ValueNode): string {
  if (node.value === null) return 'NULL'
  if (typeof node.value === 'string') return `'${node.value}'`
  if (typeof node.value === 'boolean') return node.value ? 'true' : 'false'
  return String(node.value)
}

function compileMapAccess(node: MapAccessNode): string {
  return `${compileNode(node.column)}['${node.key}']`
}

function compileFunctionCall(node: FunctionCallNode): string {
  if (node.name === 'countDistinct') {
    return `count(DISTINCT ${node.args.map(compileNode).join(', ')})`
  }
  return `${node.name}(${node.args.map(compileNode).join(', ')})`
}

function compileCast(node: CastNode): string {
  if (node.doubleColon) {
    return `${compileNode(node.expr)}::${node.targetType}`
  }
  return `CAST(${compileNode(node.expr)} AS ${node.targetType})`
}

function compileBinaryOp(node: BinaryOpNode): string {
  return `${compileNode(node.left)} ${node.op} ${compileNode(node.right)}`
}

function compileAnd(node: AndNode): string {
  return node.conditions.map(compileNode).join(' AND ')
}

function compileOr(node: OrNode): string {
  return `(${node.conditions.map(compileNode).join(' OR ')})`
}

function compileBetween(node: BetweenNode): string {
  return `${compileNode(node.expr)} BETWEEN ${compileNode(node.low)} AND ${compileNode(node.high)}`
}

function compileIn(node: InNode): string {
  const neg = node.negated ? 'NOT IN' : 'IN'
  return `${compileNode(node.expr)} ${neg} (${node.values.map(compileNode).join(', ')})`
}

function compileAlias(node: AliasNode): string {
  return `${compileNode(node.expr)} AS ${node.alias}`
}

function compileTable(node: TableNode): string {
  if (node.alias) return `${node.name} AS ${node.alias}`
  return node.name
}

function compileJoin(node: JoinNode): string {
  const table = compileTable(node.table)
  const on = node.on ? ` ON ${compileNode(node.on)}` : ''
  return `${node.type} JOIN ${table}${on}`
}

function compileOrderByItem(node: OrderByItemNode): string {
  const dir = node.direction ? ` ${node.direction}` : ''
  return `${compileNode(node.expr)}${dir}`
}

function compileCte(node: CteNode): string {
  return `${node.name} AS (${compileQuery(node.query)})`
}
