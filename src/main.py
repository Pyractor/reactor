import asyncio
import websockets
import json
import traceback
import io
import coloredlogs
from contextlib import redirect_stdout
from typing import List, Optional, Union, Any, Dict
from pydantic import BaseModel
from logging import info, error
from reactor.kernel import ReactorKernel
from reactor.display import EvalResponse, InputChangeResponse, display
import reactor.ui


class Runtime:

    def __init__(self):
        self.tmpv = "__current_cell_id__"
        self.var_owners = dict()
        self.kernel = ReactorKernel()

    def name_exists(self, name: str) -> bool:
        try:
            eval(name)
        except:
            return True
        return False

    def register_code(self, id: str, code: str):
        self.register_vars(id, compile(code, 'code', 'exec').co_names)

    def dependency_cells(self, code: str) -> List[str]:
        vars = compile(code, 'code', 'exec').co_names
        return [self.var_owners[var] for var in vars if var in self.var_owners]

    def register_vars(self, id: str, vars: List[str]):
        for var in vars:
            if self.name_exists(
                    var) and var not in self.var_owners and var != self.tmpv:
                info(f"Registering {id} as owner of {var}")
                self.var_owners[var] = id

    async def input_change(self, id: str, value) -> str:
        setup_code = f"""
    reactor.ui.do_change("{id}", {value})
            """
        result = await self.kernel.do_execute(setup_code, id)
        if result.result.error_in_exec:
            error(result.result.error_in_exec)
            error(result)
        return result.result.result

    async def eval(self, id: str, source: str) -> (Any, str, str):
        res = None
        out = ""
        err = ""
        dependencies = []

        try:
            setup_code = f"""
    import reactor.ui
    global __current_cell_id__
    __current_cell_id__ = "{id}"
    reactor.ui.__current_cell_id__ = "{id}"
            """
            result = await self.kernel.do_execute(setup_code, id)
            if result.result.error_in_exec:
                error(result.result.error_in_exec)
            result = await self.kernel.do_execute(source, id)
            res = result.result.result
            out = result.stdout
            if result.result.error_before_exec:
                err += str(result.result.error_before_exec)
            if result.result.error_in_exec:
                err += str(result.result.error_in_exec)
            err = f"{err}{result.stderr}"

            self.register_code(id, source)
            dependencies = self.dependency_cells(source)
            info(f"{id} depends on {dependencies}")
        except Exception as e:
            st = traceback.format_exc()
            err = f"{e}\n{st}"
        finally:
            return (res, out, err, dependencies)


async def echo(websocket):
    info("Got client connection")
    rt = Runtime()

    async for message in websocket:
        data = json.loads(message)
        info(data)

        if data['kind'] == "eval":
            info("Handling eval")
            (res, out, err,
             dependencies) = await rt.eval(data['id'], data['code'])
            response = EvalResponse(error=err,
                                    out=out,
                                    result=display(res),
                                    dependencies=list(set(dependencies)),
                                    id=data['id']).json()
            await websocket.send(response)

        if data['kind'] == "input_change":
            info("Handling input change")
            cell_id = await rt.input_change(data['id'], data['value'])
            response = InputChangeResponse(id=data['id'],
                                           cell_id=cell_id).json()
            await websocket.send(response)


async def main():
    host = "localhost"
    port = 1337
    info(f"Running on {host}:{port}")
    async with websockets.serve(echo, host, port):
        await asyncio.Future()


if __name__ == '__main__':
    coloredlogs.install(leve='DEBUG')
    asyncio.run(main())
