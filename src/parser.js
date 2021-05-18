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

function parseExpressionStatement(node) {
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
      const result = parseExpressionStatement(node)
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
        }
      }

      if (shouldExecuteIfBlock) {
        const { consequent } = node
        if (consequent.type === "BlockStatement") {
          if (consequent.body.length !== 0) {
            if (consequent.body[0].type === "ExpressionStatement") {
              const result = parseExpressionStatement(consequent.body[0])
              if (result !== null) {
                actions.push(result)
              }
            }
          }
        } else if (consequent.type === "ExpressionStatement") {
          const result = parseExpressionStatement(consequent)
          if (result !== null) {
            actions.push(result)
          }
        }
      }
    }
  }

  return actions
}
