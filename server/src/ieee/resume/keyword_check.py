from ieee.api_model import ApiModel


class KeywordCheck(ApiModel):
    """The job keywords in three groups. Each keyword is in exactly one group."""
    in_resume: list[str]
    in_excluded_items: list[str]
    not_in_portfolio: list[str]

    def unsupported(self) -> list[str]:
        """The keywords that no included item supports. The resume must not contain them."""
        return [*self.in_excluded_items, *self.not_in_portfolio]
