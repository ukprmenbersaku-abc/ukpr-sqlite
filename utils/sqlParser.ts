export interface JoinRelation {
  leftTable: string;
  rightTable: string;
  joinType: string; // 'INNER JOIN', 'LEFT JOIN', 'JOIN', etc.
  onCondition?: string; // e.g. 'users.id = orders.user_id'
}

export interface JoinAnalysisResult {
  tables: string[];
  joins: JoinRelation[];
}

export function parseSqlJoins(sql: string): JoinAnalysisResult {
  const result: JoinAnalysisResult = {
    tables: [],
    joins: []
  };

  if (!sql) return result;

  // Normalize spaces and remove comments
  const cleanSql = sql
    .replace(/--.*$/gm, '') // inline comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // multi-line comments
    .replace(/\s+/g, ' ')
    .trim();

  const fromRegex = /\bFROM\s+([a-zA-Z0-9_."'`]+)/i;
  const fromMatch = cleanSql.match(fromRegex);
  if (!fromMatch) return result;

  const mainTable = fromMatch[1].replace(/["'`]/g, '');
  result.tables.push(mainTable);

  const regex = /\b((?:LEFT\s+(?:OUTER\s+)?|RIGHT\s+(?:OUTER\s+)?|INNER\s+|CROSS\s+|FULL\s+(?:OUTER\s+)?)?JOIN)\s+([a-zA-Z0-9_."'`]+)(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?\b/gi;
  
  let match;
  while ((match = regex.exec(cleanSql)) !== null) {
    const rawJoinType = match[1];
    const joinType = rawJoinType.toUpperCase().replace(/\s+/g, ' '); // Clean space sequence
    const tableName = match[2].replace(/["'`]/g, '');
    const alias = match[3];

    // Read characters after this match to find the "ON" condition
    const remainingClause = cleanSql.slice(regex.lastIndex);
    const onMatch = remainingClause.match(/^\s*ON\s+([\s\S]*?)(?=\bJOIN\b|\bLEFT\s+JOIN\b|\bRIGHT\s+JOIN\b|\bINNER\s+JOIN\b|\bFULL\s+JOIN\b|\bCROSS\s+JOIN\b|\bWHERE\b|\bGROUP\b|\bORDER\b|\bLIMIT\b|;|$)/i);
    const onCondition = onMatch ? onMatch[1].trim() : undefined;

    // Detect which table this joins WITH
    let leftTable = mainTable;
    if (result.tables.length > 0) {
      if (onCondition) {
        const refs = onCondition.match(/([a-zA-Z0-9_."'`]+)\.[a-zA-Z0-9_."'`]+/g);
        if (refs) {
          const matchedTables = refs.map(r => r.split('.')[0].replace(/["'`]/g, ''));
          // Look for table that is different from current table and alias
          const otherTable = matchedTables.find(t => 
            t.toLowerCase() !== tableName.toLowerCase() && 
            (!alias || t.toLowerCase() !== alias.toLowerCase())
          );
          if (otherTable) {
            // Check if there is an exact match in our loaded table history
            const known = result.tables.find(kt => kt.toLowerCase() === otherTable.toLowerCase());
            if (known) {
              leftTable = known;
            } else {
              leftTable = otherTable;
            }
          } else {
            leftTable = result.tables[result.tables.length - 1];
          }
        } else {
          leftTable = result.tables[result.tables.length - 1];
        }
      } else {
        leftTable = result.tables[result.tables.length - 1];
      }
    }

    if (!result.tables.includes(tableName)) {
      result.tables.push(tableName);
    }

    result.joins.push({
      leftTable,
      rightTable: tableName,
      joinType,
      onCondition
    });
  }

  return result;
}
