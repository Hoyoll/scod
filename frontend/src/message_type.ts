export type Message =
    | { tag: "BUFFER"; payload: Buffer }
    | { tag: "PANE"; payload: Pane }
    | { tag: "EDITOR"; payload: Editor }
    | { tag: "EVENT"; payload: Event }
    | { tag: "JSON"; payload: string };

export type Event =
    | { tag: "BUFFERCREATED"; payload: string }
    | { tag: "BUFFERSAVED"; payload: string }
    | { tag: "BUFFERCLOSED"; payload: string }
    | { tag: "EDITORREADY" }
    | { tag: "EDITORCLOSE" }
    | { tag: "CUSTOM"; payload: string };

export type Editor =
    | "FOCUS"
    | "MAXIMIZE"
    | "FULLSCREEN"

export type Pane =
    | { tag: "OPEN"; payload: { to: string } }
    | { tag: "MISC"; payload: { to: string; action: Action } }
    | { tag: "SEND"; payload: { to: string; response: Want } }
    | { tag: "WANT"; payload: { from: string; request: Want } };

export type Want =
    | { tag: "CUSTOM"; payload: string }
    | { tag: "BUFFER"; payload: WBuffer };

export type WBuffer =
    | {
        tag: "PEEK";
        text?: string | null;
        path: string;
        line: Position<number>;
        column: Position<number>;
    }
    | { tag: "COPY"; path: string; buffer?: string | null }
    | {
        tag: "EDIT";
        text: string;
        path: string;
        line: Position<number>;
        column: Position<number>;
    };

export type Action =
    | { tag: "FOCUS" }
    | { tag: "HIDE" }
    | { tag: "CLOSE" }
    | { tag: "ZOOMIN" }
    | { tag: "ZOOMOUT" }
    | { tag: "MAXIMIZE" }
    | { tag: "RESIZE"; payload: { width: number; height: number } }
    | { tag: "REPOSITION"; payload: { x: number; y: number } };

export type Buffer =
    | { tag: "DIG"; payload: { path: string; buffer: Payload } }
    | { tag: "ERROR"; payload: { path: string; error: string } };

export type Payload =
    | { tag: "EMPTY" }
    | { tag: "FILE"; payload: string }
    | { tag: "APPEND"; payload: string };

export interface Position<T> {
    start: T;
    end: T;
}/// Freeze! this shit is freezed. And will not be updated more than this!
/// Freeze my ass...
import type { editor } from "monaco-editor";

export type Channel = (message: Message) => void

export type MAction = () => void

export type MTable = {
    [key: string]: {
        desc: string,
        proc: ((args: string) => MAction)
    }
}

export interface Alias {
    key(): string
    call(data: any): void
    onload(editor: editor.IStandaloneCodeEditor): void
}


export function send(message: Message) {
    window.ipc.postMessage(JSON.stringify(message))
}