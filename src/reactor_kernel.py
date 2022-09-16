from ipykernel.kernelapp import IPKernelApp


class ReactorKernel:

    # GUI possible values
    # ['auto', 'agg', 'gtk', 'gtk3', 'gtk4', 'inline', 'ipympl', 'nbagg', 'notebook', 'osx', 'pdf', 'ps', 'qt', 'qt4', 'qt5', 'qt6', 'svg', 'tk', 'widget', 'wx']
    def __init__(self, gui: str):
        self.kernel = IPKernelApp.instance()
        self.kernel.initialize([
            "python",
            "--matplotlib=%s" % gui,
            #'--log-level=10'  # noqa
        ])

    def do_execute(self, code: str):
        return self.kernel.do_execute(code, silent=False, allow_stdin=False)
