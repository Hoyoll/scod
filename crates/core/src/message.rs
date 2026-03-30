use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize)]
#[serde(tag = "tag", content = "payload", rename_all = "UPPERCASE")]
pub enum Message {
    Buffer(Buffer),
    Module(Module),
    Pane(Pane),
    Cursor(Cursor),
}

#[derive(Deserialize, Serialize)]
#[serde(tag = "tag", content = "payload", rename_all = "UPPERCASE")]
pub enum Module {
    Open { to: String },
    Wipe { to: String },
    Send(Payload),
}

#[derive(Deserialize, Serialize)]
pub struct Payload {
    pub to: String,
    pub from: String,
    pub data: serde_json::Value,
}

#[derive(Deserialize, Serialize)]
#[serde(tag = "tag", content = "payload", rename_all = "UPPERCASE")]
pub enum Pane {
    Open { to: String },
    Send(Payload),
    Misc { to: String, action: Action },
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum Action {
    Focus,
    Hide,
    Close,
    ZoomIn,
    ZoomOut,
    Maximize,
    Resize { width: f64, height: f64 },
    Reposition { x: f64, y: f64 },
}

#[derive(Deserialize, Serialize)]
#[serde(tag = "tag", content = "payload", rename_all = "UPPERCASE")]
pub enum Cursor {
    Move { line: i32, column: i32 },
    Jump { line: i32, column: i32 },
    Insert(String),
}

#[derive(Deserialize, Serialize)]
#[serde(tag = "tag", content = "payload", rename_all = "UPPERCASE")]
pub enum Buffer {
    New {
        buffer: String,
        /// The PATH LOOKS like THIS: "path/to/file.txt"!
        path: String,
        ext: String,
    },
    /// To keep it simple, number == 0 WILL automatically resolve into the back of column/line
    Edit {
        text: String,
        path: String,
        line: Position<i32>,
        column: Position<i32>,
    },
    Write {
        buffer: String,
        path: String,
    },
    Open(String),
    Status(Result<String, String>),
    Close,
    Focus,
    Save(Save),
}

#[derive(Deserialize, Serialize)]
#[serde(tag = "for", content = "path", rename_all = "UPPERCASE")]
pub enum Save {
    Current,
    Path(String),
}

#[derive(Deserialize, Serialize)]
pub struct Position<T> {
    pub start: T,
    pub end: T,
}
