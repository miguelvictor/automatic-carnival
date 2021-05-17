import { parse as acornParse } from "acorn"
import { PreviewController } from "./controller"
import { WEBGL } from "./warning"

let _previewController = null
window.addEventListener("DOMContentLoaded", () => {
  // setup code AST parsing
  const codeEditor = document.getElementById("code-editor")
  const btnRunCode = document.getElementById("btn-run-code")
  btnRunCode.addEventListener("click", () => {
    try {
      const jsCode = codeEditor.value
      const ast = acornParse(jsCode, { ecmaVersion: 2020 })
    } catch (e) {
      alert("invalid javascript code")
    }
  })

  // webGL support detection
  if (!WEBGL.isWebGLAvailable()) {
    const warning = WEBGL.getWebGLErrorMessage()
    document.getElementById("container").appendChild(warning)
  } else {
    _previewController = new PreviewController()
    _previewController.render()
  }
})
