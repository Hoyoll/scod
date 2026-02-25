import { editor } from "monaco-editor"
import type { Channel } from "./message_type"
export const Meta: MTable = {
    "pe": () => {
        return (editor: editor.IStandaloneCodeEditor, channel: Channel) => {
            let model = editor.getModel()
            if (!model) {
                return
            }
            let [_, ...path] = model.uri.path
            channel({
                tag: "BUFFER", payload: {
                    tag: "EDIT", payload: {
                        buffer: model.getValue(),
                        path: path.join("").trim()
                    }
                }
            })
        }
    },
    "bc": () => {
        return (_, channel: Channel) => {
            channel({
                tag: "LOCAL", payload: {
                    for: "EDITOR", action: "CLOSE"
                }
            })
        }
    },
    "to": (arg: string) => {
        let count = parseInt(arg)
        return (editor: editor.IStandaloneCodeEditor) => {
            let pos = editor.getPosition()!
            editor.setPosition({
                lineNumber: count,
                column: pos.column
            })
            editor.revealPosition({
                lineNumber: count,
                column: pos.column
            })
        }
    },
    "jm": (arg: string) => {
        let count = parseInt(arg)

        return (editor: editor.IStandaloneCodeEditor) => {
            let p = editor.getPosition()!
            let new_pos = p.lineNumber + count;
            editor.setPosition({
                lineNumber: new_pos,
                column: p.column
            })
            editor.revealPosition({
                lineNumber: new_pos,
                column: p.column
            })
        }
    }
}

export type MCommand =
    | "pe"
    | "bc"
    | "to"
    | "jm"

export type MAction = (editor: editor.IStandaloneCodeEditor, channel: Channel) => void

export type MTable = {
    [key in MCommand]:
    ((args: string) => MAction)
}