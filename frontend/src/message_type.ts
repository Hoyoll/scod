// import type { MAction, MTable } from "./meta"

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
    // | {
    //     tag: "INPUT", payload:
    //     | {
    //         tag: "SHELL", payload: string
    //     }
    //     | {
    //         tag: "PATH", payload: string
    //     }
    // }
    // | {
    //     tag: "OUTPUT", payload: string
    // }
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
                line: number,
                column: number
            }
        }
        | {
            tag: "SAVE", payload: {
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
    }
    | {
        tag: "COMMAND", payload: string,
    }
    | {
        tag: "ALIAS", payload: string
    }
    | {
        tag: "LOCAL", payload: Local
    }

export type Local =
    // {
    //     action: "FOCUS", for: Widget
    // }
    | {
        action: "CLOSE", for: Widget
    }
    | {
        action: "META", for: MAction
    }
// | {
//     action: "COMMAND", for: string
// }
// | {
//     action: "LOAD_ALIAS", for: string
// }

export type Widget = "EDITOR" | "COMMAND"

export type Channel = (message: Message) => void

export type Port = {
    [key: string]: (data: any) => void
}

// export const Meta: MTable = {}
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
}

export function send(message: Message) {
    window.ipc.postMessage(JSON.stringify(message))
}