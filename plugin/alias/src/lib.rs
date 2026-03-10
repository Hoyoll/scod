use std::env;

use scod_core::{alias::Alias, message::Message};
use winit::event_loop::EventLoopProxy;

struct AliasLoader {
    pub proxy: EventLoopProxy<Message>,
}

impl Alias for AliasLoader {
    fn key(&self) -> String {
        "BUILTIN::ALIAS_LOADER".to_string()
    }

    fn call(&self, data: String) {
        match env::current_exe() {
            Result::Ok(mut path) => {
                for p in data.split("/") {
                    path.push(p);
                }
                if !path.is_file() {
                    return;
                }
                self.proxy.send_event(Message::Alias(path));
            }
            Result::Err(_) => (),
        }
    }
}

#[unsafe(no_mangle)]
pub fn build(proxy: EventLoopProxy<Message>) -> Box<dyn Alias> {
    Box::new(AliasLoader { proxy })
}
