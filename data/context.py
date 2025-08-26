class Context:
    def __init__(self):
        self.variables = {}
        self.data = {}

    def set(self, key, value):
        self.variables[key] = value

    def get(self, key, default=None):
        return self.variables.get(key, default)