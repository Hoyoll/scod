export type Message =
    | {
        tag: "WINDOW", payload:
        | {
            tag: "READY" | "ZOOMIN" | "ZOOMOUT" | "CLOSE"
        }
    }
    | {
        tag: "INPUT", payload:
        | {
            tag: "SHELL", payload: string
        }
        | {
            tag: "PATH", payload: string
        }
    }
    | {
        tag: "OUTPUT", payload: {
            id: number,
            out: {
                tag: "ERROR" | "OK", payload: string
            }

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
                buffer: string,
                path: string
            }
        }
        | {
            tag: "ERROR", payload: string
        }
    }
    | {
        tag: "LOCAL", payload: Local
    }

export type Local =
    {
        action: "FOCUS", for: Widget
    }
    | {
        action: "CLOSE", for: Widget
    }
    | {
        action: "META", for: Meta
    }

export type Meta = "sb" | "cb"

export type Widget = "EDITOR" | "COMMAND" | "SHELL"

export type Channel = (message: Message) => void

export function send(message: Message) {
    window.ipc.postMessage(JSON.stringify(message))
}