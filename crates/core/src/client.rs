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
    pub port_list: PathBuf,
    pub lane_list: PathBuf,
}

impl Client {
    pub fn new() -> Self {
        let mut home = env::home_dir().unwrap();
        home.push(".scod");
        // let ho = home.clone();
        let mut sel = Self {
            mod_list: home.clone(),
            port_list: home.clone(),
            lane_list: home.clone(),
        };
        sel.mod_list.push("mod");
        sel.port_list.push("port");
        sel.lane_list.push("lane");
        sel
    }
}
