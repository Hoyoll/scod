export type Message =
    | { tag: "BUFFER"; payload: Buffer }
    | { tag: "PANE"; payload: Pane }
    | { tag: "EDITOR"; payload: Editor }
    | { tag: "EVENT"; payload: Event }
    | { tag: "JSON"; payload: Message };

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
export type Result<T, E> = { ok: T } | { err: E };

export type Container<A, B> =
    | { tag: "REQUEST"; payload: A }
    | { tag: "RESPONSE"; payload: B };

export type Want =
    | { tag: "CUSTOM"; payload: Container<string, string> }
    | { tag: "PEEK"; payload: Container<BuffPoint, string | null> }
    | { tag: "COPY"; payload: Container<string, string> }
    | { tag: "EDIT"; payload: Container<[string, BuffPoint], Result<void, string>> };

export type Pane =
    | { tag: "OPEN"; payload: { to: string } }
    | { tag: "MISC"; payload: { to: string; action: Action } }
    | { tag: "SEND"; payload: { to: string; response: Want } }

export interface BuffPoint {
    path: string;
    line: Position<number>;
    column: Position<number>;
}

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
}