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


async def echo(websocket):
    rt = Runtime()

    async for message in websocket:
        data = json.loads(message)
        info(data)
        # res = eval(data['code'], globals(), rt.__dict__)
        f = io.StringIO()
        try:
            code = f"locals()['temp'] = ({data['code']})"
            info(code)
            with redirect_stdout(f):
                exec(code)
            res = locals()['temp']
            info(res)
            out = f.getvalue()
            info(out)
            await websocket.send(
                json.dumps({
                    'result': res,
                    'id': data['id'],
                    'out': out
                }))
        except Exception as e:
            error(e)
            st = traceback.format_exc()
            error(st)
            out = f.getvalue()
            info(out)
            await websocket.send(
                json.dumps({
                    'error': f"{e}\n{st}",
                    'out': out,
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
