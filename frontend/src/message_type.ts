/// Freeze! this shit is freezed. And will not be updated more than this!

import type { editor } from "monaco-editor"

export type WindowP = "READY" | "ZOOMIN" | "ZOOMOUT" | "CLOSE"

export type PortP = {
    key: string,
    data: any
}

export type ModuleP = {
    key: string,
    data: string
}

export type BufferP =
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
        tag: "PEEK", payload: {
            receiver: string
            payload: {
                path: string,
                value: string
            }
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

export type CursorP =
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

export type Message =
    | {
        tag: "WINDOW", payload: WindowP

    }
    /// routed for local stuff
    | {
        tag: "PORT", payload: PortP
    }
    /// routed for backend stuff
    | {
        tag: "MODULE", payload: ModuleP
    }
    | {
        tag: "BUFFER", payload: BufferP
    }
    | {
        tag: "CURSOR", payload: CursorP
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

// export type Alias = {
//     meta: MTable,
//     port: Port
//     widget: editor.IOverlayWidget | null
//     onload: ((current_editor: editor.IStandaloneCodeEditor) => void) | null
// }

export interface Alias {
    key(): string
    call(data: any): void
    widget(): HTMLElement | null
}


export function send(message: Message) {
    window.ipc.postMessage(JSON.stringify(message))
}