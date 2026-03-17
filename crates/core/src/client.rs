use std::collections::HashMap;

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub enum Path {
    Global(String),
    Local(String),
}
pub type Key = String;

#[derive(Serialize, Deserialize)]
pub struct Client {
    pub alias: HashMap<Key, Path>,
    // pub
}

impl Client {
    pub fn new() -> Self {
        Self {
            alias: HashMap::new(),
        }
    }
}
