from typing import Sized, TypeVar

SizedT = TypeVar("SizedT", bound=Sized)


class MaxLength:
    """A length limit for one field of an AI schema. Pydantic applies it to the answer of the model.

    The limit adds no keyword to the JSON schema. The strict output mode of the model can reject `maxLength`.
    """

    def __init__(self, limit: int):
        self.limit = limit

    def __call__(self, value: SizedT) -> SizedT:
        if len(value) > self.limit:
            raise ValueError(f"The value is longer than {self.limit}.")
        return value
