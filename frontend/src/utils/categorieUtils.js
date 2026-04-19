/**
 * Flattens a category tree into a sorted list with level info for rendering indented selects.
 * @param {Array} nodes - Array of category nodes, each with { id, nome, figli? }
 * @param {number} livello - Current depth level (0 = root)
 * @returns {Array<{ id, nome, level }>}
 */
export function flattenCategorieTree(nodes, livello = 0) {
  const result = []
  for (const node of nodes) {
    result.push({ id: node.id, nome: node.nome, level: livello })
    if (node.figli && node.figli.length > 0) {
      result.push(...flattenCategorieTree(node.figli, livello + 1))
    }
  }
  return result
}
