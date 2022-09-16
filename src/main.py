import asyncio
import websockets
import json
import traceback
import io
import functools
from contextlib import redirect_stdout
from typing import List, Optional, Union, Any, Dict
from pydantic import BaseModel
from logging import info, error
import coloredlogs


class Runtime:

    def __init__(self):
        self.tmpv = "__temp_rktr__"
        self.shared_globals = dict()
        self.shared_globals[self.tmpv] = None
        self.shared_locals = dict()

    def eval(self, source: str) -> (Any, str, str):
        res = None
        out = ""
        err = ""
        f = io.StringIO()

        try:
            lines = source.splitlines()
            return_line = lines.pop()
            setup_code = "\n".join(lines)
            print(setup_code)
            with redirect_stdout(f):
                exec(setup_code, self.shared_globals, self.shared_locals)

            eval_code = f"global {self.tmpv}\n{self.tmpv} = {return_line}"
            print(eval_code)
            with redirect_stdout(f):
                exec(eval_code, self.shared_globals, self.shared_locals)

            res = self.shared_globals[self.tmpv]
            out = f.getvalue()
        except Exception as e:
            st = traceback.format_exc()
            err = f"{e}\n{st}"
        finally:
            info(res)
            info(out)
            info(err)
            return (res, out, err)


async def echo(websocket):
    rt = Runtime()

    async for message in websocket:
        data = json.loads(message)
        info(data)
        (res, out, err) = rt.eval(data['code'])
        await websocket.send(
            json.dumps({
                'error': err,
                'out': out,
                'result': str(res),
                'id': data['id']
            }))


async def main():
    host = "localhost"
    port = 1337
    print(f"Running on {host}:{port}")
    async with websockets.serve(echo, host, port):
        await asyncio.Future()


if __name__ == '__main__':
    coloredlogs.install(leve='DEBUG')
    asyncio.run(main())
