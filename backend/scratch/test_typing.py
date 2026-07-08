from typing import TYPE_CHECKING

class FakeField:
    pass

class PositiveIntegerField(FakeField):
    pass

class FakeModel:
    pass

class EstimateSnapshot(FakeModel):
    version_number: int = PositiveIntegerField() # type: ignore

    def save(self):
        last = EstimateSnapshot()
        self.version_number = (last.version_number + 1) if last else 1
