from pydantic import BaseModel
import uuid

__ui_registry__ = dict()
__current_cell_id__ = ""


def current_cell_id():
    global __current_cell_id__
    return __current_cell_id__


def do_change(id: str, v) -> str:
    global __ui_registry__
    __ui_registry__[id].value = v
    return __ui_registry__[id].cell_id


class Slider(BaseModel):
    kind: str = "slider"
    value: int = 10
    min: int = 0
    max: int = 100
    id: str = ""
    cell_id: str = ""

    def __init__(self, **data):
        super().__init__(**data)
        self.register()

    def register(self):
        self.id = uuid.uuid1().hex
        self.cell_id = current_cell_id()
        global __ui_registry__
        __ui_registry__[self.id] = self
