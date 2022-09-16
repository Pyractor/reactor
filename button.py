class Button:
  def __init__(self, _func=None, label="Button"):
    import functools
    functools.update_wrapper(self, _func)
    self.func = _func
    self.label = label
  def __call__(self, *args, **kwargs):
    return f"<button>{self.label}</button>"

@Button
def click():
  print('clicked')

click()
