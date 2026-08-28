import uuid
import datetime


class ModelBase:
    def __init__(self):
        self.id = uuid.uuid4().__str__()
        self.creation_date = datetime.datetime.now()
        self.modification_date = datetime.datetime.now()

    def update(self, props: dict):
        try:
            for k, v in props.items():
                if getattr(self, k, None) != v:
                    setattr(self, k, v)
                    self.modification_date = datetime.datetime.now()
        except Exception as e:
            print("Attempting to update data.")
            print(e)

    def to_dict(self):
        return dict(self.__dict__)

#    def update(self, props: dict):
#        self_d = self.__dict__()
#        for k, v in props.items():
#            if self_d[k] != v:
#                self_d[k] = v
#                self.modification_date = datetime.datetime.now()
# self.__dict__() is calling a function, check if new version is better!