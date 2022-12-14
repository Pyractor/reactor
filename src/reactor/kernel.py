# from ipykernel.kernelapp import IPKernelApp
from IPython.utils.io import capture_output
from ipykernel.inprocess.ipkernel import InProcessKernel
from dataclasses import dataclass
from logging import info, error


@dataclass
class Result:
    result: str
    stdout: str
    stderr: str


class ReactorKernel:

    def __init__(self):
        info("Initializing kernel")
        self.kernel = InProcessKernel()

    async def do_execute(self, code: str, cell_id: str):
        info(f"===>\n{code}")
        with capture_output() as io:
            result = await self.kernel.shell.run_cell_async(code, silent=False)
        return Result(result=result, stdout=io.stdout, stderr=io.stderr)
