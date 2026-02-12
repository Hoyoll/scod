// import { html } from "lit-html";

import { editor } from "monaco-editor";
import type { Channel, Meta } from "./message_type";

type Cmd = "/" | "$" | ":"

export class Command {
    private buffer: HTMLInputElement
    private wrapper: HTMLElement
    private channel: Channel
    constructor(channel: Channel) {
        this.channel = channel
        this.wrapper = document.querySelector<HTMLElement>(".widget-wrapper")!
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
                        this.channel({
                            tag: "LOCAL",
                            payload: {
                                action: "META", for: rest.join("").trim() as Meta
                            }
                        })
                        // console.log("TO-DO!")
                        break
                }
            }
        })
    }

    public focus() {
        // if (!this.buffer.classList.contains("visible")) {
        //     this.buffer.classList.add("visible")
        // }
        this.buffer.focus()
    }

    // public close() {
    //     this.wrapper.classList.remove("visible")
    //     this.channel({
    //         tag: "LOCAL", payload: {
    //             action: "FOCUS", for: "EDITOR"
    //         }
    //     })
    // }

    getId(): string {
        return "scod.command"
    }

    getDomNode(): HTMLElement {
        return this.buffer
    }

    getPosition(): editor.IOverlayWidgetPosition | null {

        // return null
        return {
            preference: editor.OverlayWidgetPositionPreference.BOTTOM_RIGHT_CORNER
        }
    }

}