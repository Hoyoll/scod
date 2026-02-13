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

export type Meta =
    /// Perform Write operation, basically (p)ushing (e)dit the file
    | { action: "pe" }
    /// Closing the buffer
    | { action: "bc" }
    /// to for To. :to 1 is how you use it. it basically move cursor to that line 
    | {
        action: "to",
        arg: number
    }
    /// jump the cursor into the relative position with your arg
    /// like :jm 10 or :jm -10
    | {
        action: "jm",
        arg: number
    }
    /// (W)atch the (f)ile for any change and refresh the buffer with that change
    /// still not implemented. idk if want to honestly...
    | {
        action: "wf"
    }

export type Widget = "EDITOR" | "COMMAND"

export type Channel = (message: Message) => void

export type Buff = {
    active_buffer: [{
        path: string,
        cursor: {
            line: number,
            column: number
        }
        watched: boolean,
    }]
}

export function send(message: Message) {
    window.ipc.postMessage(JSON.stringify(message))
}