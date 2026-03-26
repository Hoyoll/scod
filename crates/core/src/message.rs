use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize)]
#[serde(tag = "tag", content = "payload", rename_all = "UPPERCASE")]
pub enum Message {
    Window { to: For, win: Win },
    Buffer(Buffer),
    Module(Module),
    // Port(Port),
    Pane(Pane),
    Cursor(Cursor),
}

#[derive(Deserialize, Serialize)]
#[serde(tag = "tag", content = "payload", rename_all = "UPPERCASE")]
pub enum Module {
    Load { key: String },
    Kill { key: String },
    Call { key: String, data: String },
}

#[derive(Deserialize, Serialize)]
#[serde(tag = "tag", content = "payload", rename_all = "UPPERCASE")]
pub enum Port {
    Spin {
        key: String,
    },
    Send {
        key: String,
        data: serde_json::Value,
    },
    Wipe {
        key: String,
    },
}

#[derive(Deserialize, Serialize)]
#[serde(tag = "tag", content = "payload", rename_all = "UPPERCASE")]
pub enum Pane {
    Open {
        key: String,
    },
    Wipe {
        key: String,
    },
    Send {
        key: String,
        data: serde_json::Value,
    },
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum Win {
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
#[serde(tag = "for", content = "payload", rename_all = "UPPERCASE")]
pub enum For {
    Main,
    Member(String),
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
    Focus,
    Close,
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
