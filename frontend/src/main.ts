import { editor, Uri } from 'monaco-editor';
import { Editor } from './editor';
import nightowl from "./night-owl.json";
import './style.css';

let text = ``

let doc = document.querySelector<HTMLDivElement>('#app')!
// let widget = new Command()
// setup_highlighter()
editor.createModel(text, "md", Uri.file("src/rust.rs"))
// editor.createModel(text, "md", Uri.file("/src/rust.rs"))

editor.getModels().forEach((model) => {
  // model.setValue("")
  // let [first, ...rest] = model.uri.path
  // console.log(rest.join("").trim())
})

// let model = editor.getModel(Uri.parse("scod://rust.rs"))!;
// model.dispose()
// let last_line = model.getLineCount();
// let last_column = model.getLineMaxColumn(last_line);
// // const PREFIX = '\n';
// model.pushEditOperations(null, [{
//   range: {
//     startLineNumber: last_line,
//     startColumn: last_column,
//     endLineNumber: last_line,
//     endColumn: last_column
//   },
//   text: "Hello"
// }], () => null)

editor.defineTheme("nightowl", {
  base: 'hc-black',
  inherit: nightowl.inherit,
  rules: nightowl.rules,
  colors: nightowl.colors
})

let edit = new Editor(doc)
window.Editor = edit

// editor.setTheme("nightowl")

// editor.addCommand({
//   id: 'zoom-in',
//   run: () => {
//     let msg: Message = {
//       type: "ZOOM", payload: {
//         for: "IN"
//       }
//     }
//     send(msg)
//   }
// })

// editor.addKeybindingRule({
//   keybinding: KeyMod.CtrlCmd | KeyCode.Equal,
//   command: "zoom-in",
// })

// editor.addCommand({
//   id: 'zoom-out',
//   run: () => {
//     let msg: Message = {
//       type: "ZOOM", payload: {
//         for: "OUT"
//       }
//     }
//     send(msg)
//   }
// })


// editor.addKeybindingRule({
//   keybinding: KeyMod.CtrlCmd | KeyCode.Minus,
//   command: "zoom-out",
// })

// let edit = editor.create(doc, {
//   value: undefined,
//   language: undefined,
//   automaticLayout: true,
//   lineNumbers: "relative",
//   minimap: { enabled: false },
//   overviewRulerLanes: 0,
//   overviewRulerBorder: false,
//   theme: "nightowl",
//   renderLineHighlight: 'none',
//   selectionHighlight: false,
//   occurrencesHighlight: "off",
//   mouseWheelZoom: true,
//   fontFamily: 'Fira Code',
//   fontLigatures: true,
//   wordWrap: "off",
//   scrollbar: {
//     verticalScrollbarSize: 0,
//     horizontalScrollbarSize: 0,
//   },
//   stickyScroll: {
//     enabled: false
//   },
//   renderWhitespace: "none",
//   lineNumbersMinChars: 2,
//   guides: {
//     bracketPairs: false,
//     highlightActiveBracketPair: false,
//     highlightActiveIndentation: false,
//     indentation: false
//   }
// })
// edit.addOverlayWidget(widget)
// edit.setModel(editor.getModel(Uri.parse("scod://rust.rs")))
// edit.focus()
// edit.getDomNode()?.blur()
// window.ipc.postMessage(JSON.stringify())
