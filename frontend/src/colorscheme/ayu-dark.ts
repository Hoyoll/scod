import { editor } from "monaco-editor";
import type { Alias, Channel } from "../message_type";

export function setup(channel: Channel): Alias {
    return {
        meta: {
            "theme": {
                desc: "change theme",
                proc: (color_scheme: string) => {
                    return () => {
                        if (color_scheme) {
                            channel({
                                tag: "PORT", payload: {
                                    key: "CHANGE_THEME",
                                    data: color_scheme
                                }
                            })
                        }

                    }
                }
            }
        },
        port: {
            "CHANGE_THEME": (color_scheme: string, ed) => {

                ed.updateOptions({ theme: color_scheme })
            }
        },
        widget: null,
        onload: () => {
            editor.defineTheme("ayu-dark", ayu_dark())
            editor.defineTheme("monokai", monokai())
            channel({
                tag: "PORT", payload: {
                    key: "CHANGE_THEME", data: "ayu-dark"
                }
            })
        }
    }
}


function monokai(): editor.IStandaloneThemeData {
    return {
        "base": 'hc-light',
        "inherit": true,
        "rules": [
            {
                "token": "keyword",
                "foreground": "fa8532",
                "fontStyle": "normal"
            },
            {
                "token": "string",
                "foreground": "aad94c",
                "fontStyle": "normal"
            },
            {
                "token": "variable",
                "foreground": "59c2ff",
                "fontStyle": "normal"
            },
            {
                "token": "number",
                "foreground": "d2a6ff",
                "fontStyle": "normal"
            }
        ],
        "colors": {
            "editor.background": "#152443",
            "editor.foreground": "#a2d2ed",
            "editorLineNumber.foreground": "#5a6378a6",
            "editorLineNumber.activeForeground": "#5a6378",
            "editorCursor.foreground": "#e6b450",
            "editor.inactiveSelectionBackground": "#80b5ff26",
            "editor.selectionBackground": "#3388ff40",
            "editor.wordHighlightBackground": "#73b8ff14",
            "editor.wordHighlightStrongBackground": "#70bf5614",
            "editor.wordHighlightBorder": "#73b8ff80",
            "editor.wordHighlightStrongBorder": "#70bf5680",
            "editor.findMatchBackground": "#4c4126",
            "editor.findMatchHighlightBackground": "#4c412680",
            "editor.rangeHighlightBackground": "#4c412633",
            "editor.lineHighlightBackground": "#161a24"
        }
    }
}

function ayu_dark(): editor.IStandaloneThemeData {
    return {
        "base": "vs-dark",
        "inherit": true,
        "rules": [
            {
                "token": "keyword",
                "foreground": "fa8532",
                "fontStyle": "normal"
            },
            {
                "token": "string",
                "foreground": "aad94c",
                "fontStyle": "normal"
            },
            {
                "token": "variable",
                "foreground": "59c2ff",
                "fontStyle": "normal"
            },
            {
                "token": "number",
                "foreground": "d2a6ff",
                "fontStyle": "normal"
            }
        ],
        "colors": {
            "editor.background": "#10141C",
            "editor.foreground": "#bfbdb6",
            "editorLineNumber.foreground": "#5a6378a6",
            "editorLineNumber.activeForeground": "#5a6378",
            "editorCursor.foreground": "#e6b450",
            "editor.inactiveSelectionBackground": "#80b5ff26",
            "editor.selectionBackground": "#3388ff40",
            "editor.wordHighlightBackground": "#73b8ff14",
            "editor.wordHighlightStrongBackground": "#70bf5614",
            "editor.wordHighlightBorder": "#73b8ff80",
            "editor.wordHighlightStrongBorder": "#70bf5680",
            "editor.findMatchBackground": "#4c4126",
            "editor.findMatchHighlightBackground": "#4c412680",
            "editor.rangeHighlightBackground": "#4c412633",
            "editor.lineHighlightBackground": "#161a24"
        }
    }
}