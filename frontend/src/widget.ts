// import { html } from "lit-html";

import { editor } from "monaco-editor";
import type { Channel, Meta } from "./message_type";

type Cmd = "/" | "$" | ":"

export class Command {
    private buffer: HTMLInputElement
    // private wrapper: HTMLElement
    private channel: Channel
    constructor(channel: Channel) {
        this.channel = channel
        // document.querySelector<HTMLElement>(".widget-wrapper")!
        this.buffer = document.querySelector<HTMLInputElement>(".command-buffer")!

        this.buffer.addEventListener("keydown", (key) => {
            if (key.key === 'Enter') {
                let [cmd, ...rest] = this.buffer.value
                switch (cmd as Cmd) {
                    case "/":
                        this.channel({
                            tag: "INPUT",
                            payload: {
                                tag: "PATH", payload: rest.join("").trim()
                            }
                        })
                        break
                    case "$":
                        this.channel({
                            tag: "INPUT",
                            payload: {
                                tag: "SHELL", payload: rest.join("").trim()
                            }
                        })
                        break
                    case ":":
                        let [command, args] = rest.join("").trim().split(" ")
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
                                            arg: parseInt(args)
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
                                            arg: parseInt(args)
                                        }
                                    }
                                })
                                break
                            case "wf":
                                break
                        }
                }
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