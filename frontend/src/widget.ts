import { editor } from "monaco-editor";
import type { Channel } from "./message_type";
import { Meta } from "./meta";

type Cmd = "/" | "$" | ":"
type HistoryBuff = {
    table: Set<string>,
    stack: string[],
    idx: number
}

export type Alias = {
    [key: string]: string
}

type History = {
    path: HistoryBuff,
    shell: HistoryBuff,
    meta: HistoryBuff
}

export class Command {
    private buffer: HTMLInputElement
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
        this.buffer = document.querySelector<HTMLInputElement>(".command-buffer")!
        this.buffer.addEventListener("keydown", (key) => {
            let [current_cmd, _] = this.buffer.value
            switch (current_cmd as Cmd) {
                case "/":
                    switch (key.key) {
                        case 'ArrowUp':
                            this.history.path.idx = min(this.history.path.idx - 1, 0)
                            let h = this.history.path.stack[this.history.path.idx]
                            if (h) {
                                this.buffer.value = h
                            }
                            break
                        case 'ArrowDown':
                            this.history.path.idx = max(this.history.path.idx + 1, this.history.path.stack.length - 1)
                            let his = this.history.path.stack[this.history.path.idx]
                            if (his) {
                                this.buffer.value = his
                            }
                            break
                        case 'Enter':
                            this.reset(this.history.path)
                            this.receive(this.buffer.value)
                    }
                    break
                case "$":
                    switch (key.key) {
                        case 'ArrowUp':
                            this.history.shell.idx = min(this.history.shell.idx - 1, 0)
                            let h = this.history.shell.stack[this.history.shell.idx]
                            if (h) {
                                this.buffer.value = h
                            }
                            break
                        case 'ArrowDown':
                            this.history.shell.idx = max(this.history.shell.idx + 1, this.history.shell.stack.length - 1)
                            let his = this.history.shell.stack[this.history.shell.idx]
                            if (his) {
                                this.buffer.value = his
                            }
                            break
                        case 'Enter':
                            this.reset(this.history.shell)
                            this.receive(this.buffer.value)
                            break
                    }
                    break
                case ":":
                    switch (key.key) {
                        case 'ArrowUp':
                            this.history.meta.idx = min(this.history.meta.idx - 1, 0)

                            let h = this.history.meta.stack[this.history.meta.idx]
                            if (h) {
                                this.buffer.value = h
                            }
                            break
                        case 'ArrowDown':
                            this.history.meta.idx = max(this.history.meta.idx + 1, this.history.meta.stack.length - 1)
                            let his = this.history.meta.stack[this.history.meta.idx]
                            if (his) {
                                this.buffer.value = his
                            }
                            break
                        case 'Enter':
                            this.reset(this.history.meta)
                            this.receive(this.buffer.value)
                    }
                    break

            }
        })
    }

    public receive(command: string) {
        let [current_cmd, ...args] = command

        switch (current_cmd as Cmd) {
            case "/":
                this.channel({
                    tag: "INPUT",
                    payload: {
                        tag: "PATH", payload: args.join("").trim()
                    }
                })

                break
            case "$":
                this.channel({
                    tag: "INPUT",
                    payload: {
                        tag: "SHELL", payload: args.join("").trim()
                    }
                })
                break
            case ":":
                let [command, ...argv] = args.join("").trim().split(" ")
                // let mcommand = command as MCommand;
                this.channel({
                    tag: "LOCAL",
                    payload: {
                        action: "META",
                        for: Meta[command].proc(argv.join(" "))
                    }
                })
                break
        }

    }

    private reset(history: HistoryBuff) {
        // let reset = (
        // history: {
        //     table: Set<string>,
        //     stack: string[],
        //     idx: number
        // }) => {
        history.table.delete(this.buffer.value)
        history.table.add(this.buffer.value)
        history.stack = Array.from(history.table.keys())
        history.idx = history.stack.length - 1
        // }
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