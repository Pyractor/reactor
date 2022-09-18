from pydantic import BaseModel


class Button:

    def __init__(self, _func=None, label="Button"):
        import functools
        functools.update_wrapper(self, _func)
        self.func = _func
        self.label = label

    def __call__(self, *args, **kwargs):
        return f"<button>{self.label}</button>"


class SliderArgs(BaseModel):
    value: int = 10
    min: int = 0
    max: int = 100


def Slider(*args, **kwargs):
    sa = SliderArgs(*args, **kwargs)
    print(sa)
    # here we need to register something somethere?
    return sa.value
