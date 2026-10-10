from collections.abc import Iterator
import pytest
from fake_url_policy import FakeUrlPolicy
from local_site import LocalSite


@pytest.fixture
def site() -> Iterator[LocalSite]:
    local = LocalSite()
    local.start()
    yield local
    local.stop()


@pytest.fixture
def policy() -> FakeUrlPolicy:
    return FakeUrlPolicy()
