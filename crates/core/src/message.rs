use std::path::PathBuf;

use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize)]
#[serde(tag = "tag", content = "payload", rename_all = "UPPERCASE")]
pub enum Message {
    Window(Win),
    Buffer(Buffer),
    Module {
        key: String,
        data: String,
    },
    Port {
        key: String,
        data: serde_json::Value,
    },
    Alias(PathBuf),
    Cursor(Cursor),
    #[serde(skip_serializing, skip_deserializing)]
    /// The String here IS a serialized Message!
    Eval(String),
}

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum Win {
    Ready,
    Close,
    ZoomIn,
    ZoomOut,
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
