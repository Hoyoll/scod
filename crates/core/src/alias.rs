use serde_json::Error;
use winit::event_loop::EventLoopProxy;

use crate::message::Message;

pub trait Alias {
    fn key(&self) -> String;
    fn call(&self, data: String);
}

pub type Channel = EventLoopProxy<Message>;

pub type Mouth = fn(Channel) -> Box<dyn Alias>;
// pub type LoadAlias = fn()
pub fn send(proxy: &EventLoopProxy<Message>, msg: Message) {
    proxy.send_event(msg);
}

pub fn to_string(msg: &Message) -> Result<String, Error> {
    serde_json::to_string(msg)
}
