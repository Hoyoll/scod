// import { html } from "lit-html";

import { editor } from "monaco-editor";
import type { Channel, Meta } from "./message_type";

type Cmd = "/" | "$" | ":"

type History = {
    path: {
        table: Set<string>,
        stack: string[],
        idx: number
    },
    shell: {
        table: Set<string>,
        stack: string[],
        idx: number
    },
    meta: {
        table: Set<string>,
        stack: string[],
        idx: number
    }
}

export class Command {
    private buffer: HTMLInputElement
    // private wrapper: HTMLElement
    private channel: Channel
    private history: History = {
        path: {
            table: new Set,
            stack: [],
            idx: 0
        },
        shell: {
            table: new Set,
            stack: [],
            idx: 0
        },
        meta: {
            table: new Set,
            stack: [],
            idx: 0
        }
    }
    // private history_stack: string[] = []
    constructor(channel: Channel) {
        this.channel = channel
        // document.querySelector<HTMLElement>(".widget-wrapper")!
        this.buffer = document.querySelector<HTMLInputElement>(".command-buffer")!
        let reset = (
            history: {
                table: Set<string>,
                stack: string[],
                idx: number
            }) => {        
                history.table.delete(this.buffer.value)
                history.table.add(this.buffer.value)
                history.stack = Array.from(this.history.path.table.keys())
                history.idx = this.history.path.stack.length - 1
        }
        this.buffer.addEventListener("keydown", (key) => {
            let [current_cmd, ...args] = this.buffer.value
            switch (current_cmd as Cmd) {
                case "/":        
                switch (key.key) {
                    case 'ArrowUp':
                        this.history.path.idx -= 1
                        let h = this.history.path.stack[this.history.path.idx]
                        if (h) {
                            this.buffer.value = h
                        }
                        break
                    case 'ArrowDown':
                        this.history.path.idx += 1
                        h = this.history.path.stack[this.history.path.idx]
                        if (h) {
                            this.buffer.value = h
                        }
                        break
                    case 'Enter':
                        reset(this.history.path)
                        this.channel({
                            tag: "INPUT",
                            payload: {
                                tag: "PATH", payload: args.join("").trim()
                            }
                        })
                        break
                }
                    break
                case "$":
                    switch (key.key) {
                        case 'ArrowUp':
                            this.history.shell.idx -= 1
                            let h = this.history.shell.stack[this.history.shell.idx]
                            if (h) {
                                this.buffer.value = h
                            }
                            break
                        case 'ArrowDown':
                            this.history.shell.idx += 1
                            h = this.history.shell.stack[this.history.shell.idx]
                            if (h) {
                                this.buffer.value = h
                            }
                            break
                        case 'Enter':
                            reset(this.history.shell)
                            this.channel({
                                tag: "INPUT",
                                payload: {
                                    tag: "SHELL", payload: args.join("").trim()
                                }
                            })
                            break
                    }
                    break
                case ":":
                    switch (key.key) {
                        case 'ArrowUp':
                            this.history.meta.idx -= 1
                            let h = this.history.meta.stack[this.history.meta.idx]
                            if (h) {
                                this.buffer.value = h
                            }
                            break
                        case 'ArrowDown':
                            this.history.shell.idx += 1
                            h = this.history.meta.stack[this.history.meta.idx]
                            if (h) {
                                this.buffer.value = h
                            }
                            break
                        case 'Enter':
                            reset(this.history.meta)
                            let [command, argv] = args.join("").trim().split(" ")

                            switch (command as Meta["action"]) {
                                case "pe":
                                    this.channel({
                                        tag: "LOCAL",
                                        payload: {
                                            action: "META", for: {
                                                action: "pe"
                                            }
                                        }
                                    })
                                    break
                                case "bc":
                                    this.channel({
                                        tag: "LOCAL",
                                        payload: {
                                            action: "META", for: {
                                                action: "bc"
                                            }
                                        }
                                    })
                                    break
                                case "to":
                                    this.channel({
                                        tag: "LOCAL",
                                        payload: {
                                            action: "META", for: {
                                                action: "to",
                                                arg: parseInt(argv)
                                            }
                                        }
                                    })
                                    break
                                case "jm":
                                    this.channel({
                                        tag: "LOCAL",
                                        payload: {
                                            action: "META", for: {
                                                action: "jm",
                                                arg: parseInt(argv)
                                            }
                                        }
                                    })
                                    break
                                case "wf":
                                    break
                            }
                }
                    break

            }
        })
    }

    public focus() {
        this.buffer.focus()
    }

    getId(): string {
        return "scod.command"
    }

    getDomNode(): HTMLElement {
        return this.buffer
    }

    getPosition(): editor.IOverlayWidgetPosition | null {
        return {
            preference: editor.OverlayWidgetPositionPreference.BOTTOM_RIGHT_CORNER
        }
    }

}

function min(num: number, limit: number): number {
    if (num < limit) {
        return limit
    }
    return num
}


function max(num: number, limit: number): number {
    if (num > limit) {
        return limit
    }
    return num
}