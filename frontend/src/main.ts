
import { Editor } from './editor';
// import "./night-owl.json";
import './style.css';

let doc = document.querySelector<HTMLDivElement>('#app')!
// editor.defineTheme("nightowl", {
//   base: 'hc-black',
//   inherit: nightowl.inherit,
//   rules: nightowl.rules,
//   colors: nightowl.colors
// })

let edit = new Editor(doc)
window.Editor = edit
edit.default()