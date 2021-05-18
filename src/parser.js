import { parse as acornParse } from "acorn"
import { simple as walk } from "acorn-walk"

const funcToAnim = {
  jump: "Jump",
  yes: "Yes",
  no: "No",
  wave: "Wave",
  punch: "Punch",
  thumbsup: "ThumbsUp",
}

function parseExpressionStatement(node, identifiers) {
  const validFunctions = Object.keys(funcToAnim)
  const { expression } = node
  const { callee, arguments: args } = expression
  let action = null

  if (validFunctions.includes(callee.name)) {
    let count = 1
    if (args.length > 0) {
      if (args[0].type === "Literal") {
        const value = args[0].value
        count = value > 0 ? value : 1
      } else if (args[0].type === "Identifier") {
        const name = args[0].name
        count = identifiers.hasOwnProperty(name) ? identifiers[name] : 1
      }
    }

    console.log(`new action: ${{ action: funcToAnim[callee.name], count }}`)
    action = { action: funcToAnim[callee.name], count }
  }

  return action
}

export function parseJs(src) {
  const ast = acornParse(src, { ecmaVersion: 2020 })
  const identifiers = {}
  const actions = []

  // empty code
  if (ast.body.length === 0) {
    return []
  }

  for (const node of ast.body) {
    console.log(node)
    const { type } = node

    if (type === "VariableDeclaration") {
      if (node.declarations.length !== 0) {
        const key = node.declarations[0].id.name
        const value = node.declarations[0].init.value
        identifiers[key] = value
      }
    } else if (type === "ExpressionStatement") {
      const result = parseExpressionStatement(node, identifiers)
      if (result !== null) {
        actions.push(result)
      }
    } else if (type === "IfStatement") {
      const { test } = node
      let shouldExecuteIfBlock = false

      if (test.type === "Literal") {
        shouldExecuteIfBlock = !!test.value
      } else if (test.type === "BinaryExpression") {
        const left =
          test.left.type === "Identifier"
            ? identifiers[test.left.name]
            : test.left.type === "Literal"
            ? test.left.value
            : 0
        const right =
          test.right.type === "Identifier"
            ? identifiers[test.right.name]
            : test.right.type === "Literal"
            ? test.right.value
            : 0

        if (test.operator === "==" || test.operator === "===") {
          shouldExecuteIfBlock = left === right
        } else if (test.operator === "!=" || test.operator === "!==") {
          shouldExecuteIfBlock = left !== right
        } else if (test.operator === ">") {
          shouldExecuteIfBlock = left > right
        } else if (test.operator === ">=") {
          shouldExecuteIfBlock = left >= right
        } else if (test.operator === "<") {
          shouldExecuteIfBlock = left < right
        } else if (test.operator === "<=") {
          shouldExecuteIfBlock = left <= right
        }
      }

      if (shouldExecuteIfBlock) {
        const { consequent } = node
        if (consequent.type === "BlockStatement") {
          if (consequent.body.length !== 0) {
            for (const stmt of consequent.body) {
              if (stmt.type === "ExpressionStatement") {
                const result = parseExpressionStatement(stmt, identifiers)
                if (result !== null) {
                  actions.push(result)
                }
              }
            }
          }
        } else if (consequent.type === "ExpressionStatement") {
          const result = parseExpressionStatement(consequent, identifiers)
          if (result !== null) {
            actions.push(result)
          }
        }
      }
    }
  }

  return actions
}
