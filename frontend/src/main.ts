import { editor } from 'monaco-editor';

import { Editor } from './editor';
import "./night-owl.json";
import nightowl from "./night-owl.json";
import './style.css';


// self.MonacoEnvironment = {
//   getWorker(_, label) {
//     switch (label) {
//       case "rust":
//         return new rustworker()

//       default:
//         return new editorWorker()
//     }
//   }
// }
// setup_worker()
let doc = document.querySelector<HTMLDivElement>('#app')!
editor.defineTheme("nightowl", {
  base: 'hc-black',
  inherit: nightowl.inherit,
  rules: nightowl.rules,
  colors: nightowl.colors
})

let edit = new Editor(doc)
window.Editor = edit