/// Freeze! this shit is freezed. And will not be updated more than this!

import type { editor } from "monaco-editor"

export type Message =
    | {
        tag: "WINDOW", payload:
        | {
            tag: "READY" | "ZOOMIN" | "ZOOMOUT" | "CLOSE"
        }
    }
    /// routed for local stuff
    | {
        tag: "PORT", payload: {
            key: string,
            data: any
        }
    }
    /// routed for backend stuff
    | {
        tag: "MODULE", payload: {
            key: string,
            data: string
        }
    }
    | {
        tag: "BUFFER", payload:
        | {
            tag: "NEW", payload: {
                buffer: string
                path: string,
                ext: string
            }
        }
        | {
            tag: "EDIT", payload: {
                text: string,
                path: string,
                /// IF you give it 0! it will default the LAST possible number of said line/column
                line: {
                    start: number,
                    end: number
                },
                column: {
                    start: number,
                    end: number
                }
            }
        }
        | {
            tag: "WRITE", payload: {
                buffer: string,
                path: string
            }
        }
        | {
            tag: "OPEN", payload: string
        }
        | {
            tag: "STATUS", payload: {
                tag: "OK" | "ERR", payload: string
            }
        }
        | {
            tag: "FOCUS"
        }
        | {
            tag: "CLOSE"
        }
        | {
            tag: "SAVE", payload:
            | {
                for: "CURRENT"
            }
            | {
                for: "PATH", path: string
            }
        }
    }
    | {
        tag: "CURSOR", payload:
        | {
            /// shifting it around for n 
            tag: "MOVE", payload: {
                line: number
                column: number
            }
        }
        | {
            /// moving around, jumping to n
            tag: "JUMP", payload: {
                line: number,
                column: number
            }
        }
        | {
            tag: "SELECT", payload: {
                line: {
                    start: number,
                    end: number
                },
                column: {
                    start: number,
                    end: number
                }
            }
        }
        | {
            /// it will just assume you want to insert in the cursor position
            tag: "INSERT", payload: string
        }
    }
    | {
        tag: "COMMAND", payload: string,
    }
    | {
        tag: "ALIAS", payload: string
    }

export type Channel = (message: Message) => void

export type Port = {
    [key: string]: (data: any, current_editor: editor.IStandaloneCodeEditor) => void
}

export type MAction = () => void

export type MTable = {
    [key: string]: {
        desc: string,
        proc: ((args: string) => MAction)
    }
}

export type Alias = {
    meta: MTable,
    port: Port
    widget: editor.IOverlayWidget | null
    onload: ((current_editor: editor.IStandaloneCodeEditor) => void) | null
}


export function send(message: Message) {
    window.ipc.postMessage(JSON.stringify(message))
}