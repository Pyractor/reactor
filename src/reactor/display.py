import io
import base64
import IPython
import matplotlib.axes
import matplotlib.pyplot
from pydantic.typing import NoneType
from pydantic import BaseModel
from typing import Union, List


class HTML(BaseModel):
    kind: str = "HTML"
    value: str


class Plot(BaseModel):
    kind: str = "plot"
    value: str


class Response(BaseModel):
    error: str
    out: str
    result: Union[str, dict, list, int, float, HTML, Plot, None]
    dependencies: List[str]
    id: str


def display(v):
    tv = type(v)

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
