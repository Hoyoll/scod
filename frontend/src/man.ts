export const MANUAL =
    `
    [SCOD]

    [How to use]

    [Ctrl + .] => {
        Is focusing the command input
        All command start with prefix such as => {
        [$] => {
            Is to interact with your command line
                [Example] => {
                    $ echo hello world
                }
            The output will get printed to buffer shell.md
        }
                
        [:] => {
            It's for interacting with the Editor itself
            [Example] => {
                Move your cursor (t)o specific line
                :to {number}
        
                Move your cursor by jumping relative from your line
                :jm {number}

                (p)ushing (e)dit to the file system
                :pe

                (b)uffer (c)losing
                :bc
            }
        }
        [/] => {
            Basically creating and/or opening a buffer
            [Example] => {
                /path/to/file.txt
                /file.ts
            }      
        }
        }
    }
    
    [Ctrl + e] => {
        Focusing to the editor
    }
    `