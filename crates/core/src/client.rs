use std::{collections::HashMap, env, path::PathBuf};

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub enum Path {
    Global(String),
    Local(String),
}
pub type Key = String;

#[derive(Serialize, Deserialize)]
pub struct Client {
    pub mod_list: PathBuf, // pub
}

impl Client {
    pub fn new() -> Self {
        let mut home = env::home_dir().unwrap();
        home.push(".scod");
        let mut sel = Self {
            mod_list: home.clone(),
        };
        sel.mod_list.push("mod");
        sel
    }
}
