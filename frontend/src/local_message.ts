type Local = 
	| LBuffer

type LBuffer = 
	| {
		tag: "JUMP", data: number
	},
	| {
		tag: "TO", data: number
	},
	| {
		tag: "CLOSE"	
	}
