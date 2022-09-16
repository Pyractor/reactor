import asyncio
import websockets
import json
import traceback
import io
from contextlib import redirect_stdout
from typing import List, Optional, Union, Any, Dict
from pydantic import BaseModel
from logging import info, error
import coloredlogs


class Runtime:

    def __init__(self):
        self.sample = 'sample value'

    def eval(self, source: str) -> (Any, str, str):
        res = None
        out = ""
        err = ""
        f = io.StringIO()

        try:
            code = """locals()['temp'] = ({0})
            """.format(source)

            info(code)
            with redirect_stdout(f):
                exec(code)
            res = locals()['temp']
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
                'result': res,
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
