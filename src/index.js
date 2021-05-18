import { parseJs } from "./parser"
import { init, animate, syncEvents } from "./controller"
import { WEBGL } from "./warning"

window.addEventListener("DOMContentLoaded", () => {
  // setup code AST parsing
  const codeEditor = document.getElementById("code-editor")
  const btnRunCode = document.getElementById("btn-run-code")
  btnRunCode.addEventListener("click", () => {
    try {
      const jsCode = codeEditor.value
      const state = parseJs(jsCode)
      syncEvents(state)
    } catch (e) {
      console.error(e)
      alert("invalid javascript code")
    }
  })

  // webGL support detection
  if (!WEBGL.isWebGLAvailable()) {
    const warning = WEBGL.getWebGLErrorMessage()
    document.getElementById("container").appendChild(warning)
  } else {
    init()
    animate()
  }
})
