import io
import base64
import IPython
import matplotlib.axes
import matplotlib.pyplot
from pydantic.typing import NoneType
from typing import Union, List
from pydantic import BaseModel
from reactor.ui import Slider


class HTML(BaseModel):
    kind: str = "HTML"
    value: str


class Input(BaseModel):
    kind: str = "input"
    el: Union[Slider]


class Plot(BaseModel):
    kind: str = "plot"
    value: str


class EvalResponse(BaseModel):
    kind: str = "eval"
    error: str
    out: str
    result: Union[str, dict, list, int, float, HTML, Plot, None]
    dependencies: List[str]
    id: str


class InputChangeResponse(BaseModel):
    kind: str = "input_change"
    id: str
    cell_id: str


def display(v):
    tv = type(v)

    if tv is Slider:
        return Input(el=v)

    if tv is IPython.display.HTML:
        return HTML(value=v.data)

    if issubclass(tv, matplotlib.axes.SubplotBase):
        format = 'png'
        buff = io.BytesIO()
        fig = v.get_figure()
        fig.savefig(buff, format=format)
        buff.seek(0)
        data = base64.b64encode(buff.read()).decode()
        matplotlib.pyplot.close()
        return Plot(value=f"data:image/{format};base64, {data}")

    if (tv is dict or tv is list or tv is int or tv is float or tv is str
            or tv is NoneType):
        return v

    return str(v)
